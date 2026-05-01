import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Check, X, ChevronLeft, ChevronRight, Video, Image, AlertCircle, Gavel, Eye } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import { apiUrl } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function EvidenceLink({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <div className="flex items-center gap-1.5 text-red-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">No evidence</span>
      </div>
    );
  }
  const isVideo = /youtube|youtu\.be|medal\.tv|streamable|twitch|clips\.twitch/i.test(url);
  const Icon = isVideo ? Video : Image;
  const label = isVideo ? "Video" : "Screenshot";

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
    >
      <Icon className="w-3.5 h-3.5" />
      Watch {label}
      <ExternalLink className="w-3 h-3 opacity-70" />
    </a>
  );
}

async function fetchSubmissions(page: number, status: string) {
  const token = localStorage.getItem("pvp_token");
  const params = new URLSearchParams({ page: String(page) });
  if (status !== "all") params.set("status", status);
  const res = await fetch(apiUrl(`/api/submissions?${params}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export default function AdminSubmissions() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [approving, setApproving] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [chosenWinner, setChosenWinner] = useState<"submitter" | "opponent" | "">("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-submissions", page, status],
    queryFn: () => fetchSubmissions(page, status),
  });

  const handleApprove = async () => {
    if (!approving || !chosenWinner) {
      toast.error("Pick the winner first.");
      return;
    }
    setSubmitting(true);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/submissions/${approving.id}/approve`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ winner: chosenWinner }),
      });
      const body = await res.json();
      if (res.ok) {
        toast.success("Match approved — Score updated.");
        setApproving(null);
        setChosenWinner("");
        refetch();
      } else {
        toast.error(body.message || "Failed to approve");
      }
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleReject = async (id: string) => {
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/submissions/${id}/reject`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { toast.success("Submission rejected."); refetch(); }
      else toast.error("Failed to reject");
    } catch { toast.error("Network error"); }
  };

  const submissions = data?.submissions ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Match Submissions</h1>
            <p className="text-muted-foreground">
              Watch the video evidence, then choose who won. The submitter doesn't claim a result — you decide.
            </p>
          </div>

          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All Submissions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5 border-border">
                <Skeleton className="h-6 w-64 mb-3" />
                <Skeleton className="h-5 w-48" />
              </div>
            ))
          ) : submissions.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center text-muted-foreground border-border">
              No {status !== "all" ? status : ""} submissions found.
            </div>
          ) : (
            submissions.map((s: any) => (
              <div key={s.id} className="glass-card rounded-xl border-border hover:border-primary/20 transition-colors">
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 text-base">
                          <img src={`https://mc-heads.net/avatar/${s.submitterUsername}/24`} className="w-6 h-6 rounded" alt="" />
                          <span className="font-bold text-primary">{s.submitterUsername}</span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">(submitter)</span>
                        </div>
                        <span className="text-muted-foreground text-sm">vs</span>
                        <div className="flex items-center gap-2 text-base">
                          <img src={`https://mc-heads.net/avatar/${s.opponentUsername}/24`} className="w-6 h-6 rounded" alt="" />
                          <span className="font-bold">{s.opponentUsername}</span>
                        </div>
                        {s.status === "approved" && s.result && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            s.result === "win"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            Submitter {s.result === "win" ? "WON" : "LOST"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <GamemodeIcon gamemode={s.gamemode} size={14} />
                          <span className="capitalize">{s.gamemode}</span>
                        </div>
                        <span>{new Date(s.createdAt).toLocaleString()}</span>
                        {s.status !== "pending" && (
                          <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase ${
                            s.status === "approved"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}>
                            {s.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-3">
                      <EvidenceLink url={s.evidence} />

                      {s.status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="gap-1" asChild>
                            <Link href={`/admin/submissions/${s.id}`}>
                              <Eye className="w-3.5 h-3.5" /> Open & Review
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            onClick={() => { setApproving(s); setChosenWinner(""); }}
                          >
                            <Gavel className="w-3.5 h-3.5" /> Quick Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleReject(s.id)}
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1" asChild>
                          <Link href={`/admin/submissions/${s.id}`}>
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!approving} onOpenChange={o => { if (!o) { setApproving(null); setChosenWinner(""); } }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" /> Decide the winner
            </DialogTitle>
            <DialogDescription>
              Watch the video, then pick which player won. Approving updates Score automatically.
            </DialogDescription>
          </DialogHeader>
          {approving && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <EvidenceLink url={approving.evidence} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setChosenWinner("submitter")}
                  className={`py-4 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center gap-2 ${
                    chosenWinner === "submitter"
                      ? "border-green-400 bg-green-500/15 text-green-400"
                      : "border-border bg-muted/10 hover:border-green-400/50"
                  }`}
                >
                  <img src={`https://mc-heads.net/avatar/${approving.submitterUsername}/40`} className="w-10 h-10 rounded" alt="" />
                  {approving.submitterUsername}
                  <span className="text-[10px] opacity-70">SUBMITTER</span>
                </button>
                <button
                  onClick={() => setChosenWinner("opponent")}
                  className={`py-4 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center gap-2 ${
                    chosenWinner === "opponent"
                      ? "border-green-400 bg-green-500/15 text-green-400"
                      : "border-border bg-muted/10 hover:border-green-400/50"
                  }`}
                >
                  <img src={`https://mc-heads.net/avatar/${approving.opponentUsername}/40`} className="w-10 h-10 rounded" alt="" />
                  {approving.opponentUsername}
                  <span className="text-[10px] opacity-70">OPPONENT</span>
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleApprove} disabled={submitting || !chosenWinner} className="flex-1 gap-1.5">
                  <Check className="w-4 h-4" /> {submitting ? "Approving..." : "Approve & Update Score"}
                </Button>
                <Button variant="outline" onClick={() => { setApproving(null); setChosenWinner(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
