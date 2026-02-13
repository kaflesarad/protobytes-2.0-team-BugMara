"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn, formatPrice, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { IBooking, IStation } from "@/types";
import { format } from "date-fns";

type StatusFilter = "all" | "pending" | "confirmed" | "active" | "completed" | "cancelled" | "no-show";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no-show", label: "No Show" },
];

const statusVariantMap: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  pending: "warning",
  confirmed: "info",
  active: "success",
  completed: "default",
  cancelled: "danger",
  "no-show": "danger",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch("/api/admin/bookings");
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
    if (statusFilter === "all") return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: string
  ) => {
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId
              ? { ...b, status: newStatus as IBooking["status"] }
              : b
          )
        );
      }
    } catch (err) {
      console.error("Failed to update booking:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Manage Bookings
            </h1>
            <p className="mt-1 text-muted-foreground">
              View and manage all bookings for your stations.
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === opt.value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Bookings Table */}
        {filteredBookings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-muted/50 p-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-medium text-foreground">
              No bookings found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter === "all"
                ? "No bookings have been made yet."
                : `No ${statusFilter} bookings.`}
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Station
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Date / Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Deposit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBookings.map((booking) => {
                    const station =
                      typeof booking.stationId === "object"
                        ? (booking.stationId as IStation)
                        : null;
                    const isLoading = actionLoadingId === booking._id;

                    return (
                      <tr
                        key={booking._id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">
                            {booking.userName || "User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.userEmail || ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {station?.name || "Station"}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">
                            {format(
                              new Date(booking.startTime),
                              "MMM d, yyyy"
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(booking.startTime), "h:mm a")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDuration(booking.estimatedDuration)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              statusVariantMap[booking.status] || "default"
                            }
                          >
                            {booking.status.charAt(0).toUpperCase() +
                              booking.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {formatPrice(booking.deposit?.amount ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <>
                                {(booking.status === "active" ||
                                  booking.status === "confirmed") && (
                                  <button
                                    onClick={() =>
                                      updateBookingStatus(
                                        booking._id,
                                        "completed"
                                      )
                                    }
                                    className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50"
                                    title="Mark Complete"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                )}
                                {(booking.status === "confirmed" ||
                                  booking.status === "pending") && (
                                  <button
                                    onClick={() =>
                                      updateBookingStatus(
                                        booking._id,
                                        "no-show"
                                      )
                                    }
                                    className="rounded-lg p-2 text-orange-600 transition-colors hover:bg-orange-50"
                                    title="Mark No-Show"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </button>
                                )}
                                {(booking.status === "pending" ||
                                  booking.status === "confirmed") && (
                                  <button
                                    onClick={() =>
                                      updateBookingStatus(
                                        booking._id,
                                        "cancelled"
                                      )
                                    }
                                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                                    title="Cancel"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
