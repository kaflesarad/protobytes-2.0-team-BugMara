import { NextResponse } from "next/server";
import { headers } from "next/headers";
import dbConnect from "@/lib/db";
import Booking from "@/lib/models/Booking";
import Station from "@/lib/models/Station";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook signature verification failed:", message);
      return NextResponse.json(
        { error: `Webhook Error: ${message}` },
        { status: 400 }
      );
    }

    await dbConnect();

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { stationId, portId, userId, startTime, estimatedDuration, userName, userEmail } =
          paymentIntent.metadata;

        const existingBooking = await Booking.findOne({
          "deposit.stripePaymentIntentId": paymentIntent.id,
        });

        if (existingBooking) {
          existingBooking.status = "confirmed";
          await existingBooking.save();
        } else {
          const start = new Date(startTime);
          const durationMinutes = parseFloat(estimatedDuration);
          const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

          const booking = await Booking.create({
            userId,
            userName: userName || "",
            userEmail: userEmail || "",
            stationId,
            portId,
            startTime: start,
            estimatedDuration: durationMinutes,
            endTime: end,
            status: "confirmed",
            deposit: {
              amount: paymentIntent.amount / 100,
              stripePaymentIntentId: paymentIntent.id,
              refunded: false,
            },
          });

          await Station.updateOne(
            { _id: stationId, "chargingPorts._id": portId },
            {
              $set: {
                "chargingPorts.$.status": "reserved",
                "chargingPorts.$.currentBookingId": booking._id,
              },
            }
          );
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const booking = await Booking.findOne({
          "deposit.stripePaymentIntentId": paymentIntent.id,
        });

        if (booking) {
          booking.status = "cancelled";
          await booking.save();

          await Station.updateOne(
            { _id: booking.stationId, "chargingPorts._id": booking.portId },
            {
              $set: {
                "chargingPorts.$.status": "available",
                "chargingPorts.$.currentBookingId": undefined,
              },
            }
          );
        }

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          await Booking.updateOne(
            { "deposit.stripePaymentIntentId": paymentIntentId },
            { $set: { "deposit.refunded": true } }
          );
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
