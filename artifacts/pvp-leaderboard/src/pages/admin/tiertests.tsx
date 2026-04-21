import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, ChevronLeft, ChevronRight, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

async function fetchApplications(page: number, status: string) {
  const token = localStorage.getItem("pvp_token");
  const params = new URLSearchParams({ page: String(page), status });
  const res = await fetch(apiUrl(`/api/tier-test?${params}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    in_queue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    approved: "bg-green-500/10 text-green-400 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  };
  const label: Record<string, string> = {
    pending: "Pending", in_queue: "In Queue", approved: "Approved", rejected: "Rejected",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded font-bold uppercase border ${map[status] || ""}`}>
      {label[status] || status}
    </span>
  );
}

export default function AdminTierTests() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [processing, setProcessing] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-tier-tests", page, status],
    queryFn: () => fetchApplications(page, status),
  });

  const callAction = async (id: string, action: "queue" | "approve" | "reject", body: object = {}) => {
    setProcessing(id);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/tier-test/${id}/${action}`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.success) {
        refetch();
        return true;
      } else {
        toast.error(d.message || `Failed to ${action}`);
        return false;
      }
    } catch {
      toast.error("Network error");
      return false;
    } finally {
      setProcessing(null);
    }
  };

  const handleQueue = async (app: any) => {
    const tester = prompt(`Accept ${app.applicantUsername}'s application and move to queue?\nEnter tier tester's IGN to assign (optional):`);
    if (tester === null) return;
    const ok = await callAction(app.id, "queue", { assignedTester: tester || null });
    if (ok) toast.success(`${app.applicantUsername} moved to queue. A tier tester will be assigned.`);
  };

  const handleApprove = async (app: any) => {
    const reviewNote = prompt(`Approve ${app.applicantUsername} for ${app.requestedTier}? Add a note (optional):`);
    if (reviewNote === null) return;
    const ok = await callAction(app.id, "approve", { reviewNote });
    if (ok) toast.success(`Approved! ${app.applicantUsername} is now ${app.requestedTier}`);
  };

  const handleReject = async (app: any) => {
    const reviewNote = prompt(`Reason for rejecting ${app.applicantUsername}'s application (optional):`);
    if (reviewNote === null) return;
    const ok = await callAction(app.id, "reject", { reviewNote });
    if (ok) toast.success(`Rejected ${app.applicantUsername}'s tier test application.`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-7 h-7 text-primary" />
              Tier Test Applications
            </h1>
            <p className="text-muted-foreground">Review and manage player tier test requests.</p>
          </div>

          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_queue">In Queue</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Applicant</TableHead>
                <TableHead>IGN</TableHead>
                <TableHead>Tier Change</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-6 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (data?.applications ?? []).length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No {status !== "all" ? status.replace("_", " ") : ""} applications found.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.applications ?? []).map((app: any) => (
                  <TableRow key={app.id} className="border-border hover:bg-muted/20">
                    <TableCell>
                      <div className="font-bold text-sm">{app.applicantUsername}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{app.minecraftUsername}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground">{app.currentTier}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-primary font-bold">{app.requestedTier}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      {app.notes ? (
                        <span className="text-xs text-muted-foreground truncate block">{app.notes}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        {statusBadge(app.status)}
                        {app.assignedTester && (
                          <div className="text-xs text-blue-400 mt-1">Tester: {app.assignedTester}</div>
                        )}
                        {app.reviewNote && (
                          <div className="text-xs text-muted-foreground mt-1 max-w-[140px] truncate">{app.reviewNote}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {app.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                              onClick={() => handleQueue(app)}
                              disabled={processing === app.id}
                              title="Accept and move to queue"
                            >
                              <Users className="w-3 h-3 mr-1" /> Queue
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              onClick={() => handleReject(app)}
                              disabled={processing === app.id}
                            >
                              <X className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {app.status === "in_queue" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              onClick={() => handleApprove(app)}
                              disabled={processing === app.id}
                            >
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              onClick={() => handleReject(app)}
                              disabled={processing === app.id}
                            >
                              <X className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {(app.status === "approved" || app.status === "rejected") && (
                          <span className="text-xs text-muted-foreground italic">Closed</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </p>
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
      </div>
    </AdminLayout>
  );
}
