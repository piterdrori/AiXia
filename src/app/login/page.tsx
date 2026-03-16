import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Status =
  | "active"
  | "pending_verification"
  | "pending_profile"
  | "pending_approval"
  | "rejected";

type LoginProfileRow = {
  status: Status | null;
  role: string | null;
  full_name: string | null;
  profile_completed?: boolean | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getFriendlyLoginError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  if (lower.includes("email not confirmed")) {
    return "Please verify your email first.";
  }

  if (lower.includes("too many requests")) {
    return "Too many login attempts. Please wait a moment and try again.";
  }

  return message;
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;

    setError("");
    setInfoMessage("");
    setIsLoading(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(getFriendlyLoginError(signInError.message));
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      setError("Unexpected login error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-900/60 border-slate-800">
        <CardContent className="p-8">

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Sign In</h1>
            <p className="text-slate-400 mt-2">
              Access your TaskFlow account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">

            {error && (
              <Alert className="bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {infoMessage && (
              <Alert className="bg-amber-900/20 border-amber-800 text-amber-300">
                <AlertDescription>{infoMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="bg-slate-950 border-slate-800 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>

              <div className="relative">

                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="bg-slate-950 border-slate-800 text-white pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-400"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>

              </div>
            </div>

            <div className="text-right text-sm">
              <Link
                to="/forgot-password"
                className="text-indigo-400 hover:text-indigo-300"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300"
            >
              Create one
            </Link>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
