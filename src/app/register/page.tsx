import { useMemo, useState } from "react";
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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getFriendlyAuthError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("user already registered")) {
    return "This email is already registered. Please sign in instead.";
  }

  if (lower.includes("password")) {
    return "Password is invalid. Please use a stronger password and try again.";
  }

  if (lower.includes("email")) {
    return "Please enter a valid email address.";
  }

  if (lower.includes("database error saving new user")) {
    return "We could not create your account right now due to a server issue. Please try again in a moment.";
  }

  if (lower.includes("signup is disabled")) {
    return "Registration is currently disabled.";
  }

  return message;
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

  const trimmedFullName = useMemo(() => fullName.trim(), [fullName]);
  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;

    setError("");
    setSuccessMessage("");

    if (!trimmedFullName) {
      setError("Full name is required.");
      return;
    }

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/onboarding`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: trimmedFullName,
            requested_role: requestedRole,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      const userCreated = Boolean(data.user);
      const hasSession = Boolean(data.session);

      if (!userCreated) {
        setSuccessMessage(
          "Your request was received. Please check your email for the verification link."
        );
      } else if (hasSession) {
        setSuccessMessage(
          "Your account was created successfully. Please continue by checking your email if verification is required."
        );
      } else {
        setSuccessMessage(
          "Registration successful. Please check your email, click the verification link, and then complete your profile."
        );
      }

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRequestedRole("employee");
    } catch (err: unknown) {
      console.error("Register failed:", err);

      const message =
        err instanceof Error
          ? getFriendlyAuthError(err.message)
          : "Failed to register. Please try again.";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-900/60 border-slate-800">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="text-slate-400 mt-2">Request access to the platform</p>
          </div>

          {error ? (
            <Alert className="mb-4 border-red-800 bg-red-900/20 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert className="mb-4 border-emerald-800 bg-emerald-900/20 text-emerald-300">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleRegister} className="space-y-5">
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
                autoComplete="name"
                required
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
                autoComplete="email"
                inputMode="email"
                required
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
                autoComplete="new-password"
                required
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
                autoComplete="new-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
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
