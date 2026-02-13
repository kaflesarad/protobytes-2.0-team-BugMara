import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";

async function verifySuperAdmin(userId: string) {
  await dbConnect();
  const user = await User.findOne({ clerkId: userId });
  return user && user.role === "superadmin";
}

// PATCH - Update user role (superadmin only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await verifySuperAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden - Super Admin only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role || !["user", "admin", "superadmin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be user, admin, or superadmin" },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent superadmin from demoting themselves
    if (targetUser.clerkId === userId && role !== "superadmin") {
      return NextResponse.json(
        { error: "Cannot change your own super admin role" },
        { status: 400 }
      );
    }

    targetUser.role = role;
    await targetUser.save();

    return NextResponse.json(
      { user: { _id: targetUser._id, name: targetUser.name, email: targetUser.email, role: targetUser.role } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

// DELETE - Remove user (superadmin only)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await verifySuperAdmin(userId))) {
      return NextResponse.json({ error: "Forbidden - Super Admin only" }, { status: 403 });
    }

    const { id } = await params;
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting yourself
    if (targetUser.clerkId === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account from admin panel" },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
