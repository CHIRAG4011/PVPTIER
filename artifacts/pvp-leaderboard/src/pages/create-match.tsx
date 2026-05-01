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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Swords, Search, AlertCircle, Server, Clock, Video, ShieldAlert, Users, Gamepad2, FileText, Send } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useState, useEffect, useRef } from "react";

const GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];

const schema = z.object({
  opponentUsername: z.string().min(1, "Opponent IGN is required"),
  gamemode: z.string().min(1, "Gamemode is required"),
  server: z.string().min(1, "Server (IP / name) is required"),
  scheduledTime: z.string().min(1, "Scheduled time is required"),
  notes: z.string().max(500).optional(),
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
              No players found — they must be registered.
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

function defaultDateTime(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateMatch() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated) { setLocation("/login"); return null; }

  const prefilledOpponent = new URLSearchParams(window.location.search).get("opponent") || "";

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      opponentUsername: prefilledOpponent,
      gamemode: "",
      server: "",
      scheduledTime: defaultDateTime(),
      notes: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setSubmitting(true);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl("/api/challenges"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...values,
          scheduledTime: new Date(values.scheduledTime).toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Challenge sent! The opponent has been notified.");
        setLocation("/my-challenges");
      } else {
        toast.error(data.message || "Failed to create match");
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
            Create a Match
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Challenge another player. They'll be notified with the server and scheduled time, and can accept or decline.
          </p>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-5 mb-8 flex gap-4 text-sm">
          <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">
            <p className="font-bold mb-1.5 text-red-300 text-base">Video recording is mandatory</p>
            <p className="text-red-200/80">After the match, the winner must upload a full video of the fight on the Submit Match page. Matches without video evidence won't count toward Score.</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-2xl p-8 md:p-10 border-primary/20 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Section 1: Opponent */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-display font-bold">Pick your opponent</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Search registered players by Minecraft IGN</p>

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
              </div>

              <div className="border-t border-border/50" />

              {/* Section 2: Match settings */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-display font-bold">Match settings</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Choose a gamemode and when you want to play</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="gamemode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Gamemode</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduledTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-primary" /> Scheduled time
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} className="bg-background/50 border-border/50 h-14 text-base" />
                        </FormControl>
                        <FormDescription className="text-xs">In your local timezone</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-t border-border/50" />

              {/* Section 3: Server */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-display font-bold">Where you'll fight</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Server address and any extra details</p>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="server"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Server (IP or name)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                            <Input
                              placeholder="e.g. play.minemen.club or 1.2.3.4:25565"
                              {...field}
                              className="bg-background/50 border-border/50 pl-11 h-14 text-base"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-primary" /> Notes
                          <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Anything the opponent should know — kit, ruleset, best of N, etc."
                            {...field}
                            className="bg-background/50 border-border/50 min-h-[110px] text-base"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">Up to 500 characters</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/20 border border-border text-sm text-muted-foreground">
                <Video className="w-5 h-5 shrink-0 text-primary" />
                <span>Once your opponent accepts, play the match and submit your video on the <strong className="text-foreground">Submit Match</strong> page.</span>
              </div>

              <Button type="submit" className="w-full h-14 text-base font-bold tracking-wide" disabled={submitting}>
                <Send className="w-4 h-4 mr-2" />
                {submitting ? "Sending challenge..." : "Send Challenge"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
