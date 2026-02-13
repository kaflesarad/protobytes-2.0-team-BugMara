import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import Station from "@/lib/models/Station";
import mongoose from "mongoose";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ clerkId: userId })
      .populate("favoriteStations")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { stations: user.favoriteStations || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { stationId } = body;

    if (!stationId) {
      return NextResponse.json(
        { error: "stationId is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stationObjectId = new mongoose.Types.ObjectId(stationId);
    const isFavorited = user.favoriteStations.some(
      (fav) => fav.toString() === stationId
    );

    if (isFavorited) {
      user.favoriteStations = user.favoriteStations.filter(
        (fav) => fav.toString() !== stationId
      );
    } else {
      user.favoriteStations.push(stationObjectId);
    }

    await user.save();

    return NextResponse.json(
      {
        favoriteStations: user.favoriteStations,
        isFavorited: !isFavorited,
        message: isFavorited
          ? "Station removed from favorites"
          : "Station added to favorites",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json(
      { error: "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}
