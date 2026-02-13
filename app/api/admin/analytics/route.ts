import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Booking from "@/lib/models/Booking";
import Station from "@/lib/models/Station";
import User from "@/lib/models/User";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ clerkId: userId });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30";
    const daysAgo = parseInt(period, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Station admins: scope to their own stations only
    let stationFilter: Record<string, unknown> = {};
    let bookingStationMatch: Record<string, unknown> = {};
    if (user.role === "admin") {
      const adminStations = await Station.find({ adminId: userId }).select("_id").lean();
      const stationIds = adminStations.map((s) => s._id);
      stationFilter = { _id: { $in: stationIds } };
      bookingStationMatch = { stationId: { $in: stationIds } };
    }

    const [
      totalRevenue,
      bookingsByStatus,
      recentBookings,
      topStations,
      totalStations,
      totalUsers,
      dailyBookings,
    ] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: { $in: ["confirmed", "active", "completed"] },
            ...bookingStationMatch,
          },
        },
        {
          $group: {
            _id: null,
            totalDeposits: { $sum: "$deposit.amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      Booking.aggregate([
        { $match: { createdAt: { $gte: startDate }, ...bookingStationMatch } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      Booking.countDocuments({ createdAt: { $gte: startDate }, ...bookingStationMatch }),

      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: { $in: ["confirmed", "active", "completed"] },
            ...bookingStationMatch,
          },
        },
        {
          $group: {
            _id: "$stationId",
            bookingCount: { $sum: 1 },
            revenue: { $sum: "$deposit.amount" },
          },
        },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "stations",
            localField: "_id",
            foreignField: "_id",
            as: "station",
          },
        },
        { $unwind: "$station" },
        {
          $project: {
            _id: 1,
            bookingCount: 1,
            revenue: 1,
            stationName: "$station.name",
            city: "$station.location.city",
          },
        },
      ]),

      Station.countDocuments({ isActive: true, ...stationFilter }),

      user.role === "superadmin" ? User.countDocuments() : Promise.resolve(0),

      Booking.aggregate([
        { $match: { createdAt: { $gte: startDate }, ...bookingStationMatch } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
            revenue: { $sum: "$deposit.amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const statusCounts: Record<string, number> = {};
    bookingsByStatus.forEach((item: { _id: string; count: number }) => {
      statusCounts[item._id] = item.count;
    });

    const totalPorts = await Station.aggregate([
      { $match: { isActive: true, ...stationFilter } },
      { $unwind: "$chargingPorts" },
      {
        $group: {
          _id: "$chargingPorts.status",
          count: { $sum: 1 },
        },
      },
    ]);

    const portsByStatus: Record<string, number> = {};
    let totalPortCount = 0;
    totalPorts.forEach((item: { _id: string; count: number }) => {
      portsByStatus[item._id] = item.count;
      totalPortCount += item.count;
    });

    const utilizationRate =
      totalPortCount > 0
        ? (((portsByStatus["occupied"] || 0) + (portsByStatus["reserved"] || 0)) /
            totalPortCount) *
          100
        : 0;

    return NextResponse.json(
      {
        revenue: {
          total: totalRevenue[0]?.totalDeposits || 0,
          currency: "NPR",
          period: `${daysAgo} days`,
        },
        bookings: {
          total: recentBookings,
          byStatus: statusCounts,
        },
        topStations,
        overview: {
          totalStations,
          totalUsers,
          totalPorts: totalPortCount,
          portsByStatus,
          utilizationRate: Math.round(utilizationRate * 100) / 100,
        },
        dailyBookings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
