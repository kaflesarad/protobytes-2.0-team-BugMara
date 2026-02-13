import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ role: "guest" }, { status: 200 });
    }

    try {
      await dbConnect();
      const user = await User.findOne({ clerkId: userId }).select("role").lean();
      return NextResponse.json(
        { role: user?.role || "user" },
        { status: 200 }
      );
    } catch {
      return NextResponse.json({ role: "user" }, { status: 200 });
    }
  } catch {
    return NextResponse.json({ role: "guest" }, { status: 200 });
  }
}
