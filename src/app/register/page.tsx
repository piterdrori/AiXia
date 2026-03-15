import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RequestedRole = "manager" | "employee" | "guest";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (typeof err === "string" && err.trim()) {
    return err;
  }

  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;

    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }

    if (
      typeof anyErr.error_description === "string" &&
      anyErr.error_description.trim()
    ) {
      return anyErr.error_description;
    }

    if (typeof anyErr.msg === "string" && anyErr.msg.trim()) {
      return anyErr.msg;
    }

    return JSON.stringify(anyErr, null, 2);
  }

  return "Registration failed. Try again.";
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestedRole, setRequestedRole] =
    useState<RequestedRole>("employee");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            requested_role: requestedRole,
            role: requestedRole,
            status: "pending_verification",
            profile_completed: false,
          },
        },
      });

      console.log("SIGNUP RESULT:", result);

      if (result.error) {
        throw result.error;
      }

      setSuccessMessage(
        "Registration submitted successfully. Please check your email to verify your account. After verification, your request will wait for admin approval."
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRequestedRole("employee");
    } catch (err) {
  console.error("REGISTER ERROR:", err);

  const rawMessage = getErrorMessage(err);

  if (
    rawMessage.includes("Gateway Timeout") ||
    rawMessage.includes("AuthRetryableFetchError") ||
    rawMessage.includes("504")
  ) {
    setError(
      "The server took too long to respond. Please wait a minute and try again. Also check in Supabase Users to see whether the account was already created."
    );
  } else {
    setError(rawMessage);
  }
} finally {
  setIsLoading(false);
}

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-900/60 border-slate-800">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="text-slate-400 mt-2">Request access to the platform</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <Alert className="bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription className="whitespace-pre-wrap">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="bg-emerald-900/20 border-emerald-800 text-emerald-300">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-300">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-slate-950 border-slate-800 text-white"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-slate-950 border-slate-800 text-white"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Requested Role</Label>
              <Select
                value={requestedRole}
                onValueChange={(value) =>
                  setRequestedRole(value as RequestedRole)
                }
                disabled={isLoading}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-white">
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="bg-slate-950 border-slate-800 text-white"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="bg-slate-950 border-slate-800 text-white"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Request Access"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
