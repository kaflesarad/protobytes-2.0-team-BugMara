"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod/v4";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Zap,
  DollarSign,
  Clock,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const chargingPortSchema = z.object({
  portNumber: z.string().min(1, "Port number is required"),
  connectorType: z.string().min(1, "Connector type is required"),
  powerOutput: z.string().min(1, "Power output is required"),
  chargerType: z.enum(["AC", "DC"]),
});

const stationSchema = z.object({
  name: z.string().min(1, "Station name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().optional(),
  telephone: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  chargingPorts: z.array(chargingPortSchema).min(1, "At least one port is required"),
  perHour: z.coerce.number().min(0, "Must be non-negative"),
  depositAmount: z.coerce.number().min(0, "Must be non-negative"),
  openTime: z.string().min(1, "Opening time is required"),
  closeTime: z.string().min(1, "Closing time is required"),
  amenities: z.array(z.string()),
});

type StationFormData = z.infer<typeof stationSchema>;

const CONNECTOR_OPTIONS = [
  { value: "type2", label: "Type 2" },
  { value: "ccssae", label: "CCS/SAE" },
  { value: "chademo", label: "CHAdeMO" },
  { value: "tesla", label: "Tesla" },
  { value: "wall-bs1363", label: "Wall BS1363" },
];

const AMENITY_OPTIONS = [
  { value: "wifi", label: "WiFi" },
  { value: "parking", label: "Parking" },
  { value: "food", label: "Food" },
  { value: "coffee", label: "Coffee" },
  { value: "accomodation", label: "Accommodation" },
  { value: "restroom", label: "Restroom" },
  { value: "petrol", label: "Petrol" },
];

export default function AddStationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<StationFormData>({
    defaultValues: {
      name: "",
      address: "",
      city: "",
      province: "",
      telephone: "",
      lat: 27.7172,
      lng: 85.324,
      chargingPorts: [
        {
          portNumber: "1",
          connectorType: "type2",
          powerOutput: "7.2Kw",
          chargerType: "AC",
        },
      ],
      perHour: 200,
      depositAmount: 500,
      openTime: "06:00",
      closeTime: "22:00",
      amenities: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "chargingPorts",
  });

  const watchAmenities = watch("amenities");

  const toggleAmenity = (amenity: string) => {
    const current = watchAmenities || [];
    const updated = current.includes(amenity)
      ? current.filter((a: string) => a !== amenity)
      : [...current, amenity];
    setValue("amenities", updated);
  };

  const onSubmit = async (data: StationFormData) => {
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: data.name,
        location: {
          address: data.address,
          city: data.city,
          province: data.province || "",
          coordinates: {
            lat: data.lat,
            lng: data.lng,
          },
        },
        telephone: data.telephone || "",
        chargingPorts: data.chargingPorts.map((port) => ({
          ...port,
          status: "available",
        })),
        pricing: {
          perHour: data.perHour,
          depositAmount: data.depositAmount,
        },
        operatingHours: {
          open: data.openTime,
          close: data.closeTime,
        },
        amenities: data.amenities,
        vehicleTypes: ["car"],
        isActive: true,
      };

      const res = await fetch("/api/admin/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const resData = await res.json();
        setError(resData.message || "Failed to create station.");
        setSubmitting(false);
        return;
      }

      router.push("/admin/stations");
    } catch (err) {
      setError("An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/admin/stations"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Stations
        </Link>

        <h1 className="text-2xl font-bold text-foreground">
          Add New Station
        </h1>
        <p className="mt-1 text-muted-foreground">
          Fill in the details to add a new charging station.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              Station Information
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Station Name *
                </label>
                <input
                  {...register("name")}
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                    errors.name
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-border focus:border-primary focus:ring-primary"
                  )}
                  placeholder="e.g. Hotel Barahi Charging Station"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Address *
                  </label>
                  <input
                    {...register("address")}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.address
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
                    placeholder="Street address"
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.address.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    City *
                  </label>
                  <input
                    {...register("city")}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.city
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
                    placeholder="e.g. Kathmandu"
                  />
                  {errors.city && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.city.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Province
                  </label>
                  <input
                    {...register("province")}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Bagmati"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Phone
                  </label>
                  <input
                    {...register("telephone")}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="+977-..."
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register("lat")}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.lat
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
                  />
                  {errors.lat && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.lat.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register("lng")}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.lng
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
                  />
                  {errors.lng && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.lng.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Charging Ports */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
                <Zap className="h-5 w-5 text-primary" />
                Charging Ports
              </h2>
              <button
                type="button"
                onClick={() =>
                  append({
                    portNumber: String(fields.length + 1),
                    connectorType: "type2",
                    powerOutput: "7.2Kw",
                    chargerType: "AC",
                  })
                }
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <Plus className="h-4 w-4" />
                Add Port
              </button>
            </div>

            {errors.chargingPorts?.root && (
              <p className="mt-2 text-xs text-red-600">
                {errors.chargingPorts.root.message}
              </p>
            )}

            <div className="mt-4 space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Port {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded p-1 text-red-500 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Port Number
                      </label>
                      <input
                        {...register(`chargingPorts.${index}.portNumber`)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Connector Type
                      </label>
                      <select
                        {...register(`chargingPorts.${index}.connectorType`)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {CONNECTOR_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Power Output
                      </label>
                      <input
                        {...register(`chargingPorts.${index}.powerOutput`)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. 7.2Kw"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Charger Type
                      </label>
                      <select
                        {...register(`chargingPorts.${index}.chargerType`)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="AC">AC</option>
                        <option value="DC">DC</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <DollarSign className="h-5 w-5 text-primary" />
              Pricing
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Rate per Hour (Rs.) *
                </label>
                <input
                  type="number"
                  {...register("perHour")}
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                    errors.perHour
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-border focus:border-primary focus:ring-primary"
                  )}
                />
                {errors.perHour && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.perHour.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Deposit Amount (Rs.) *
                </label>
                <input
                  type="number"
                  {...register("depositAmount")}
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                    errors.depositAmount
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-border focus:border-primary focus:ring-primary"
                  )}
                />
                {errors.depositAmount && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.depositAmount.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Clock className="h-5 w-5 text-primary" />
              Operating Hours
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Opening Time *
                </label>
                <input
                  type="time"
                  {...register("openTime")}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Closing Time *
                </label>
                <input
                  type="time"
                  {...register("closeTime")}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Settings className="h-5 w-5 text-primary" />
              Amenities
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {AMENITY_OPTIONS.map((amenity) => {
                const isChecked = (watchAmenities || []).includes(amenity.value);
                return (
                  <label
                    key={amenity.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition-all",
                      isChecked
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground hover:border-primary/30"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAmenity(amenity.value)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">{amenity.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Link
              href="/admin/stations"
              className="flex flex-1 items-center justify-center rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors",
                submitting
                  ? "cursor-not-allowed bg-primary/50"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Station
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
