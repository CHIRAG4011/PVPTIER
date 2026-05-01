import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Mail, ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ token: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.resetToken) {
        setResult({ token: data.resetToken, expiresAt: data.expiresAt });
      } else {
        toast.info("If that email exists, a reset token will be generated.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Token copied!");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-2 mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Button>
          </Link>

          <div className="glass-card rounded-2xl border-border p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold">Forgot Password</h1>
              <p className="text-muted-foreground text-sm">
                Enter your account email and we'll generate a reset token for you.
              </p>
            </div>

            {!result ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="bg-background/50 border-border/50"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Generating..." : "Generate Reset Token"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-green-400">Reset token generated!</p>
                  <p className="text-xs text-muted-foreground">
                    Copy this token and use it on the reset password page. It expires at{" "}
                    <span className="text-foreground">{new Date(result.expiresAt).toLocaleTimeString()}</span>.
                  </p>

                  <div className="flex gap-2">
                    <code className="flex-1 text-xs font-mono bg-background/50 border border-border rounded-lg px-3 py-2 break-all">
                      {result.token}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyToken} className="shrink-0">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Link href={`/reset-password?token=${result.token}`}>
                  <Button className="w-full">Use Token Now</Button>
                </Link>
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground">
              Remembered your password?{" "}
              <Link href="/login" className="text-primary hover:underline">Log in</Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
