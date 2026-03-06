import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState<RequestedRole>("employee");

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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            requested_role: requestedRole,
          },
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      // Success behavior:
      // - first user becomes active admin automatically by DB trigger
      // - all later users become pending
      setSuccessMessage(
        "Registration submitted successfully. If this is not the first account, an admin must approve it before access is granted."
      );

      setIsLoading(false);

      // Small delay so user sees message, then send to login
      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } catch (err) {
      setError("Something went wrong during registration.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-900/60 border-slate-800">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="text-slate-400 mt-2">
              Register to access TaskFlow
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <Alert className="bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription>{error}</AlertDescription>
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
              <Label htmlFor="requestedRole" className="text-slate-300">
                Requested Role
              </Label>
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
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                The first account becomes admin automatically. All later accounts require admin approval.
              </p>
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
              {isLoading ? "Creating account..." : "Create Account"}
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
