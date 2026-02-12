"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  User,
  Mail,
  Phone,
  Car,
  Battery,
  Plug,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { getConnectorLabel } from "@/lib/utils";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  vehicleInfo: {
    make: string;
    model: string;
    batteryCapacity: number;
    connectorType: string;
  };
}

const connectorOptions = [
  { value: "type2", label: "Type 2" },
  { value: "ccssae", label: "CCS/SAE" },
  { value: "chademo", label: "CHAdeMO" },
  { value: "tesla", label: "Tesla" },
  { value: "wall-bs1363", label: "Wall BS1363" },
];

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicleMake: "",
    vehicleModel: "",
    batteryCapacity: "",
    connectorType: "type2",
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          const u = data.user ?? data;
          setProfile(u);
          setForm({
            name: u.name || clerkUser?.fullName || "",
            phone: u.phone || "",
            vehicleMake: u.vehicleInfo?.make || "",
            vehicleModel: u.vehicleInfo?.model || "",
            batteryCapacity: u.vehicleInfo?.batteryCapacity?.toString() || "",
            connectorType: u.vehicleInfo?.connectorType || "type2",
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [clerkUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          vehicleInfo: {
            make: form.vehicleMake,
            model: form.vehicleModel,
            batteryCapacity: form.batteryCapacity
              ? parseFloat(form.batteryCapacity)
              : 0,
            connectorType: form.connectorType,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and vehicle information.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Personal Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {clerkUser?.primaryEmailAddress?.emailAddress || profile?.email || "—"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Email is managed by your sign-in provider.
                </p>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+977 9800000000"
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Car className="h-5 w-5 text-primary" />
              Vehicle Information
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Help us recommend compatible charging stations.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vehicleMake" className="block text-sm font-medium text-foreground mb-1.5">
                  Vehicle Make
                </label>
                <input
                  id="vehicleMake"
                  type="text"
                  value={form.vehicleMake}
                  onChange={(e) => setForm({ ...form, vehicleMake: e.target.value })}
                  placeholder="e.g., Tesla, Tata, MG"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="vehicleModel" className="block text-sm font-medium text-foreground mb-1.5">
                  Vehicle Model
                </label>
                <input
                  id="vehicleModel"
                  type="text"
                  value={form.vehicleModel}
                  onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                  placeholder="e.g., Model 3, Nexon EV"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="batteryCapacity" className="block text-sm font-medium text-foreground mb-1.5">
                  Battery Capacity (kWh)
                </label>
                <div className="relative">
                  <Battery className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="batteryCapacity"
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.batteryCapacity}
                    onChange={(e) => setForm({ ...form, batteryCapacity: e.target.value })}
                    placeholder="e.g., 40"
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="connectorType" className="block text-sm font-medium text-foreground mb-1.5">
                  Preferred Connector
                </label>
                <div className="relative">
                  <Plug className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="connectorType"
                    value={form.connectorType}
                    onChange={(e) => setForm({ ...form, connectorType: e.target.value })}
                    className="w-full appearance-none rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {connectorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-700">Profile updated successfully!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
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
        </form>
      </div>
    </div>
  );
}
