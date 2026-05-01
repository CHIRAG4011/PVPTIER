import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { Key, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

export default function ResetPassword() {
  const [, params] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const urlToken = searchParams.get("token") || "";

  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (!token.trim()) { toast.error("Reset token is required"); return; }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        toast.success("Password reset successfully!");
      } else {
        toast.error(data.message || "Invalid or expired token");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md">
          <Link href="/forgot-password">
            <Button variant="ghost" size="sm" className="gap-2 mb-6">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>

          <div className="glass-card rounded-2xl border-border p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                {success ? <Check className="w-7 h-7 text-green-500" /> : <Key className="w-7 h-7 text-primary" />}
              </div>
              <h1 className="text-2xl font-display font-bold">
                {success ? "Password Reset!" : "Reset Password"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {success
                  ? "Your password has been changed. You can now log in."
                  : "Enter your reset token and choose a new password."}
              </p>
            </div>

            {success ? (
              <Link href="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reset Token</label>
                  <Input
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="Paste your reset token here"
                    required
                    className="bg-background/50 border-border/50 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Don't have one?{" "}
                    <Link href="/forgot-password" className="text-primary hover:underline">Request a token</Link>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="bg-background/50 border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="bg-background/50 border-border/50"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}

            {!success && (
              <div className="text-center text-sm text-muted-foreground">
                Remembered your password?{" "}
                <Link href="/login" className="text-primary hover:underline">Log in</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
