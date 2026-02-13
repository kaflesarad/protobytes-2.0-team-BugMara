"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
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
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import type { IStation } from "@/types";

interface StationFormData {
  name: string;
  address: string;
  city: string;
  province: string;
  telephone: string;
  lat: number;
  lng: number;
  chargingPorts: {
    portNumber: string;
    connectorType: string;
    powerOutput: string;
    chargerType: string;
  }[];
  perHour: number;
  depositAmount: number;
  openTime: string;
  closeTime: string;
  amenities: string[];
}

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

export default function EditStationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [stationId, setStationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<StationFormData>({
    defaultValues: {
      name: "",
      address: "",
      city: "",
      province: "",
      telephone: "",
      lat: 0,
      lng: 0,
      chargingPorts: [],
      perHour: 0,
      depositAmount: 0,
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

  useEffect(() => {
    params.then((p) => setStationId(p.id));
  }, [params]);

  useEffect(() => {
    if (!stationId) return;

    async function fetchStation() {
      try {
        const res = await fetch(`/api/admin/stations/${stationId}`);
        if (res.ok) {
          const data = await res.json();
          const station: IStation = data.station ?? data;

          reset({
            name: station.name,
            address: station.location?.address ?? "",
            city: station.location?.city ?? "",
            province: station.location?.province ?? "",
            telephone: station.telephone ?? "",
            lat: station.location?.coordinates?.lat ?? 0,
            lng: station.location?.coordinates?.lng ?? 0,
            chargingPorts:
              station.chargingPorts?.map((p) => ({
                portNumber: p.portNumber,
                connectorType: p.connectorType,
                powerOutput: p.powerOutput,
                chargerType: p.chargerType,
              })) ?? [],
            perHour: station.pricing?.perHour ?? 0,
            depositAmount: station.pricing?.depositAmount ?? 0,
            openTime: station.operatingHours?.open ?? "06:00",
            closeTime: station.operatingHours?.close ?? "22:00",
            amenities: station.amenities ?? [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch station:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStation();
  }, [stationId, reset]);

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
      };

      const res = await fetch(`/api/admin/stations/${stationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const resData = await res.json();
        setError(resData.message || "Failed to update station.");
        setSubmitting(false);
        return;
      }

      router.push("/admin/stations");
    } catch (err) {
      setError("An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading station...
          </p>
        </div>
      </div>
    );
  }

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

        <h1 className="text-2xl font-bold text-foreground">Edit Station</h1>
        <p className="mt-1 text-muted-foreground">
          Update the station details below.
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
                  {...register("name", { required: "Station name is required" })}
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                    errors.name
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-border focus:border-primary focus:ring-primary"
                  )}
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
                    {...register("address", {
                      required: "Address is required",
                    })}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.address
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
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
                    {...register("city", { required: "City is required" })}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.city
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Phone
                  </label>
                  <input
                    {...register("telephone")}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                    {...register("lat", {
                      required: "Latitude is required",
                      valueAsNumber: true,
                    })}
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
                    {...register("lng", {
                      required: "Longitude is required",
                      valueAsNumber: true,
                    })}
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

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No ports added. Click "Add Port" to add one.
                </p>
              )}
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
                  {...register("perHour", { valueAsNumber: true })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Deposit Amount (Rs.) *
                </label>
                <input
                  type="number"
                  {...register("depositAmount", { valueAsNumber: true })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
