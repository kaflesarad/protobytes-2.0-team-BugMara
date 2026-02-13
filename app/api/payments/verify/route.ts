import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Booking from "@/lib/models/Booking";
import Station from "@/lib/models/Station";
import { khaltiLookup } from "@/lib/khalti";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { pidx, bookingId } = body;

    if (!pidx || !bookingId) {
      return NextResponse.json(
        { error: "pidx and bookingId are required" },
        { status: 400 }
      );
    }

    if (!process.env.KHALTI_SECRET_KEY) {
      return NextResponse.json(
        { error: "Payment gateway is not configured." },
        { status: 503 }
      );
    }

    // Lookup payment status from Khalti
    const lookup = await khaltiLookup(pidx);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Ensure the booking belongs to this user
    if (booking.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify pidx matches the booking's stored pidx
    if (booking.deposit.khaltiPidx && booking.deposit.khaltiPidx !== pidx) {
      return NextResponse.json(
        { error: "Payment reference does not match this booking" },
        { status: 400 }
      );
    }

    // Skip if booking is already confirmed/active/completed
    if (["confirmed", "active", "completed"].includes(booking.status)) {
      return NextResponse.json(
        { verified: true, status: "Completed", booking },
        { status: 200 }
      );
    }

    if (lookup.status === "Completed") {
      // Verify payment amount matches deposit
      const expectedAmountPaisa = Math.round(booking.deposit.amount * 100);
      if (lookup.total_amount !== expectedAmountPaisa) {
        console.error(
          `Payment amount mismatch: expected ${expectedAmountPaisa}, got ${lookup.total_amount}`
        );
        return NextResponse.json(
          { error: "Payment amount does not match booking deposit" },
          { status: 400 }
        );
      }

      // Payment successful — confirm the booking
      booking.status = "confirmed";
      booking.deposit.khaltiPidx = pidx;
      booking.deposit.khaltiTransactionId = lookup.transaction_id || undefined;
      booking.deposit.refunded = false;
      await booking.save();

      // Reserve the port
      await Station.updateOne(
        { _id: booking.stationId, "chargingPorts._id": booking.portId },
        {
          $set: {
            "chargingPorts.$.status": "reserved",
            "chargingPorts.$.currentBookingId": booking._id,
          },
        }
      );

      return NextResponse.json(
        { verified: true, status: "Completed", booking },
        { status: 200 }
      );
    }

    if (
      lookup.status === "User canceled" ||
      lookup.status === "Expired"
    ) {
      // Payment failed — cancel the booking
      booking.status = "cancelled";
      await booking.save();

      return NextResponse.json(
        { verified: false, status: lookup.status },
        { status: 200 }
      );
    }

    if (lookup.status === "Refunded" || lookup.status === "Partially refunded") {
      booking.deposit.refunded = true;
      await booking.save();

      return NextResponse.json(
        { verified: false, status: lookup.status },
        { status: 200 }
      );
    }

    // Pending / Initiated — still processing
    return NextResponse.json(
      { verified: false, status: lookup.status },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying Khalti payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
