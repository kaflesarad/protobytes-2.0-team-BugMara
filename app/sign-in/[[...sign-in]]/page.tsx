"use client";

import { SignIn } from "@clerk/nextjs";
import { useState } from "react";
import { User, Building2, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type SignInRole = "user" | "station-admin" | "super-admin";

const roles = [
  {
    id: "user" as SignInRole,
    label: "User",
    description: "EV driver",
    icon: User,
    color: "text-blue-600",
    bg: "bg-blue-50",
    activeBorder: "border-blue-500 ring-blue-500/20",
  },
  {
    id: "station-admin" as SignInRole,
    label: "Station Admin",
    description: "Station owner",
    icon: Building2,
    color: "text-amber-600",
    bg: "bg-amber-50",
    activeBorder: "border-amber-500 ring-amber-500/20",
  },
  {
    id: "super-admin" as SignInRole,
    label: "Super Admin",
    description: "Platform admin",
    icon: ShieldCheck,
    color: "text-purple-600",
    bg: "bg-purple-50",
    activeBorder: "border-purple-500 ring-purple-500/20",
  },
];

export default function SignInPage() {
  const [selectedRole, setSelectedRole] = useState<SignInRole>("user");

  const redirectUrl =
    selectedRole === "super-admin" || selectedRole === "station-admin"
      ? "/admin"
      : "/dashboard";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your Urja Station account
          </p>
        </div>

        {/* Role selector tabs */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {roles.map((role) => {
            const Icon = role.icon;
            const isActive = selectedRole === role.id;

            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all",
                  isActive
                    ? `${role.activeBorder} bg-card shadow-sm ring-2`
                    : "border-border hover:border-border/80"
                )}
              >
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", role.bg)}>
                  <Icon className={cn("h-4 w-4", role.color)} />
                </div>
                <span className="text-xs font-semibold text-foreground">{role.label}</span>
                <span className="text-[10px] text-muted-foreground">{role.description}</span>
              </button>
            );
          })}
        </div>

        <SignIn
          forceRedirectUrl={redirectUrl}
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "shadow-none w-full",
              card: "shadow-none border border-border rounded-xl w-full",
            },
          }}
        />
      </div>
    </div>
  );
}
