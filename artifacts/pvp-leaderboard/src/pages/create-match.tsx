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
import { Swords, Search, AlertCircle, Server, Clock, Video, ShieldAlert } from "lucide-react";
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Start typing their Minecraft IGN..."
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          className="bg-background/50 border-border/50 pl-9"
          autoComplete="off"
        />
      </div>
      {showSuggestions && query.length >= 2 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {searching ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
          ) : suggestions.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              No players found — they must be registered.
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto">
              {suggestions.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center justify-between transition-colors border-b border-border/50 last:border-0"
                  onClick={() => handleSelect(player)}
                >
                  <div className="flex items-center gap-2.5">
                    <img src={`https://mc-heads.net/avatar/${player.minecraftUsername}/24`} className="w-6 h-6 rounded" alt="" />
                    <span className="font-semibold">{player.minecraftUsername}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs font-mono">{player.tier}</Badge>
                    <span>{player.elo} ELO</span>
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

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      opponentUsername: "",
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
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold neon-text-primary mb-2 flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" />
            Create a Match
          </h1>
          <p className="text-muted-foreground">
            Challenge another player. They'll be notified with the server and time, and can accept or decline.
          </p>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4 mb-6 flex gap-3 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
          <div>
            <p className="font-bold mb-1 text-red-300">Video recording is mandatory</p>
            <p className="text-red-200/80">After the match, the winner must upload a full video of the fight. Matches without video evidence won't count toward ELO.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8 border-primary/20">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="opponentUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opponent</FormLabel>
                    <FormControl>
                      <PlayerSearchInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription className="text-xs">Search by Minecraft IGN</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="gamemode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gamemode</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Select gamemode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GAMEMODES.map(gm => (
                            <SelectItem key={gm} value={gm} className="capitalize">{gm}</SelectItem>
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
                      <FormLabel className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary" /> Scheduled time
                      </FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} className="bg-background/50 border-border/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="server"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-primary" /> Server (IP or name)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. play.minemen.club or 1.2.3.4:25565" {...field} className="bg-background/50 border-border/50" />
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
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Anything the opponent should know — kit, ruleset, best of N, etc."
                        {...field}
                        className="bg-background/50 border-border/50 min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
                <Video className="w-4 h-4 shrink-0 text-primary" />
                <span>Once your opponent accepts, play the match and submit your video on the Submit Match page.</span>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={submitting}>
                {submitting ? "Sending challenge..." : "Send Challenge"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
