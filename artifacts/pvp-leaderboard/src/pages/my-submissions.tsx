import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import {
  Send,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Trophy,
  Swords,
  Video,
  Hourglass,
  Plus,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: any; label: string }> = {
    pending: {
      cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      Icon: Hourglass,
      label: "Pending Review",
    },
    approved: {
      cls: "bg-green-500/15 text-green-300 border-green-500/30",
      Icon: CheckCircle2,
      label: "Approved",
    },
    rejected: {
      cls: "bg-red-500/15 text-red-300 border-red-500/30",
      Icon: XCircle,
      label: "Rejected",
    },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.cls}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function ResultBadge({ result, side }: { result: string | null; side: "sent" | "received" }) {
  if (!result) return null;
  // For sent: result is from submitter perspective. For received: invert.
  const won =
    side === "sent" ? result === "win" : result === "loss";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${
        won
          ? "bg-green-500/15 text-green-300 border border-green-500/30"
          : "bg-red-500/15 text-red-300 border border-red-500/30"
      }`}
    >
      <Trophy className="w-3 h-3" />
      {won ? "You Won" : "You Lost"}
    </span>
  );
}

function SubmissionCard({ s, side }: { s: any; side: "sent" | "received" }) {
  const otherUsername = side === "sent" ? s.opponentUsername : s.submitterUsername;
  const subtitle =
    side === "sent" ? `Reported against ${otherUsername}` : `Reported by ${otherUsername}`;

  return (
    <div className="glass-card rounded-xl p-5 border-border hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <img
            src={`https://mc-heads.net/avatar/${otherUsername}/56`}
            className="w-12 h-12 rounded-md shrink-0"
            alt=""
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-bold text-foreground text-base">{otherUsername}</span>
              <StatusBadge status={s.status} />
              <ResultBadge result={s.result} side={side} />
            </div>
            <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <GamemodeIcon gamemode={s.gamemode} size={14} />
                <span className="capitalize">{s.gamemode}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(s.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {s.evidence && (
          <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0">
            <a href={s.evidence} target="_blank" rel="noopener noreferrer">
              <Video className="w-3.5 h-3.5" /> Watch
              <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        )}
      </div>

      {s.status === "pending" && (
        <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1.5">
          <Hourglass className="w-3.5 h-3.5 text-yellow-400" />
          Waiting for an admin to review the video and decide the winner.
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  Icon,
  color,
}: {
  label: string;
  value: number;
  Icon: any;
  color: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 border-border flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-display font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

export default function MySubmissions() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const { data, isLoading } = useQuery<{ sent: any[]; received: any[] }>({
    queryKey: ["my-submissions"],
    queryFn: async () => {
      const token = localStorage.getItem("pvp_token");
      const res = await fetch(apiUrl("/api/submissions/mine"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const sent = data?.sent || [];
  const received = data?.received || [];
  const all = [...sent, ...received];

  const counts = {
    pending: all.filter((s) => s.status === "pending").length,
    approved: all.filter((s) => s.status === "approved").length,
    rejected: all.filter((s) => s.status === "rejected").length,
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-display font-bold neon-text-primary mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              My Submissions
            </h1>
            <p className="text-muted-foreground">
              Track the progress of every match you've reported or been reported in.
            </p>
          </div>
          <Button asChild className="gap-1.5">
            <Link href="/submit">
              <Plus className="w-4 h-4" /> Submit Match
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatTile
            label="Pending Review"
            value={counts.pending}
            Icon={Hourglass}
            color="bg-yellow-500/15 text-yellow-400"
          />
          <StatTile
            label="Approved"
            value={counts.approved}
            Icon={CheckCircle2}
            color="bg-green-500/15 text-green-400"
          />
          <StatTile
            label="Rejected"
            value={counts.rejected}
            Icon={XCircle}
            color="bg-red-500/15 text-red-400"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sent">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="sent" className="gap-2">
              <Send className="w-4 h-4" /> Sent
              <span className="ml-1 text-xs bg-muted text-foreground rounded-full px-2 py-0.5">
                {sent.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="received" className="gap-2">
              <Inbox className="w-4 h-4" /> Reported Against Me
              <span className="ml-1 text-xs bg-muted text-foreground rounded-full px-2 py-0.5">
                {received.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : sent.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center border-border">
                <Swords className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">
                  You haven't submitted any matches yet.
                </p>
                <Button asChild>
                  <Link href="/submit">Submit your first match</Link>
                </Button>
              </div>
            ) : (
              sent.map((s) => <SubmissionCard key={s.id} s={s} side="sent" />)
            )}
          </TabsContent>

          <TabsContent value="received" className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : received.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center text-muted-foreground border-border">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                No one has reported a match against you yet.
              </div>
            ) : (
              received.map((s) => <SubmissionCard key={s.id} s={s} side="received" />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
