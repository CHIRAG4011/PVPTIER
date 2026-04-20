import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trophy, ShieldAlert, Clock, CheckCircle, XCircle } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useEffect, useState } from "react";

const TIERS = ["LT1", "LT2", "LT3", "LT4", "LT5", "HT1", "HT2", "HT3", "HT4", "HT5"] as const;

const tierTestSchema = z.object({
  minecraftUsername: z.string().min(1, "Minecraft IGN is required"),
  currentTier: z.enum(TIERS),
  requestedTier: z.enum(TIERS),
  evidence: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

export default function TierTest() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    const token = localStorage.getItem("pvp_token");
    fetch(apiUrl("/api/tier-test/my"), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setMyApplications(d.applications || []))
      .catch(() => {})
      .finally(() => setLoadingApps(false));
  }, [isAuthenticated, setLocation]);

  const form = useForm<z.infer<typeof tierTestSchema>>({
    resolver: zodResolver(tierTestSchema),
    defaultValues: {
      minecraftUsername: user?.minecraftUsername || "",
      currentTier: "LT1",
      requestedTier: "LT2",
      evidence: "",
      notes: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof tierTestSchema>) => {
    setSubmitting(true);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl("/api/tier-test/apply"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Tier test application submitted! An admin will review it soon.");
        form.reset();
        setMyApplications(prev => [data.application, ...prev]);
      } else {
        toast.error(data.message || "Failed to submit application");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const statusClass = (status: string) => {
    if (status === "approved") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (status === "rejected") return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold neon-text-primary mb-2 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Apply for Tier Test
          </h1>
          <p className="text-muted-foreground">
            Think you deserve a higher tier? Submit an application with evidence and an admin will review it.
          </p>
        </div>

        {myApplications.length > 0 && (
          <div className="glass-card rounded-2xl p-6 border-border mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Your Applications
            </h2>
            <div className="space-y-3">
              {myApplications.map((app: any) => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                  <div>
                    <div className="font-medium text-sm">{app.minecraftUsername}</div>
                    <div className="text-xs text-muted-foreground">
                      {app.currentTier} → {app.requestedTier} · {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                    {app.reviewNote && (
                      <div className="text-xs text-muted-foreground mt-1 italic">Note: {app.reviewNote}</div>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border font-bold uppercase ${statusClass(app.status)}`}>
                    {statusIcon(app.status)}
                    {app.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 md:p-8 border-primary/20">
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-200 rounded-lg p-4 mb-6 flex gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Requirements</p>
              <ul className="text-blue-200/80 space-y-1 list-disc list-inside">
                <li>You can only apply for one tier above your current tier</li>
                <li>Evidence (video/screenshot) is strongly recommended</li>
                <li>Admin decision is final</li>
                <li>Only one pending application allowed at a time</li>
              </ul>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="minecraftUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Minecraft IGN</FormLabel>
                    <FormControl>
                      <Input placeholder="Notch" {...field} className="bg-background/50 border-border/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currentTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Tier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Current tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requestedTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requested Tier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Target tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="evidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence Link (Recommended)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/... or https://imgur.com/..." {...field} className="bg-background/50 border-border/50" />
                    </FormControl>
                    <FormDescription>Link to a video or screenshot showing your skill level</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why you think you deserve this tier..."
                        className="bg-background/50 border-border/50 resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={submitting}>
                {submitting ? "Submitting Application..." : "Submit Tier Test Application"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
