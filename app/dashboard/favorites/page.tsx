"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  MapPin,
  Zap,
  Star,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn, getConnectorLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { IStation } from "@/types";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<IStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const res = await fetch("/api/users/favorites");
        if (res.ok) {
          const data = await res.json();
          setFavorites(data.stations ?? data ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch favorites:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFavorites();
  }, []);

  const handleRemove = async (stationId: string) => {
    setRemovingId(stationId);
    setRemoveError("");
    try {
      const res = await fetch(`/api/users/favorites/${stationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFavorites((prev) => prev.filter((s) => s._id !== stationId));
      } else {
        setRemoveError("Failed to remove favorite. Please try again.");
      }
    } catch (err) {
      console.error("Failed to remove favorite:", err);
      setRemoveError("Network error. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading favorites...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">
          Favorite Stations
        </h1>
        <p className="mt-1 text-muted-foreground">
          Stations you have saved for quick access.
        </p>

        {removeError && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {removeError}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-muted/50 p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-medium text-foreground">
              No favorite stations
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start adding stations to your favorites for quick access.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <MapPin className="h-4 w-4" />
              Explore Stations
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((station) => {
              const availablePorts =
                station.chargingPorts?.filter((p) => p.status === "available")
                  .length ?? 0;
              const totalPorts = station.chargingPorts?.length ?? 0;
              const connectorTypes =
                station.chargingPorts
                  ?.map((p) => p.connectorType)
                  .filter((v, i, a) => a.indexOf(v) === i) ?? [];

              return (
                <div
                  key={station._id}
                  className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/stations/${station._id}`}
                      className="flex-1 group"
                    >
                      <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                        {station.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {station.location?.city}
                          {station.location?.address
                            ? ` - ${station.location.address}`
                            : ""}
                        </span>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleRemove(station._id)}
                      disabled={removingId === station._id}
                      className="rounded-full p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                      aria-label="Remove from favorites"
                    >
                      {removingId === station._id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Connectors */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {connectorTypes.map((type) => (
                      <Badge key={type} variant="info">
                        <Zap className="mr-1 h-3 w-3" />
                        {getConnectorLabel(type)}
                      </Badge>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-1">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          availablePorts > 0 ? "bg-green-500" : "bg-red-500"
                        )}
                      />
                      <span className="text-sm text-muted-foreground">
                        <span
                          className={cn(
                            "font-medium",
                            availablePorts > 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {availablePorts}
                        </span>
                        /{totalPorts} available
                      </span>
                    </div>
                    {station.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">
                          {station.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
