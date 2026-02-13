"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookingCard } from "@/components/booking/BookingCard";
import { Spinner } from "@/components/ui/Spinner";
import type { IBooking } from "@/types";

type TabValue = "upcoming" | "active" | "past" | "cancelled";

const TABS: { value: TabValue; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
];

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch("/api/bookings");
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings ?? data ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter((b) => {
      switch (activeTab) {
        case "upcoming":
          return (
            (b.status === "confirmed" || b.status === "pending") &&
            new Date(b.startTime) > now
          );
        case "active":
          return b.status === "active";
        case "past":
          return b.status === "completed" || b.status === "no-show";
        case "cancelled":
          return b.status === "cancelled";
        default:
          return true;
      }
    });
  }, [bookings, activeTab]);

  const handleCancel = async (bookingId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );
    if (!confirmed) return;

    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId ? { ...b, status: "cancelled" } : b
          )
        );
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err);
    } finally {
      setCancellingId(null);
    }
  };

  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      upcoming: bookings.filter(
        (b) =>
          (b.status === "confirmed" || b.status === "pending") &&
          new Date(b.startTime) > now
      ).length,
      active: bookings.filter((b) => b.status === "active").length,
      past: bookings.filter(
        (b) => b.status === "completed" || b.status === "no-show"
      ).length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading bookings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your charging station bookings.
        </p>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 rounded-lg border border-border bg-muted p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.value
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === tab.value
                    ? "bg-primary/10 text-primary"
                    : "bg-muted-foreground/10 text-muted-foreground"
                )}
              >
                {tabCounts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        {/* Booking List */}
        <div className="mt-6 space-y-3">
          {filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/50 p-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-medium text-foreground">
                No {activeTab} bookings
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === "upcoming"
                  ? "You have no upcoming bookings."
                  : activeTab === "active"
                    ? "You have no active charging sessions."
                    : activeTab === "past"
                      ? "You have no completed bookings."
                      : "You have no cancelled bookings."}
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                onCancel={handleCancel}
                showActions={activeTab === "upcoming"}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
