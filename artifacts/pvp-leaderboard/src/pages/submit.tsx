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
import { Swords, ShieldAlert, Search, Video, Trophy, Clock, AlertCircle, Gavel } from "lucide-react";
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
              No players found — they must be registered in the system.
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
                    <div>
                      <span className="font-semibold">{player.minecraftUsername}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs font-mono">{player.tier}</Badge>
                    <span>{player.elo} Score</span>
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
  { icon: Swords, label: "Play Match" },
  { icon: Video, label: "Record Video" },
  { icon: Trophy, label: "Upload Evidence" },
  { icon: Gavel, label: "Admin Decides Winner" },
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
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold neon-text-primary mb-2 flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" />
            Submit Match Result
          </h1>
          <p className="text-muted-foreground">
            Upload your match video. Admins will watch the video and decide the winner — you don't pick the result yourself.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                i === 2 ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted/20 text-muted-foreground"
              }`}>
                <step.icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-muted-foreground leading-tight">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Mandatory Evidence Notice */}
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4 mb-6 flex gap-3 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
          <div>
            <p className="font-bold mb-1 text-red-300">Video recording is REQUIRED</p>
            <ul className="text-red-200/80 space-y-0.5 list-disc list-inside">
              <li>Upload a full video clip to YouTube, Medal, Streamable, or Twitch Clips</li>
              <li>The video must clearly show both players and the final result</li>
              <li>Submissions without a valid video will be rejected</li>
              <li>Admins decide who won — false reports lead to a permanent ban</li>
            </ul>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8 border-primary/20">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              </div>

              <FormField
                control={form.control}
                name="evidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-primary" />
                      Video URL
                      <span className="text-red-400 text-xs font-normal ml-1">(Required)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/... or https://medal.tv/..."
                        {...field}
                        className="bg-background/50 border-border/50"
                      />
                    </FormControl>
                    <FormDescription>
                      YouTube, Medal, Streamable, or Twitch clip link. The admin watches this to decide who won.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Submissions are usually reviewed within 24 hours. The admin will pick the winner based on the video.</span>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold"
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
