"use client";

import { SignUp } from "@clerk/nextjs";
import { useState } from "react";
import { RoleSelector, type AccountRole } from "@/components/auth/RoleSelector";
import { Zap } from "lucide-react";

export default function SignUpPage() {
  const [selectedRole, setSelectedRole] = useState<AccountRole>("user");
  const [step, setStep] = useState<"role" | "signup">("role");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      {step === "role" ? (
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose how you&apos;ll use Urja Station
            </p>
          </div>

          <RoleSelector
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
          />

          <button
            onClick={() => setStep("signup")}
            className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Continue as {selectedRole === "user" ? "User" : selectedRole === "admin" ? "Station Admin" : "Super Admin"}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setStep("role")}
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              ← Change role
            </button>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {selectedRole === "user"
                ? "User"
                : selectedRole === "admin"
                ? "Station Admin"
                : "Super Admin"}
            </span>
          </div>
          <SignUp
            forceRedirectUrl={`/api/users?autoCreate=true&role=${selectedRole}`}
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "shadow-none w-full",
                card: "shadow-none border border-border rounded-xl w-full",
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
