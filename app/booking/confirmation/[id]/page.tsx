"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Zap,
  QrCode,
  CheckCircle2,
  X,
  Loader2,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  cn,
  formatPrice,
  formatDuration,
  getConnectorLabel,
} from "@/lib/utils";
import type { IBooking, IStation } from "@/types";
import { format } from "date-fns";
import { ReviewForm } from "@/components/review/ReviewForm";

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

export default function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<IBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    params.then((p) => setBookingId(p.id));
  }, [params]);

  useEffect(() => {
    if (!bookingId) return;

    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data.booking ?? data);
        }
      } catch (err) {
        console.error("Failed to fetch booking:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId]);

  const handleCancel = async () => {
    if (!booking) return;
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${booking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking ?? data);
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading booking details...
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Booking Not Found
          </h2>
          <p className="mt-2 text-muted-foreground">
            The booking you are looking for does not exist.
          </p>
          <Link
            href="/dashboard/bookings"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            View My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const station =
    typeof booking.stationId === "object"
      ? (booking.stationId as IStation)
      : null;
  const statusVariant = statusVariantMap[booking.status] || "default";
  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/dashboard/bookings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          My Bookings
        </Link>

        {/* Confirmation Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Booking {booking.status === "cancelled" ? "Cancelled" : "Confirmed"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Booking ID:{" "}
            <span className="font-mono text-sm">{booking._id}</span>
          </p>
        </div>

        {/* Status Badge */}
        <div className="mt-6 flex justify-center">
          <Badge variant={statusVariant} className="px-4 py-1.5 text-sm">
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        {/* Booking Details */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-card-foreground">
            Booking Details
          </h2>

          <div className="mt-4 space-y-4">
            {/* Station */}
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {station ? station.name : "Charging Station"}
                </p>
                {station && (
                  <p className="text-sm text-muted-foreground">
                    {station.location?.address}, {station.location?.city}
                  </p>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(booking.startTime), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(booking.startTime), "h:mm a")} -{" "}
                  {format(new Date(booking.endTime), "h:mm a")}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Duration: {formatDuration(booking.estimatedDuration)}
                </p>
              </div>
            </div>

            {/* Port */}
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Port: {booking.portId}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code */}
        {booking.qrCode && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
            <h3 className="flex items-center justify-center gap-2 font-semibold text-card-foreground">
              <QrCode className="h-5 w-5 text-primary" />
              Your QR Code
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Show this QR code at the station to start charging.
            </p>
            <div className="mt-4 flex justify-center">
              <img
                src={booking.qrCode}
                alt="Booking QR Code"
                className="h-48 w-48 rounded-lg border border-border"
              />
            </div>
          </div>
        )}

        {/* Deposit */}
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              Deposit Amount
            </span>
            <span className="text-xl font-bold text-primary">
              {formatPrice(booking.deposit?.amount ?? 0)}
            </span>
          </div>
          {booking.deposit?.refunded && (
            <p className="mt-2 text-sm text-green-600">
              Deposit has been refunded.
            </p>
          )}
        </div>

        {/* Review Section - show for completed bookings */}
        {booking.status === "completed" && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <h3 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Star className="h-5 w-5 text-yellow-500" />
              Leave a Review
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              How was your charging experience?
            </p>
            <div className="mt-4">
              <ReviewForm
                stationId={typeof booking.stationId === "object" ? (booking.stationId as IStation)._id : booking.stationId}
                bookingId={booking._id}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/bookings"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            View My Bookings
          </Link>
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Cancel Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
