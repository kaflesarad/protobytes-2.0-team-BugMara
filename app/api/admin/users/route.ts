import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";

async function verifySuperAdmin(userId: string) {
  await dbConnect();
  const user = await User.findOne({ clerkId: userId });
  return user && user.role === "superadmin";
}

// GET all users (superadmin only)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await verifySuperAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden - Super Admin only" }, { status: 403 });
    }

    const users = await User.find({})
      .select("clerkId email name role phone createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
