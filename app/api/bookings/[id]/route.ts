import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { loadStationFromFile } from "@/lib/stations";
import Booking from "@/lib/models/Booking";
import Station from "@/lib/models/Station";
import User from "@/lib/models/User";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const booking = await Booking.findById(id).lean();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.userId !== userId) {
      const user = await User.findOne({ clerkId: userId });
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Enrich with station data
    const sid = String(booking.stationId);
    if (sid.startsWith("station-")) {
      const stationData = loadStationFromFile(sid);
      return NextResponse.json(
        { booking: { ...booking, stationId: stationData || sid } },
        { status: 200 }
      );
    }

    // For DB-based stations, populate
    const populated = await Booking.findById(id)
      .populate("stationId", "name location chargingPorts pricing photos")
      .lean();

    return NextResponse.json({ booking: populated }, { status: 200 });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.userId !== userId) {
      const user = await User.findOne({ clerkId: userId });
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["active", "cancelled", "no-show"],
      active: ["completed"],
      completed: [],
      cancelled: [],
      "no-show": [],
    };

    if (
      status &&
      !validTransitions[booking.status]?.includes(status)
    ) {
      return NextResponse.json(
        {
          error: `Cannot transition from "${booking.status}" to "${status}"`,
        },
        { status: 400 }
      );
    }

    if (status) {
      booking.status = status;
    }

    // Only update port status for DB-based stations
    const sid = String(booking.stationId);
    if ((status === "completed" || status === "cancelled") && !sid.startsWith("station-")) {
      await Station.updateOne(
        { _id: booking.stationId, "chargingPorts._id": booking.portId },
        {
          $set: { "chargingPorts.$.status": "available" },
          $unset: { "chargingPorts.$.currentBookingId": "" },
        }
      );
    }

    await booking.save();

    // Enrich with station data
    if (sid.startsWith("station-")) {
      const updatedBooking = await Booking.findById(id).lean();
      const stationData = loadStationFromFile(sid);
      return NextResponse.json(
        { booking: { ...updatedBooking, stationId: stationData || sid } },
        { status: 200 }
      );
    }

    const populated = await Booking.findById(id)
      .populate("stationId", "name location chargingPorts pricing photos")
      .lean();

    return NextResponse.json({ booking: populated }, { status: 200 });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.userId !== userId) {
      const user = await User.findOne({ clerkId: userId });
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["active", "cancelled", "no-show"],
      active: ["completed"],
      completed: [],
      cancelled: [],
      "no-show": [],
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from "${booking.status}" to "${status}"` },
        { status: 400 }
      );
    }

    booking.status = status;

    const sid = String(booking.stationId);
    if ((status === "completed" || status === "cancelled") && !sid.startsWith("station-")) {
      await Station.updateOne(
        { _id: booking.stationId, "chargingPorts._id": booking.portId },
        {
          $set: { "chargingPorts.$.status": "available" },
          $unset: { "chargingPorts.$.currentBookingId": "" },
        }
      );
    }

    await booking.save();

    if (sid.startsWith("station-")) {
      const stationData = loadStationFromFile(sid);
      const updated = await Booking.findById(id).lean();
      return NextResponse.json({ booking: { ...updated, stationId: stationData || sid } }, { status: 200 });
    }

    const populated = await Booking.findById(id)
      .populate("stationId", "name location chargingPorts pricing photos")
      .lean();

    return NextResponse.json({ booking: populated }, { status: 200 });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.userId !== userId) {
      const user = await User.findOne({ clerkId: userId });
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (booking.status === "active") {
      return NextResponse.json(
        { error: "Cannot cancel an active booking" },
        { status: 400 }
      );
    }

    booking.status = "cancelled";
    await booking.save();

    // Only update port status for DB-based stations
    const sid = String(booking.stationId);
    if (!sid.startsWith("station-")) {
      await Station.updateOne(
        { _id: booking.stationId, "chargingPorts._id": booking.portId },
        {
          $set: { "chargingPorts.$.status": "available" },
          $unset: { "chargingPorts.$.currentBookingId": "" },
        }
      );
    }

    return NextResponse.json(
      { message: "Booking cancelled successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
