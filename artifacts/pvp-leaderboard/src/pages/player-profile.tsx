import { Layout } from "@/components/layout/Layout";
import { useGetPlayer, useGetPlayerStats, useGetPlayerMatches } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trophy, Swords, MapPin, Calendar, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export default function PlayerProfile() {
  const params = useParams();
  const id = params.id || "";
  const { user, isAuthenticated } = useAuth();

  const { data: player, isLoading: playerLoading } = useGetPlayer(id as any);
  const { data: stats, isLoading: statsLoading } = useGetPlayerStats(id as any);
  const { data: matches, isLoading: matchesLoading } = useGetPlayerMatches(id as any, { limit: 10 } as any);

  if (playerLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="glass-card rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-8">
            <Skeleton className="w-32 h-32 rounded-xl" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-16 w-32 rounded-lg" />
                <Skeleton className="h-16 w-32 rounded-lg" />
                <Skeleton className="h-16 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!player) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-4xl font-display font-bold text-destructive mb-4">Player Not Found</h1>
          <p className="text-muted-foreground">The requested player could not be found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Profile Header */}
        <div className="glass-card rounded-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Avatar className="w-32 h-32 border-4 border-background shadow-xl rounded-xl relative z-10 bg-muted">
                <AvatarImage 
                  src={`https://mc-heads.net/body/${player.minecraftUsername}/128`} 
                  className="object-cover object-top"
                  style={{ imageRendering: 'pixelated' }}
                />
                <AvatarFallback className="text-4xl font-bold rounded-xl">{player.minecraftUsername.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20">
                <TierBadge tier={player.tier} size="lg" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left pt-2 md:pt-0">
              <h1 className="text-4xl font-display font-bold text-foreground mb-2 flex items-center justify-center md:justify-start gap-3">
                {player.minecraftUsername}
                {player.badges?.map(badge => (
                  <span key={badge} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-mono uppercase tracking-wider border border-primary/30">
                    {badge}
                  </span>
                ))}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-6">
                {player.discordUsername && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#5865F2]">Discord:</span>
                    <span className="text-foreground">{player.discordUsername}</span>
                  </div>
                )}
                {player.region && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span className="text-foreground">{player.region}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(player.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="bg-background/50 border border-border rounded-lg p-3 min-w-[120px] text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Global ELO</p>
                  <p className="text-2xl font-bold font-mono text-primary">{player.elo}</p>
                </div>
                <div className="bg-background/50 border border-border rounded-lg p-3 min-w-[120px] text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Win/Loss</p>
                  <p className="text-2xl font-bold font-mono">
                    <span className="text-green-400">{player.wins}</span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className="text-red-400">{player.losses}</span>
                  </p>
                </div>
                <div className="bg-background/50 border border-border rounded-lg p-3 min-w-[120px] text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Win Streak</p>
                  <p className="text-2xl font-bold font-mono text-accent flex items-center justify-center gap-1">
                    {player.winStreak} <Activity className="w-5 h-5" />
                  </p>
                </div>
              </div>

              {isAuthenticated && user?.id !== id && (
                <div className="flex gap-3 mt-4 justify-center md:justify-start">
                  <Button asChild className="gap-2" size="sm">
                    <Link href={`/submit?opponent=${encodeURIComponent(player.minecraftUsername)}`}>
                      <Swords className="w-4 h-4" />
                      Challenge {player.minecraftUsername}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gamemode Stats */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Gamemode Stats
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {statsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              ) : stats?.gamemodeStats?.length === 0 ? (
                <div className="col-span-2 glass-card p-8 text-center text-muted-foreground rounded-xl">
                  No gamemode stats available.
                </div>
              ) : (
                stats?.gamemodeStats.map(stat => (
                  <div key={stat.gamemode} className="glass-card rounded-xl p-5 border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <GamemodeIcon gamemode={stat.gamemode} size={20} />
                        </div>
                        <h3 className="font-bold text-lg capitalize">{stat.gamemode}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground block">ELO</span>
                        <span className="font-bold font-mono text-primary text-lg">{stat.elo}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center text-sm border-t border-border/50 pt-4">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">W/L</span>
                        <span className="font-bold">{stat.wins}-{stat.losses}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Win Rate</span>
                        <span className="font-bold">{(stat.winRate * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">K/D</span>
                        <span className="font-bold">{stat.kd.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Matches */}
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <Swords className="w-6 h-6 text-primary" />
              Recent Matches
            </h2>
            
            <div className="glass-card rounded-xl overflow-hidden border-border">
              {matchesLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : matches?.matches?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No recent matches found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {matches?.matches.map(match => {
                    const isWinner = match.winnerId === player.id;
                    const opponentName = isWinner ? match.loserUsername : match.winnerUsername;
                    
                    return (
                      <div key={match.id} className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded flex items-center justify-center shrink-0",
                            isWinner ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                          )}>
                            {isWinner ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-sm">
                              <GamemodeIcon gamemode={match.gamemode} size={12} />
                              <span className="text-muted-foreground">vs</span>
                              <span className="font-bold text-foreground">{opponentName}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(match.playedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          "font-mono font-bold text-sm",
                          isWinner ? "text-green-400" : "text-red-400"
                        )}>
                          {isWinner ? "+" : ""}{match.eloChange}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
