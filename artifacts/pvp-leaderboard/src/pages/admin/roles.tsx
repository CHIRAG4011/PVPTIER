import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Shield, Users, ChevronDown, ChevronRight } from "lucide-react";
import { apiUrl } from "@/lib/api";

const PERMISSION_GROUPS: Record<string, string[]> = {
  "User Management": ["users.view","users.create","users.edit","users.delete","users.ban","users.unban","users.view_email","users.change_role","users.assign_custom_role","users.view_profile"],
  "Player Management": ["players.view","players.create","players.edit","players.delete","players.reset_stats","players.edit_elo","players.edit_tier","players.edit_wins","players.edit_losses","players.edit_streak","players.view_stats"],
  "Match Management": ["matches.view","matches.create","matches.delete","matches.edit","matches.approve","matches.reject"],
  "Submission Management": ["submissions.view","submissions.create","submissions.approve","submissions.reject","submissions.delete","submissions.view_evidence"],
  "Ticket Management": ["tickets.view","tickets.create","tickets.reply","tickets.close","tickets.delete","tickets.reassign","tickets.view_private"],
  "Announcements": ["announcements.view","announcements.create","announcements.edit","announcements.delete","announcements.pin","announcements.publish"],
  "Season Management": ["seasons.view","seasons.create","seasons.edit","seasons.delete","seasons.reset","seasons.end"],
  "Role Management": ["roles.view","roles.create","roles.edit","roles.delete","roles.assign","roles.revoke","roles.edit_permissions"],
  "Site Settings": ["settings.view","settings.edit_general","settings.edit_homepage","settings.edit_server_ip","settings.edit_discord","settings.edit_leaderboard","settings.edit_theme","settings.edit_social"],
  "Admin Panel": ["admin.access","admin.view_analytics","admin.view_logs","admin.delete_logs","admin.manage_bans","admin.export_data"],
  "Moderation": ["mod.mute","mod.kick","mod.warn","mod.view_reports","mod.handle_reports"],
};

const ALL_PERMS = Object.values(PERMISSION_GROUPS).flat();

type Role = {
  id: number;
  name: string;
  color: string;
  icon: string;
  permissions: string[];
  memberCount: number;
  createdAt: string;
};

async function apiRequest(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("pvp_token");
  const res = await fetch(apiUrl(`/api${path}`), {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Request failed with status ${res.status}`);
  }
  return data;
}

function RoleDialog({ role, onSave, onClose }: { role?: Role; onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState(role?.name || "");
  const [color, setColor] = useState(role?.color || "#00D4FF");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || []);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const togglePerm = (perm: string) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const toggleGroup = (group: string, perms: string[]) => {
    const allChecked = perms.every(p => permissions.includes(p));
    if (allChecked) {
      setPermissions(prev => prev.filter(p => !perms.includes(p)));
    } else {
      setPermissions(prev => [...new Set([...prev, ...perms])]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Role name is required"); return; }
    setSaving(true);
    try {
      if (role) {
        await apiRequest("PATCH", `/admin/roles/${role.id}`, { name, color, permissions });
      } else {
        await apiRequest("POST", "/admin/roles", { name, color, permissions });
      }
      toast.success(role ? "Role updated" : "Role created");
      onSave();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Role Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Senior Moderator" className="bg-background/50 border-border/50" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Color</label>
          <div className="flex gap-2">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent" />
            <Input value={color} onChange={e => setColor(e.target.value)} className="flex-1 bg-background/50 border-border/50 font-mono" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Permissions ({permissions.length}/{ALL_PERMS.length})</label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPermissions([...ALL_PERMS])} className="text-xs">All</Button>
            <Button size="sm" variant="outline" onClick={() => setPermissions([])} className="text-xs">None</Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto border border-border rounded-lg divide-y divide-border">
          {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
            const allChecked = perms.every(p => permissions.includes(p));
            const someChecked = perms.some(p => permissions.includes(p));
            const isOpen = expanded[group] ?? false;
            return (
              <div key={group}>
                <div className="flex items-center gap-3 px-3 py-2 hover:bg-muted/20 cursor-pointer" onClick={() => setExpanded(e => ({ ...e, [group]: !isOpen }))}>
                  <Checkbox
                    checked={allChecked}
                    data-state={someChecked && !allChecked ? "indeterminate" : undefined}
                    onCheckedChange={() => toggleGroup(group, perms)}
                    onClick={e => e.stopPropagation()}
                  />
                  <span className="flex-1 text-sm font-medium">{group}</span>
                  <span className="text-xs text-muted-foreground">{perms.filter(p => permissions.includes(p)).length}/{perms.length}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
                {isOpen && (
                  <div className="px-3 pb-2 grid grid-cols-2 gap-1 bg-muted/10">
                    {perms.map(perm => (
                      <label key={perm} className="flex items-center gap-2 py-1 cursor-pointer group">
                        <Checkbox checked={permissions.includes(perm)} onCheckedChange={() => togglePerm(perm)} />
                        <span className="text-xs text-muted-foreground group-hover:text-foreground font-mono">{perm.split(".")[1]}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Saving..." : role ? "Update Role" : "Create Role"}
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchRoles = () => {
    apiRequest("GET", "/admin/roles")
      .then(data => { setRoles(data.roles || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(fetchRoles, []);

  const handleDelete = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"? This will remove it from all users.`)) return;
    await apiRequest("DELETE", `/admin/roles/${role.id}`);
    toast.success(`Role "${role.name}" deleted`);
    fetchRoles();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Role Management</h1>
            <p className="text-muted-foreground">Create custom roles with {Object.values(PERMISSION_GROUPS).flat().length}+ granular permissions.</p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> New Role</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader><DialogTitle>Create Custom Role</DialogTitle></DialogHeader>
              <RoleDialog onSave={fetchRoles} onClose={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
          <Shield className="w-4 h-4 inline mr-2 text-primary" />
          Custom roles are display/permission roles layered on top of system roles (user/mod/admin/superadmin). They let you granularly control what each user can do.
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-36 bg-muted/20 rounded-xl animate-pulse" />)}
          </div>
        ) : roles.length === 0 ? (
          <div className="glass-card rounded-xl border-border p-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No custom roles yet. Create your first role to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
              <div key={role.id} className="glass-card rounded-xl border-border p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: role.color + "30", border: `1px solid ${role.color}50` }}>
                      <Shield className="w-5 h-5" style={{ color: role.color }} />
                    </div>
                    <div>
                      <h3 className="font-bold font-display" style={{ color: role.color }}>{role.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /> {role.memberCount} members
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingRole(role)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(role)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Permissions</span>
                    <Badge variant="outline" className="text-xs">{role.permissions.length} / {ALL_PERMS.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 6).map(p => (
                      <span key={p} className="text-[10px] font-mono bg-muted/30 border border-border px-1.5 py-0.5 rounded">{p.split(".")[0]}.{p.split(".")[1]?.substring(0,8)}</span>
                    ))}
                    {role.permissions.length > 6 && (
                      <span className="text-[10px] text-muted-foreground">+{role.permissions.length - 6} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingRole && (
        <Dialog open={!!editingRole} onOpenChange={o => !o && setEditingRole(null)}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader><DialogTitle>Edit Role: {editingRole.name}</DialogTitle></DialogHeader>
            <RoleDialog role={editingRole} onSave={fetchRoles} onClose={() => setEditingRole(null)} />
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
