import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Swords, ShieldAlert, Search, Video, Trophy, Clock, AlertCircle, Gavel, CheckCircle2, Users, Gamepad2 } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useState, useEffect, useRef } from "react";

const GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];

const submissionSchema = z.object({
  opponentUsername: z.string().min(1, { message: "Opponent IGN is required" }),
  gamemode: z.string().min(1, { message: "Gamemode is required" }),
  evidence: z
    .string()
    .min(1, { message: "Video evidence is required" })
    .url({ message: "Must be a valid video URL (e.g. https://youtube.com/... or https://medal.tv/...)" }),
});

function PlayerSearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length < 2) { setSuggestions([]); return; }
      setSearching(true);
      try {
        const res = await fetch(apiUrl(`/api/players/search?q=${encodeURIComponent(query)}`));
        const data = await res.json();
        setSuggestions(data.players || []);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (player: any) => {
    setQuery(player.minecraftUsername);
    onChange(player.minecraftUsername);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Start typing their Minecraft IGN..."
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          className="bg-background/50 border-border/50 pl-11 h-14 text-base"
          autoComplete="off"
        />
      </div>
      {showSuggestions && query.length >= 2 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {searching ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Searching...</div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              No players found — they must be registered in the system.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 flex items-center justify-between transition-colors border-b border-border/50 last:border-0"
                  onClick={() => handleSelect(player)}
                >
                  <div className="flex items-center gap-3">
                    <img src={`https://mc-heads.net/avatar/${player.minecraftUsername}/32`} className="w-8 h-8 rounded" alt="" />
                    <div>
                      <div className="font-semibold">{player.minecraftUsername}</div>
                      <div className="text-xs text-muted-foreground">Registered player</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs font-mono">{player.tier}</Badge>
                    <span className="font-semibold text-foreground">{player.elo}</span>
                    <span>Score</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STEPS = [
  { icon: Swords, label: "Play Match", desc: "Fight your opponent" },
  { icon: Video, label: "Record Video", desc: "Capture the full fight" },
  { icon: Trophy, label: "Upload Evidence", desc: "Submit the URL" },
  { icon: Gavel, label: "Admin Review", desc: "Winner is decided" },
];

export default function SubmitMatch() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const prefilledOpponent = new URLSearchParams(window.location.search).get("opponent") || "";

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      opponentUsername: prefilledOpponent,
      gamemode: "",
      evidence: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof submissionSchema>) => {
    setSubmitting(true);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl("/api/submissions"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Match submitted! An admin will review your video and decide the winner.");
        form.reset();
        setLocation("/player/" + user?.id);
      } else {
        toast.error(data.message || "Failed to submit match");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 mb-5">
            <Swords className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold neon-text-primary mb-3">
            Submit Match Result
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Upload your match video. Admins will watch it carefully and decide the winner — you don't pick the result yourself.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex flex-col items-center text-center gap-2 p-4 rounded-xl border ${
                i === 2
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-card/50"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                i === 2 ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted/20 text-muted-foreground"
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <div>
                <div className={`text-sm font-semibold ${i === 2 ? "text-primary" : "text-foreground"}`}>{step.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Mandatory Evidence Notice */}
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-5 mb-8 flex gap-4 text-sm">
          <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">
            <p className="font-bold mb-2 text-red-300 text-base">Video recording is REQUIRED</p>
            <ul className="text-red-200/80 space-y-1 list-disc list-inside">
              <li>Upload a full video clip to YouTube, Medal, Streamable, or Twitch Clips</li>
              <li>The video must clearly show both players and the final result</li>
              <li>Submissions without a valid video will be rejected</li>
              <li>Admins decide who won — false reports lead to a permanent ban</li>
            </ul>
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-2xl p-8 md:p-10 border-primary/20 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Section 1: Match Details */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-display font-bold">Match Details</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Who you fought and what gamemode</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="opponentUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Opponent IGN</FormLabel>
                        <FormControl>
                          <PlayerSearchInput value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormDescription className="text-xs">Pick from the suggestions for an exact match</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gamemode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                          <Gamepad2 className="w-4 h-4 text-primary" /> Gamemode
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50 border-border/50 h-14 text-base">
                              <SelectValue placeholder="Select gamemode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GAMEMODES.map(gm => (
                              <SelectItem key={gm} value={gm} className="capitalize text-base py-2.5">{gm}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">The kit/ruleset you played</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-t border-border/50" />

              {/* Section 2: Evidence */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Video className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-display font-bold">Video Evidence</h2>
                  <span className="text-red-400 text-xs font-semibold ml-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">REQUIRED</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Paste a public link to the full match recording</p>

                <FormField
                  control={form.control}
                  name="evidence"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                          <Input
                            placeholder="https://youtube.com/watch?v=... or https://medal.tv/..."
                            {...field}
                            className="bg-background/50 border-border/50 pl-11 h-14 text-base"
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-xs text-muted-foreground mr-1">Accepted:</span>
                        {["YouTube", "Medal.tv", "Streamable", "Twitch Clips"].map(p => (
                          <Badge key={p} variant="outline" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> {p}
                          </Badge>
                        ))}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/20 border border-border text-sm text-muted-foreground">
                <Clock className="w-5 h-5 shrink-0 text-primary" />
                <span>Submissions are usually reviewed within <strong className="text-foreground">24 hours</strong>. The admin will pick the winner based on your video evidence.</span>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-base font-bold tracking-wide"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Match for Review"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
