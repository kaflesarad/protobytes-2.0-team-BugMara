"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useUser();
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    async function checkRole() {
      try {
        const res = await fetch("/api/users/role");
        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
        } else {
          setRole("user");
        }
      } catch {
        setRole("user");
      } finally {
        setChecking(false);
      }
    }

    checkRole();
  }, [isSignedIn, isLoaded, router]);

  if (!isLoaded || checking) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  if (role !== "admin" && role !== "superadmin") {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <ShieldAlert className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-foreground">
            Access Denied
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            You don&apos;t have permission to access the admin panel. Only
            station administrators can access this section.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}