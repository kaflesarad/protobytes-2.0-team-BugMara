"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Clock,
  Zap,
  User,
  Loader2,
  ScanLine,
  RefreshCw,
  Upload,
  ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn, formatPrice, formatDuration } from "@/lib/utils";
import { format } from "date-fns";

interface ScannedBooking {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  stationId: string;
  portId: string;
  startTime: string;
  endTime: string;
  estimatedDuration: number;
  status: string;
  deposit?: { amount: number; refunded: boolean };
  station?: {
    name: string;
    location?: { address?: string; city?: string };
  };
}

const statusVariantMap: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  confirmed: "info",
  active: "success",
  completed: "default",
  cancelled: "danger",
  "no-show": "danger",
};

export default function AdminScanPage() {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [booking, setBooking] = useState<ScannedBooking | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previousStatus, setPreviousStatus] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = "qr-reader";
  const processedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setShowScanner(false);
  }, []);

  const verifyQrData = useCallback(
    async (decodedText: string) => {
      // Prevent double-processing
      if (processedRef.current) return;
      processedRef.current = true;

      // Stop camera
      await stopScanner();

      setLoading(true);
      setError("");
      setMessage("");
      setBooking(null);
      setPreviousStatus("");
      setNewStatus("");

      try {
        const res = await fetch("/api/admin/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrData: decodedText, action: "verify" }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to verify QR code");
          return;
        }

        setBooking(data.booking);
        setMessage(data.message);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [stopScanner]
  );

  const startScanner = useCallback(async () => {
    setCameraError("");
    setError("");
    setMessage("");
    setBooking(null);
    processedRef.current = false;

    // Show the container FIRST so html5-qrcode can find it
    setShowScanner(true);

    // Wait for the DOM to update
    await new Promise((r) => setTimeout(r, 100));

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      // Try back camera first, fall back to any camera
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => verifyQrData(decodedText),
          () => {}
        );
      } catch {
        // facingMode failed — try getting any available camera
        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length === 0) {
          throw new Error("NotFoundError: No cameras found");
        }
        await scanner.start(
          cameras[0].id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => verifyQrData(decodedText),
          () => {}
        );
      }

      setScanning(true);
    } catch (err) {
      setShowScanner(false);
      const msg = err instanceof Error ? err.message : "Failed to start camera";
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setCameraError(
          "Camera permission denied. Please allow camera access in your browser settings, or use the 'Upload QR Image' option below."
        );
      } else if (msg.includes("NotFoundError") || msg.includes("No cameras")) {
        setCameraError(
          "No camera found on this device. Use the 'Upload QR Image' option below."
        );
      } else if (msg.includes("NotReadableError") || msg.includes("in use")) {
        setCameraError(
          "Camera is in use by another app. Close other apps using the camera and try again."
        );
      } else {
        setCameraError(
          `Could not start camera: ${msg}. Try the 'Upload QR Image' option below.`
        );
      }
    }
  }, [verifyQrData]);

  // Handle QR image file upload
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      processedRef.current = false;
      setError("");
      setMessage("");
      setBooking(null);
      setCameraError("");
      setLoading(true);

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-file-scanner");

        const result = await scanner.scanFile(file, true);
        scanner.clear();
        await verifyQrData(result);
      } catch {
        setLoading(false);
        setError(
          "Could not read a QR code from this image. Make sure the image contains a clear, well-lit QR code."
        );
      }

      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [verifyQrData]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) scannerRef.current.stop();
          scannerRef.current.clear();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const handleConfirm = async () => {
    if (!booking) return;

    setConfirming(true);
    setError("");

    try {
      const qrData = JSON.stringify({
        bookingId: booking._id,
        stationId: booking.stationId,
        portId: booking.portId,
        startTime: booking.startTime,
        endTime: booking.endTime,
      });

      const res = await fetch("/api/admin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData, action: "confirm" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to confirm booking");
        return;
      }

      setBooking(data.booking);
      setMessage(data.message);
      setPreviousStatus(data.previousStatus);
      setNewStatus(data.newStatus);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const handleScanAnother = () => {
    setBooking(null);
    setMessage("");
    setError("");
    setPreviousStatus("");
    setNewStatus("");
    processedRef.current = false;
  };

  const canConfirm =
    booking &&
    (booking.status === "pending" || booking.status === "confirmed");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ScanLine className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            QR Code Scanner
          </h1>
          <p className="mt-1 text-muted-foreground">
            Scan a user&apos;s booking QR code to verify and confirm their
            booking.
          </p>
        </div>

        {/* Scanner Area */}
        <div className="mt-8">
          {!scanning && !booking && !loading && !showScanner && (
            <div className="space-y-4">
              {/* Camera Scanner Option */}
              <div className="rounded-xl border-2 border-dashed border-border bg-muted/50 p-8 text-center">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  Scan with Camera
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Open your camera and point it at the booking QR code.
                </p>
                <button
                  onClick={startScanner}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <Camera className="h-4 w-4" />
                  Start Camera
                </button>

                {cameraError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-left">
                    <div className="flex items-start gap-2">
                      <CameraOff className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-sm text-red-700">{cameraError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* File Upload Option */}
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 text-base font-medium text-foreground">
                  Upload QR Image
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Take a photo of the QR code or select from gallery.
                </p>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  Choose Image
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Camera View — always in DOM, visibility controlled by height */}
          <div
            id={scannerContainerId}
            className={cn(
              "overflow-hidden rounded-xl transition-all",
              showScanner ? "min-h-[300px]" : "h-0"
            )}
          />

          {/* Hidden container for file-based scanning */}
          <div id="qr-file-scanner" className="hidden" />

          {scanning && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground animate-pulse">
                Point your camera at the QR code...
              </p>
              <button
                onClick={stopScanner}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <CameraOff className="h-4 w-4" />
                Stop Scanner
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="mt-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                Verifying booking...
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Verification Failed
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
            <button
              onClick={handleScanAnother}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-800"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Success Confirmation */}
        {newStatus && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  {message}
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Status changed from{" "}
                  <span className="font-medium">{previousStatus}</span> to{" "}
                  <span className="font-medium">{newStatus}</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details */}
        {booking && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-card-foreground">
                Booking Details
              </h2>
              <Badge variant={statusVariantMap[booking.status] || "default"}>
                {booking.status.charAt(0).toUpperCase() +
                  booking.status.slice(1)}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {/* Station */}
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {booking.station?.name || "Station"}
                  </p>
                  {booking.station?.location && (
                    <p className="text-sm text-muted-foreground">
                      {booking.station.location.address}
                      {booking.station.location.city
                        ? `, ${booking.station.location.city}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* User */}
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {booking.userName || "User"}
                  </p>
                  {booking.userEmail && (
                    <p className="text-sm text-muted-foreground">
                      {booking.userEmail}
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
                    {format(new Date(booking.startTime), "h:mm a")} —{" "}
                    {format(new Date(booking.endTime), "h:mm a")}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Duration: {formatDuration(booking.estimatedDuration)}
                </p>
              </div>

              {/* Port */}
              <div className="flex items-start gap-3">
                <Zap className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Port: {booking.portId}
                </p>
              </div>

              {/* Deposit */}
              {booking.deposit && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Deposit
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(booking.deposit.amount)}
                    </span>
                  </div>
                  {booking.deposit.refunded && (
                    <p className="mt-1 text-xs text-green-600">Refunded</p>
                  )}
                </div>
              )}
            </div>

            {/* Booking ID */}
            <div className="mt-4 rounded-lg bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Booking ID:{" "}
                <span className="font-mono text-foreground">{booking._id}</span>
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {canConfirm && !newStatus && (
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {confirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {booking.status === "pending"
                    ? "Confirm Booking"
                    : "Activate Charging Session"}
                </button>
              )}

              <button
                onClick={handleScanAnother}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ScanLine className="h-4 w-4" />
                Scan Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
