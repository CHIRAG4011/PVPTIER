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
import { Trophy, Search, ChevronLeft, ChevronRight, Crown, Medal, Award, Zap, TrendingUp, Users, Swords } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];
const TIERS = ["HT1", "HT2", "HT3", "HT4", "HT5", "LT1", "LT2", "LT3", "LT4", "LT5"];

function tierRank(tier?: string | null): number {
  if (!tier) return 999;
  const isHigh = tier.startsWith("HT");
  const num = parseInt(tier.replace(/\D/g, ""), 10) || 5;
  return (isHigh ? 0 : 5) + num;
}

function TopGamemodes({ stats }: { stats: { gamemode: string; tier?: string | null }[] }) {
  const ranked = stats
    .filter(s => s.tier)
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier))
    .slice(0, 4);

  if (ranked.length === 0) {
    return <span className="text-xs text-muted-foreground/60">—</span>;
  }

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      {ranked.map(s => (
        <div
          key={s.gamemode}
          className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-muted/30 border border-border/50"
          title={`${s.gamemode}: ${s.tier}`}
        >
          <GamemodeIcon gamemode={s.gamemode} className="w-3.5 h-3.5" />
          <TierBadge tier={s.tier as string} size="sm" showGlow={false} />
        </div>
      ))}
    </div>
  );
}

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
      <div className="relative">
        {/* Ambient grid + glow background */}
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full" />
        <div className="pointer-events-none absolute top-40 right-0 w-[400px] h-[400px] bg-accent/5 blur-[120px] rounded-full" />

        <div className="container relative mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 animate-row-rise">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/40 flex items-center justify-center animate-pulse-glow">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Live Rankings</span>
            </div>
            <h1 className="text-5xl font-display font-bold mb-2 shimmer-text leading-tight">Global Leaderboard</h1>
            <p className="text-muted-foreground">The most elite players, ranked by Score across all gamemodes.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 glass-card p-2 rounded-xl w-full md:w-auto">
            {GAMEMODES.map((gm) => (
              <Button
                key={gm}
                variant={gamemode === gm ? "secondary" : "ghost"}
                size="sm"
                className={`capitalize transition-all duration-300 ${gamemode === gm ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)] scale-105" : "hover:scale-105"}`}
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
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 block flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary" /> Platform Stats
                </label>
                {summaryLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : summary ? (
                  <div className="space-y-3 text-sm">
                    <StatTile icon={<Users className="w-4 h-4" />} label="Total Players" value={summary.totalPlayers.toLocaleString()} />
                    <StatTile icon={<Swords className="w-4 h-4" />} label="Matches Played" value={summary.totalMatches.toLocaleString()} />
                    <StatTile icon={<TrendingUp className="w-4 h-4" />} label="Highest Score" value={summary.highestElo.toLocaleString()} highlight />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="glass-card rounded-xl overflow-hidden border-border relative">
              {/* corner accents */}
              <div className="pointer-events-none absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-primary/40 rounded-tl-xl" />
              <div className="pointer-events-none absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary/40 rounded-tr-xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-primary/40 rounded-bl-xl" />
              <div className="pointer-events-none absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-primary/40 rounded-br-xl" />

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left table-fixed">
                  <colgroup>
                    <col className="w-[80px]" />
                    <col />
                    <col className="w-[110px]" />
                    <col className="w-[140px]" />
                    <col className="w-[90px]" />
                    <col className="w-[110px]" />
                  </colgroup>
                  <thead className="text-xs uppercase bg-gradient-to-r from-muted/40 via-primary/5 to-muted/40 text-muted-foreground border-b border-primary/20">
                    <tr>
                      <th className="px-4 py-4 font-bold tracking-widest text-center">Rank</th>
                      <th className="px-4 py-4 font-bold tracking-widest">Player</th>
                      <th className="px-4 py-4 font-bold tracking-widest text-center">Score</th>
                      <th className="px-4 py-4 font-bold tracking-widest text-center">W / L</th>
                      <th className="px-4 py-4 font-bold tracking-widest text-center">Region</th>
                      <th className="px-4 py-4 font-bold tracking-widest text-center">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {leaderboardLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-4"><Skeleton className="h-10 w-10 rounded-xl mx-auto" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-8 w-32" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-6 w-16 mx-auto" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-6 w-20 mx-auto" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-6 w-12 mx-auto" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-6 w-16 mx-auto" /></td>
                        </tr>
                      ))
                    ) : leaderboard?.entries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          No players found for these filters.
                        </td>
                      </tr>
                    ) : (
                      leaderboard?.entries.map((entry, i) => {
                        const isTop = entry.rank <= 3;
                        const rowAccent =
                          entry.rank === 1 ? 'before:bg-yellow-500' :
                          entry.rank === 2 ? 'before:bg-gray-300' :
                          entry.rank === 3 ? 'before:bg-amber-600' :
                          'before:bg-transparent';
                        return (
                        <tr
                          key={entry.player.id}
                          className={`relative hover:bg-primary/5 transition-all duration-300 group scanline-overlay animate-row-rise before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r ${rowAccent} ${isTop ? 'bg-gradient-to-r from-primary/[0.04] to-transparent' : ''}`}
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex"><RankBadge rank={entry.rank} /></div>
                          </td>
                          <td className="px-4 py-4">
                            <Link href={`/player/${entry.player.id}`} className="flex items-center gap-3 transition-all min-w-0">
                              <div className={`relative shrink-0 ${isTop ? 'holo-ring rounded-full' : ''}`}>
                                <Avatar className={`h-10 w-10 border transition-all ${isTop ? 'border-primary/60 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.6)]' : 'border-border group-hover:border-primary'}`}>
                                  <AvatarImage src={`https://mc-heads.net/avatar/${entry.player.minecraftUsername}/64`} />
                                  <AvatarFallback>{entry.player.minecraftUsername.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-base group-hover:text-primary transition-colors leading-tight truncate">{entry.player.minecraftUsername}</span>
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-mono">#{String(entry.rank).padStart(4, '0')}</span>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`font-mono font-bold text-xl leading-none ${isTop ? 'shimmer-text' : 'text-primary neon-text-primary'}`}>
                                {entry.elo.toLocaleString()}
                              </span>
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-mono mt-1">SCORE</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/20 border border-border/50">
                              <span className="text-green-400 font-bold font-mono text-sm">{entry.wins}<span className="text-[10px] ml-0.5 opacity-70">W</span></span>
                              <span className="text-muted-foreground/40">/</span>
                              <span className="text-red-400 font-bold font-mono text-sm">{entry.losses}<span className="text-[10px] ml-0.5 opacity-70">L</span></span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-muted/30 border border-border/50 text-xs font-mono font-bold tracking-wider uppercase text-foreground">
                              {(entry.player as any).region ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {(() => {
                              const gmTier = ((entry.player as any).gamemodeStats ?? []).find((s: any) => s.gamemode === gamemode)?.tier;
                              return gmTier
                                ? <TierBadge tier={gmTier} />
                                : <span className="text-xs text-muted-foreground/60">—</span>;
                            })()}
                          </td>
                        </tr>
                      );})
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
      </div>
    </Layout>
  );
}

function StatTile({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`relative flex items-center justify-between p-3 rounded-lg border transition-all duration-300 hover:scale-[1.02] hover:border-primary/40 ${highlight ? 'bg-primary/5 border-primary/30' : 'bg-muted/20 border-border/50'}`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${highlight ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground'}`}>
          {icon}
        </div>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <span className={`font-mono font-bold text-base ${highlight ? 'text-primary neon-text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400/30 to-yellow-600/10 border border-yellow-400/60 flex flex-col items-center justify-center shadow-[0_0_18px_rgba(234,179,8,0.45)] animate-pulse-glow leading-none">
        <Crown className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-mono font-bold text-yellow-300 mt-0.5">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-gray-200/25 to-gray-400/10 border border-gray-300/50 flex flex-col items-center justify-center shadow-[0_0_12px_rgba(229,231,235,0.25)] leading-none">
        <Medal className="w-4 h-4 text-gray-200" />
        <span className="text-sm font-mono font-bold text-gray-100 mt-0.5">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600/25 to-amber-800/10 border border-amber-600/50 flex flex-col items-center justify-center shadow-[0_0_12px_rgba(217,119,6,0.3)] leading-none">
        <Award className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-mono font-bold text-amber-400 mt-0.5">3</span>
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center font-mono font-bold text-base text-foreground group-hover:border-primary/60 group-hover:text-primary group-hover:shadow-[0_0_10px_-2px_hsl(var(--primary)/0.5)] transition-all">
      {rank}
    </div>
  );
}
