"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Zap,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";
import { cn, getConnectorLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { IStation } from "@/types";

export default function AdminStationsPage() {
  const [stations, setStations] = useState<IStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStations() {
      try {
        const res = await fetch("/api/admin/stations");
        if (res.ok) {
          const data = await res.json();
          setStations(data.stations ?? data ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch stations:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStations();
  }, []);

  const toggleStatus = async (stationId: string, currentActive: boolean) => {
    setTogglingId(stationId);
    try {
      const res = await fetch(`/api/admin/stations/${stationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setStations((prev) =>
          prev.map((s) =>
            s._id === stationId ? { ...s, isActive: !currentActive } : s
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle station:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const deleteStation = async (stationId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this station? This action cannot be undone."
    );
    if (!confirmed) return;

    setDeletingId(stationId);
    try {
      const res = await fetch(`/api/admin/stations/${stationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStations((prev) => prev.filter((s) => s._id !== stationId));
      }
    } catch (err) {
      console.error("Failed to delete station:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading stations...
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
              Manage Stations
            </h1>
            <p className="mt-1 text-muted-foreground">
              Add, edit, and manage your charging stations.
            </p>
          </div>
          <Link
            href="/admin/stations/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Station
          </Link>
        </div>

        {stations.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-muted/50 p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-medium text-foreground">
              No stations yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first charging station to get started.
            </p>
            <Link
              href="/admin/stations/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Station
            </Link>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Station
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground sm:table-cell">
                    Location
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground md:table-cell">
                    Ports
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stations.map((station) => {
                  const totalPorts = station.chargingPorts?.length ?? 0;
                  const availablePorts =
                    station.chargingPorts?.filter(
                      (p) => p.status === "available"
                    ).length ?? 0;

                  return (
                    <tr
                      key={station._id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-foreground">
                          {station.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                          {station.location?.city}
                        </p>
                      </td>
                      <td className="hidden px-4 py-4 sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {station.location?.city}
                        </div>
                      </td>
                      <td className="hidden px-4 py-4 md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          <span className="font-medium text-green-600">
                            {availablePorts}
                          </span>
                          /{totalPorts}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            toggleStatus(station._id, station.isActive)
                          }
                          disabled={togglingId === station._id}
                          className="flex items-center gap-1.5"
                        >
                          {togglingId === station._id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : station.isActive ? (
                            <ToggleRight className="h-6 w-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-400" />
                          )}
                          <span
                            className={cn(
                              "text-xs font-medium",
                              station.isActive
                                ? "text-green-600"
                                : "text-gray-400"
                            )}
                          >
                            {station.isActive ? "Active" : "Inactive"}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/stations/${station._id}`}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => deleteStation(station._id)}
                            disabled={deletingId === station._id}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === station._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
