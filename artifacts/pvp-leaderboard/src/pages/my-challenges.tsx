import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, Send, Check, X, Server, Clock, MessageSquare, Swords, Video } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    accepted: "bg-green-500/15 text-green-400 border-green-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
    cancelled: "bg-muted text-muted-foreground border-border",
    completed: "bg-primary/15 text-primary border-primary/30",
  };
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${map[status] || "bg-muted"}`}>
      {status}
    </span>
  );
}

function ChallengeCard({
  c, side, onAction, onCancel,
}: {
  c: any;
  side: "incoming" | "outgoing";
  onAction?: (id: string, action: "accept" | "reject", reason?: string) => void;
  onCancel?: (id: string) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const otherUsername = side === "incoming" ? c.challengerMcUsername : c.opponentUsername;

  return (
    <div className="glass-card rounded-xl p-5 border-border">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <img src={`https://mc-heads.net/avatar/${otherUsername}/48`} className="w-12 h-12 rounded" alt="" />
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-foreground">
                {side === "incoming" ? "From" : "To"} {otherUsername}
              </span>
              <StatusBadge status={c.status} />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><GamemodeIcon gamemode={c.gamemode} size={14} /><span className="capitalize">{c.gamemode}</span></span>
              <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5" />{c.server}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(c.scheduledTime).toLocaleString()}</span>
            </div>
            {c.notes && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{c.notes}</span>
              </div>
            )}
            {c.rejectReason && (
              <div className="mt-2 text-xs text-red-300/90">
                Declined: {c.rejectReason}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {side === "incoming" && c.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => onAction?.(c.id, "accept")}>
                <Check className="w-4 h-4" /> Accept
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => setRejectOpen(true)}>
                <X className="w-4 h-4" /> Decline
              </Button>
            </div>
          )}
          {side === "outgoing" && (c.status === "pending" || c.status === "accepted") && (
            <Button size="sm" variant="outline" onClick={() => onCancel?.(c.id)}>Cancel</Button>
          )}
          {c.status === "accepted" && (
            <Button size="sm" variant="outline" asChild className="gap-1">
              <Link href="/submit"><Video className="w-4 h-4" /> Submit Video</Link>
            </Button>
          )}
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Decline Challenge</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Optional reason (e.g. busy, time doesn't work...)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="bg-background/50 min-h-[80px]"
            />
            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1" onClick={() => { onAction?.(c.id, "reject", reason); setRejectOpen(false); setReason(""); }}>
                Decline Challenge
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MyChallenges() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  if (!isAuthenticated) { setLocation("/login"); return null; }

  const { data, isLoading, refetch } = useQuery<{ incoming: any[]; outgoing: any[] }>({
    queryKey: ["my-challenges"],
    queryFn: async () => {
      const token = localStorage.getItem("pvp_token");
      const res = await fetch(apiUrl("/api/challenges/mine"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const handleAction = async (id: string, action: "accept" | "reject", reason?: string) => {
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/challenges/${id}/${action}`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: action === "reject" ? JSON.stringify({ reason }) : undefined,
      });
      const body = await res.json();
      if (res.ok) {
        toast.success(action === "accept" ? "Challenge accepted!" : "Challenge declined.");
        refetch();
      } else {
        toast.error(body.message || "Action failed");
      }
    } catch { toast.error("Network error"); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this challenge?")) return;
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/challenges/${id}/cancel`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { toast.success("Challenge cancelled."); refetch(); }
    } catch { toast.error("Network error"); }
  };

  const incoming = data?.incoming || [];
  const outgoing = data?.outgoing || [];
  const pendingIncoming = incoming.filter((c: any) => c.status === "pending").length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-display font-bold neon-text-primary mb-2 flex items-center gap-3">
              <Swords className="w-8 h-8 text-primary" />
              My Matches
            </h1>
            <p className="text-muted-foreground">Challenges you've sent and received.</p>
          </div>
          <Button asChild><Link href="/create-match">+ Create Match</Link></Button>
        </div>

        <Tabs defaultValue="incoming">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="incoming" className="gap-2">
              <Inbox className="w-4 h-4" /> Incoming
              {pendingIncoming > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">{pendingIncoming}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-2"><Send className="w-4 h-4" /> Sent</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            ) : incoming.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center text-muted-foreground border-border">
                No challenges received yet.
              </div>
            ) : incoming.map((c: any) => (
              <ChallengeCard key={c.id} c={c} side="incoming" onAction={handleAction} />
            ))}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            ) : outgoing.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center text-muted-foreground border-border">
                You haven't sent any challenges yet.
              </div>
            ) : outgoing.map((c: any) => (
              <ChallengeCard key={c.id} c={c} side="outgoing" onCancel={handleCancel} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
