import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPasswordPage() {

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault();

    setError("");
    setMessage("");
    setIsLoading(true);

    try {

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Password reset email sent. Please check your inbox.");

    } catch (err) {

      setError("Unexpected error sending reset email.");

    } finally {

      setIsLoading(false);

    }
  };

  return (

    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

      <Card className="w-full max-w-md bg-slate-900/60 border-slate-800">

        <CardContent className="p-8">

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">
              Forgot Password
            </h1>
            <p className="text-slate-400 mt-2">
              Enter your email to reset your password
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-5">

            {error && (
              <Alert className="bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="bg-green-900/20 border-green-800 text-green-300">
                <AlertDescription>{message}</AlertDescription>
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
                required
              />

            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? "Sending..." : "Send Reset Email"}
            </Button>

          </form>

          <div className="mt-6 text-center text-sm text-slate-400">

            <Link
              to="/login"
              className="text-indigo-400 hover:text-indigo-300"
            >
              Back to login
            </Link>

          </div>

        </CardContent>

      </Card>

    </div>

  );
}
