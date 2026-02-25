// app/(admin)/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/Loading";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && session.user.role !== "admin") { router.push("/dashboard"); return; }
    if (status === "authenticated") {
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then(setStats)
        .finally(() => setLoading(false));
    }
  }, [status, session]);

  if (loading || !stats) return <Loading text="Loading admin dashboard..." />;

  const statCards = [
    { label: "Total Parents", value: stats.total_parents, icon: "👨‍👩‍👧", color: "bg-blue-50 text-blue-700" },
    { label: "Total Volunteer Hours", value: stats.total_hours.toFixed(1), icon: "⏱", color: "bg-brand-50 text-brand-700" },
    { label: "Upcoming Events", value: stats.upcoming_events, icon: "📅", color: "bg-purple-50 text-purple-700" },
    { label: "Avg Hours/Parent", value: stats.avg_hours_per_parent, icon: "📊", color: "bg-orange-50 text-orange-700" },
    { label: "Completion Rate", value: `${stats.completion_rate}%`, icon: "✅", color: "bg-green-50 text-green-700" },
    { label: "Completed Requirement", value: `${stats.completed_parents}/${stats.total_parents}`, icon: "🏆", color: "bg-yellow-50 text-yellow-700" },
  ];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of volunteer program metrics.</p>
        </div>
        <Link href="/admin/opportunities/new" className="btn-primary">
          + New Opportunity
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                {stat.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Hour distribution */}
      {stats.hour_distribution && stats.hour_distribution.length > 0 && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Hour Distribution</h2>
          <div className="space-y-3">
            {stats.hour_distribution.map((item: any) => {
              const count = parseInt(item.count);
              const maxCount = Math.max(...stats.hour_distribution.map((d: any) => parseInt(d.count)));
              const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={item.range} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24 shrink-0">{item.range}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-brand-400 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${Math.max(width, 8)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent signups */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Recent Signups</h2>
        {stats.recent_signups.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No recent signups yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recent_signups.map((signup: any) => (
              <div key={signup.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {signup.parent_first_name} {signup.parent_last_name}
                  </p>
                  <p className="text-xs text-gray-500">{signup.opportunity_title}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDate(signup.opportunity_date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/admin/opportunities" className="card p-4 text-center hover:border-brand-300 transition-colors">
          <span className="text-2xl">📅</span>
          <p className="text-sm font-semibold text-gray-700 mt-2">Manage Events</p>
        </Link>
        <Link href="/admin/parents" className="card p-4 text-center hover:border-brand-300 transition-colors">
          <span className="text-2xl">👨‍👩‍👧</span>
          <p className="text-sm font-semibold text-gray-700 mt-2">View Parents</p>
        </Link>
        <Link href="/admin/broadcast" className="card p-4 text-center hover:border-brand-300 transition-colors">
          <span className="text-2xl">📧</span>
          <p className="text-sm font-semibold text-gray-700 mt-2">Send Broadcast</p>
        </Link>
        <Link href="/admin/settings" className="card p-4 text-center hover:border-brand-300 transition-colors">
          <span className="text-2xl">⚙️</span>
          <p className="text-sm font-semibold text-gray-700 mt-2">Settings</p>
        </Link>
      </div>
    </div>
  );
}
