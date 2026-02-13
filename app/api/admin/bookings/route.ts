import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Booking from "@/lib/models/Booking";
import Station from "@/lib/models/Station";
import User from "@/lib/models/User";

async function verifyAdmin(userId: string) {
  await dbConnect();
  const user = await User.findOne({ clerkId: userId });
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyAdmin(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    // Station admins only see bookings for their own stations
    if (user.role === "admin") {
      const adminStations = await Station.find({ adminId: userId }).select("_id").lean();
      const stationIds = adminStations.map((s) => s._id);
      filter.stationId = { $in: stationIds };
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    // Enrich bookings with station data
    const stationIds = [
      ...new Set(
        bookings
          .map((b) => String(b.stationId))
          .filter((id) => !id.startsWith("station-"))
      ),
    ];

    const stations = stationIds.length > 0
      ? await Station.find({ _id: { $in: stationIds } })
          .select("name location")
          .lean()
      : [];

    const stationMap = new Map(
      stations.map((s) => [String(s._id), s])
    );

    const enrichedBookings = bookings.map((booking) => {
      const sid = String(booking.stationId);
      if (!sid.startsWith("station-") && stationMap.has(sid)) {
        return { ...booking, station: stationMap.get(sid) };
      }
      return { ...booking, station: { name: sid, location: { city: "N/A" } } };
    });

    return NextResponse.json(
      {
        bookings: enrichedBookings,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching admin bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
