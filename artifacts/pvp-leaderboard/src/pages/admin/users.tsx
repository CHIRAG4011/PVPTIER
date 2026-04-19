import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminListUsers, useBanUser, useUnbanUser, useUpdateUserRole } from "@workspace/api-client-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Shield, Ban, ShieldAlert, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const { data, isLoading, refetch } = useAdminListUsers({ 
    page, 
    search: search || undefined, 
    role: role !== "all" ? role : undefined 
  });

  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const roleMutation = useUpdateUserRole();

  const handleBan = (id: number, username: string) => {
    const reason = prompt(`Reason for banning ${username}?`);
    if (reason) {
      banMutation.mutate({ id, data: { reason } }, {
        onSuccess: () => {
          toast.success(`${username} has been banned.`);
          refetch();
        }
      });
    }
  };

  const handleUnban = (id: number, username: string) => {
    if (confirm(`Are you sure you want to unban ${username}?`)) {
      unbanMutation.mutate({ id }, {
        onSuccess: () => {
          toast.success(`${username} has been unbanned.`);
          refetch();
        }
      });
    }
  };

  const handleRoleChange = (id: number, username: string, newRole: "user" | "moderator" | "admin" | "superadmin") => {
    if (confirm(`Change ${username}'s role to ${newRole}?`)) {
      roleMutation.mutate({ id, data: { role: newRole } }, {
        onSuccess: () => {
          toast.success(`${username}'s role updated to ${newRole}.`);
          refetch();
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage platform users, roles, and bans.</p>
        </div>

        <div className="glass-card p-4 rounded-xl border-border flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by username, email, discord..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-background/50 border-border/50"
            />
          </div>
          <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[200px] bg-background/50 border-border/50">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="moderator">Moderators</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="superadmin">Superadmins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Minecraft IGN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.users.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.users.map((u) => (
                  <TableRow key={u.id} className="border-border hover:bg-muted/20">
                    <TableCell>
                      <div className="font-bold">{u.username}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider ${
                        u.role === 'superadmin' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                        u.role === 'admin' ? 'bg-primary/20 text-primary border border-primary/30' :
                        u.role === 'moderator' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                        'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      {u.minecraftUsername || <span className="text-muted-foreground italic">Not linked</span>}
                    </TableCell>
                    <TableCell>
                      {u.isBanned ? (
                        <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                          <Ban className="w-3 h-3" /> Banned
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Manage</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.isBanned ? (
                            <DropdownMenuItem onClick={() => handleUnban(u.id, u.username)} className="text-green-400">
                              <CheckCircle className="w-4 h-4 mr-2" /> Unban User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleBan(u.id, u.username)} className="text-destructive">
                              <Ban className="w-4 h-4 mr-2" /> Ban User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRoleChange(u.id, u.username, 'user')}>Set as User</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(u.id, u.username, 'moderator')}>Set as Moderator</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(u.id, u.username, 'admin')}>Set as Admin</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
              <p className="text-sm text-muted-foreground">
                Showing page {data.page} of {data.totalPages}
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
