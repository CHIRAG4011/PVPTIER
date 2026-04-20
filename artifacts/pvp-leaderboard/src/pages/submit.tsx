import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateSubmission } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Swords, ShieldAlert, Search } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useState, useEffect, useRef } from "react";

const GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];

const submissionSchema = z.object({
  opponentUsername: z.string().min(1, { message: "Opponent IGN is required" }),
  gamemode: z.string().min(1, { message: "Gamemode is required" }),
  result: z.enum(["win", "loss"], { required_error: "Result is required" }),
  evidence: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal("")),
});

function PlayerSearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(apiUrl(`/api/players/search?q=${encodeURIComponent(query)}`));
        const data = await res.json();
        setSuggestions(data.players || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (player: any) => {
    setQuery(player.minecraftUsername);
    onChange(player.minecraftUsername);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setShowSuggestions(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Start typing their Minecraft IGN..."
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          className="bg-background/50 border-border/50 pl-9"
          autoComplete="off"
        />
      </div>
      {showSuggestions && (query.length >= 2) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {searching ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
          ) : suggestions.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No players found with that IGN. Make sure they are registered in the system.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 flex items-center justify-between transition-colors"
                  onClick={() => handleSelect(player)}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://mc-heads.net/avatar/${player.minecraftUsername}/20`}
                      className="w-5 h-5 rounded"
                      alt=""
                    />
                    <span className="font-medium">{player.minecraftUsername}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{player.tier} · {player.elo} ELO</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SubmitMatch() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const submitMutation = useCreateSubmission();

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      opponentUsername: "",
      gamemode: "",
      result: "win",
      evidence: "",
    },
  });

  const onSubmit = (values: z.infer<typeof submissionSchema>) => {
    submitMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Match submitted successfully! Waiting for admin approval.");
        form.reset();
        setLocation("/player/" + user?.id);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to submit match");
      }
    });
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
            Report a ranked match result. All submissions are reviewed by moderators.
            False reports may result in a ban.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8 border-primary/20">
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 rounded-lg p-4 mb-6 flex gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Evidence strongly recommended</p>
              <p className="text-yellow-200/80">
                While not strictly required, providing a screenshot or video link of the match result 
                significantly speeds up the approval process and protects you from counter-claims.
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="opponentUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opponent Minecraft IGN</FormLabel>
                      <FormControl>
                        <PlayerSearchInput
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Search for your opponent by their Minecraft IGN</FormDescription>
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
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match Result</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="win" className="text-green-400 font-bold">I Won</SelectItem>
                        <SelectItem value="loss" className="text-red-400 font-bold">I Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence Link (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://imgur.com/... or https://youtube.com/..." {...field} className="bg-background/50 border-border/50" />
                    </FormControl>
                    <FormDescription>Link to a screenshot or video proving the result.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting..." : "Submit Match"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
