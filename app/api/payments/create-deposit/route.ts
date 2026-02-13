import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Station from "@/lib/models/Station";
import User from "@/lib/models/User";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { stationId, portId, startTime, estimatedDuration } = body;

    if (!stationId || !portId || !startTime || !estimatedDuration) {
      return NextResponse.json(
        { error: "stationId, portId, startTime, and estimatedDuration are required" },
        { status: 400 }
      );
    }

    const station = await Station.findById(stationId);
    if (!station) {
      return NextResponse.json(
        { error: "Station not found" },
        { status: 404 }
      );
    }

    const port = station.chargingPorts.find(
      (p) => p._id?.toString() === portId
    );
    if (!port) {
      return NextResponse.json({ error: "Port not found" }, { status: 404 });
    }

    const depositAmountNPR = station.pricing.depositAmount;
    const depositAmountPaisa = Math.round(depositAmountNPR * 100);

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: depositAmountPaisa,
      currency: "npr",
      metadata: {
        userId,
        userEmail: user.email,
        userName: user.name,
        stationId,
        stationName: station.name,
        portId,
        portNumber: port.portNumber,
        startTime,
        estimatedDuration: String(estimatedDuration),
      },
    });

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: depositAmountNPR,
        currency: "NPR",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
