import { useState } from "react";
import { Link } from "wouter";
import { useGetLeaderboard, useGetLeaderboardSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { TierBadge } from "@/components/ui/tier-badge";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];
const TIERS = ["HT1", "HT2", "HT3", "HT4", "HT5", "LT1", "LT2", "LT3", "LT4", "LT5"];

export default function Leaderboard() {
  const [gamemode, setGamemode] = useState<string>("sword");
  const [tier, setTier] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = useGetLeaderboardSummary();
  const { data: leaderboard, isLoading: leaderboardLoading } = useGetLeaderboard({ 
    gamemode: gamemode, 
    tier: tier !== "all" ? tier : undefined,
    page,
    limit: 50 
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold neon-text-primary mb-2">Global Leaderboard</h1>
            <p className="text-muted-foreground">The most elite players sorted by ELO rating.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-card p-2 rounded-xl border border-border w-full md:w-auto">
            {GAMEMODES.map((gm) => (
              <Button
                key={gm}
                variant={gamemode === gm ? "secondary" : "ghost"}
                size="sm"
                className={`capitalize ${gamemode === gm ? "bg-primary/20 text-primary border border-primary/30" : ""}`}
                onClick={() => { setGamemode(gm); setPage(1); }}
              >
                <GamemodeIcon gamemode={gm} className="w-4 h-4 mr-2" />
                {gm}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-xl space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Filter by Tier</label>
                <Select value={tier} onValueChange={(v) => { setTier(v); setPage(1); }}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    {TIERS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-6 border-t border-border/50">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Platform Stats</label>
                {summaryLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : summary ? (
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Players</span>
                      <span className="font-bold">{summary.totalPlayers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Matches Played</span>
                      <span className="font-bold">{summary.totalMatches.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Highest ELO</span>
                      <span className="font-bold text-primary">{summary.highestElo}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="glass-card rounded-xl overflow-hidden border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-bold">Rank</th>
                      <th className="px-6 py-4 font-bold">Player</th>
                      <th className="px-6 py-4 font-bold text-right">ELO</th>
                      <th className="px-6 py-4 font-bold text-center">Tier</th>
                      <th className="px-6 py-4 font-bold text-center">W/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {leaderboardLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4"><Skeleton className="h-6 w-6 rounded-full" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-8 w-32" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-6 w-12 ml-auto" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-6 w-16 mx-auto" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-6 w-20 mx-auto" /></td>
                        </tr>
                      ))
                    ) : leaderboard?.entries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No players found for these filters.
                        </td>
                      </tr>
                    ) : (
                      leaderboard?.entries.map((entry, i) => (
                        <tr key={entry.player.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-6 py-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]' :
                              entry.rank === 2 ? 'bg-gray-300/20 text-gray-300 border border-gray-300/50' :
                              entry.rank === 3 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/50' :
                              'text-muted-foreground'
                            }`}>
                              {entry.rank}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/player/${entry.player.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                              <Avatar className="h-8 w-8 border border-border group-hover:border-primary transition-colors">
                                <AvatarImage src={`https://mc-heads.net/avatar/${entry.player.minecraftUsername}/64`} />
                                <AvatarFallback>{entry.player.minecraftUsername.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-base group-hover:text-primary transition-colors">{entry.player.minecraftUsername}</span>
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-lg text-primary">
                            {entry.elo}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <TierBadge tier={entry.tier} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-green-400 font-bold">{entry.wins}W</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-red-400 font-bold">{entry.losses}L</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {leaderboard && leaderboard.totalPages > 1 && (
                <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
                  <p className="text-sm text-muted-foreground">
                    Showing page {leaderboard.page} of {leaderboard.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === leaderboard.totalPages}
                      onClick={() => setPage(p => Math.min(leaderboard.totalPages, p + 1))}
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
