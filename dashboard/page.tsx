"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Zap,
  Heart,
  DollarSign,
  MapPin,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { BookingCard } from "@/components/booking/BookingCard";
import { Spinner } from "@/components/ui/Spinner";
import type { IBooking, IUser } from "@/types";

export default function DashboardPage() {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, userRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/users"),
        ]);

        if (bookingsRes.ok) {
          const bData = await bookingsRes.json();
          setBookings(bData.bookings ?? bData ?? []);
        }
        if (userRes.ok) {
          const uData = await userRes.json();
          setUser(uData.user ?? uData);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(
    (b) => b.status === "active" || b.status === "confirmed"
  ).length;
  const favoriteStations = user?.favoriteStations?.length ?? 0;
  const totalSpent = bookings
    .filter((b) => b.status === "completed" || b.status === "active")
    .reduce((sum, b) => sum + (b.deposit?.amount ?? 0), 0);

  const recentBookings = bookings
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Bookings",
      value: totalBookings,
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Active Bookings",
      value: activeBookings,
      icon: Zap,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Favorite Stations",
      value: favoriteStations,
      icon: Heart,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Total Spent",
      value: formatPrice(totalSpent),
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back{user?.name ? `, ${user.name}` : ""}!
        </p>

        {/* Stats Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-card-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      stat.bg
                    )}
                  >
                    <Icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/"
            className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-card-foreground">
                  Find a Station
                </p>
                <p className="text-sm text-muted-foreground">
                  Discover charging stations near you
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/bookings"
            className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-card-foreground">
                  View Bookings
                </p>
                <p className="text-sm text-muted-foreground">
                  Manage your upcoming bookings
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>

        {/* Recent Bookings */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Bookings
            </h2>
            <Link
              href="/dashboard/bookings"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              View All
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border bg-muted/50 p-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-medium text-foreground">
                No bookings yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Find a station and make your first booking!
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <MapPin className="h-4 w-4" />
                Find Stations
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentBookings.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
