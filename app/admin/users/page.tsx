"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Shield,
  ShieldCheck,
  UserCog,
  Trash2,
  Loader2,
  Search,
  Crown,
  Building2,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface UserRecord {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  phone?: string;
  createdAt: string;
}

const roleBadgeMap: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info"; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  user: { variant: "default", label: "User", icon: UserIcon },
  admin: { variant: "info", label: "Station Admin", icon: Building2 },
  superadmin: { variant: "warning", label: "Super Admin", icon: Crown },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) return;

    async function checkAndFetch() {
      try {
        // Check role first
        const roleRes = await fetch("/api/users/role");
        if (roleRes.ok) {
          const roleData = await roleRes.json();
          if (roleData.role !== "superadmin") {
            router.push("/admin");
            return;
          }
          setIsSuperAdmin(true);
        }

        // Fetch users
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    }

    checkAndFetch();
  }, [isSignedIn, router]);

  const changeRole = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId ? { ...u, role: data.user.role } : u
          )
        );
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update role");
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    // Prevent self-deletion
    if (user?.id && users.find(u => u._id === userId)?.clerkId === user.id) {
      alert("You cannot delete your own account from the admin panel.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${userName}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to delete user");
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts = {
    all: users.length,
    user: users.filter((u) => u.role === "user").length,
    admin: users.filter((u) => u.role === "admin").length,
    superadmin: users.filter((u) => u.role === "superadmin").length,
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-400" />
            </div>
            User Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage users and assign roles across the platform
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Users", count: roleCounts.all, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Regular Users", count: roleCounts.user, icon: UserIcon, color: "text-slate-400", bg: "bg-slate-500/10" },
          { label: "Station Admins", count: roleCounts.admin, icon: Building2, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          { label: "Super Admins", count: roleCounts.superadmin, icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.count}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border/50 bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "user", "admin", "superadmin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                roleFilter === r
                  ? "bg-primary text-white"
                  : "border border-border/50 bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "all" ? "All" : r === "superadmin" ? "Super Admin" : r === "admin" ? "Station Admin" : "User"}
              <span className="ml-1.5 text-[10px] opacity-70">({roleCounts[r]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-card/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Current Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assign Role</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleInfo = roleBadgeMap[user.role] || roleBadgeMap.user;
                  const RoleIcon = roleInfo.icon;
                  const isLoading = actionLoading === user._id;

                  return (
                    <tr
                      key={user._id}
                      className="border-b border-border/30 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {user.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium text-foreground">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={roleInfo.variant} className="gap-1.5">
                          <RoleIcon className="h-3 w-3" />
                          {roleInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => changeRole(user._id, e.target.value)}
                          disabled={isLoading}
                          className="rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="admin">Station Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteUser(user._id, user.name)}
                          disabled={isLoading}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                          title="Delete user"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
