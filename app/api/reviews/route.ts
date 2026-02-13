import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Review from "@/lib/models/Review";
import Station from "@/lib/models/Station";
import Booking from "@/lib/models/Booking";
import User from "@/lib/models/User";

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get("stationId");

    if (!stationId) {
      return NextResponse.json(
        { error: "stationId query parameter is required" },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ stationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ stationId }),
    ]);

    return NextResponse.json(
      {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
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

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { stationId, bookingId, rating, comment } = body;

    if (!stationId || !rating) {
      return NextResponse.json(
        { error: "stationId and rating are required" },
        { status: 400 }
      );
    }

    const numericRating = Math.round(Number(rating));
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    // Enforce comment length
    const trimmedComment = (comment || "").trim().slice(0, 500);

    const station = await Station.findById(stationId);
    if (!station) {
      return NextResponse.json(
        { error: "Station not found" },
        { status: 404 }
      );
    }

    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      if (booking.userId !== userId) {
        return NextResponse.json(
          { error: "You can only review your own bookings" },
          { status: 403 }
        );
      }

      if (booking.status !== "completed") {
        return NextResponse.json(
          { error: "You can only review completed bookings" },
          { status: 400 }
        );
      }

      const existingReview = await Review.findOne({ bookingId });
      if (existingReview) {
        return NextResponse.json(
          { error: "A review already exists for this booking" },
          { status: 409 }
        );
      }
    }

    const review = await Review.create({
      userId,
      userName: user.name,
      stationId,
      bookingId: bookingId || undefined,
      rating: numericRating,
      comment: trimmedComment,
    });

    // Use aggregation pipeline for efficient average calculation
    const [stats] = await Review.aggregate([
      { $match: { stationId: station._id } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    await Station.findByIdAndUpdate(stationId, {
      rating: stats ? Math.round(stats.avg * 10) / 10 : numericRating,
      totalReviews: stats?.count ?? 1,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
