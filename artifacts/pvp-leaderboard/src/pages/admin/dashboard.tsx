import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetAdminAnalytics } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Swords, Ticket, AlertTriangle, TrendingUp, ShieldAlert, Database, Settings, Shield, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useGetAdminAnalytics();
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async (force: boolean) => {
    setSeeding(true);
    try {
      const token = localStorage.getItem("pvp_token");
      const res = await fetch(apiUrl("/api/admin/seed"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Seed failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSeeding(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const COLORS = ['#00D4FF', '#00FF87', '#FFD700', '#FF3366', '#A855F7', '#FF8C00', '#3B82F6', '#EF4444'];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and analytics.</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-6 rounded-xl border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">Total Users</h3>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold font-mono">{analytics?.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +{analytics?.newUsersThisWeek} this week
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">Total Matches</h3>
              <Swords className="w-5 h-5 text-accent" />
            </div>
            <div className="text-3xl font-bold font-mono">{analytics?.totalMatches.toLocaleString()}</div>
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +{analytics?.matchesThisWeek} this week
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">Open Tickets</h3>
              <Ticket className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold font-mono">{analytics?.openTickets}</div>
            <p className="text-xs text-muted-foreground mt-2">Out of {analytics?.totalTickets} total</p>
          </div>

          <div className="glass-card p-6 rounded-xl border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">Pending Submissions</h3>
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-3xl font-bold font-mono">{analytics?.pendingSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-2">Require review</p>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="glass-card p-6 rounded-xl border-border space-y-4">
          <h3 className="font-bold font-display">Quick Tools</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/admin/settings">
                <Settings className="w-5 h-5 text-primary" />
                <span className="text-xs">Site Settings</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/admin/roles">
                <Shield className="w-5 h-5 text-accent" />
                <span className="text-xs">Manage Roles</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleSeed(false)}
              disabled={seeding}
            >
              <Database className="w-5 h-5 text-yellow-400" />
              <span className="text-xs">{seeding ? "Seeding..." : "Seed Data"}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleSeed(true)}
              disabled={seeding}
            >
              <RefreshCw className="w-5 h-5 text-red-400" />
              <span className="text-xs">{seeding ? "Seeding..." : "Force Re-seed"}</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            "Seed Data" adds 20 test players. "Force Re-seed" resets and re-creates them. Use force with caution.
          </p>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-xl border-border">
            <h3 className="font-bold font-display mb-6">Activity (Last 7 Days)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.activityByDay} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {weekday: 'short'})} />
                  <YAxis yAxisId="left" stroke="#888" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                    labelStyle={{ color: '#ccc', marginBottom: '4px' }}
                  />
                  <Bar yAxisId="left" dataKey="matches" name="Matches" fill="#00D4FF" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="newUsers" name="New Users" fill="#00FF87" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 rounded-xl border-border">
            <h3 className="font-bold font-display mb-6">Gamemode Distribution</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.gamemodeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="matches"
                    nameKey="gamemode"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {analytics?.gamemodeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', textTransform: 'capitalize' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
