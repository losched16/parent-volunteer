// app/(parent)/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ProgressRing from "@/components/parent/ProgressRing";
import Loading from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";

interface DashboardData {
  parent: any;
  hours_completed: number;
  hours_required: number;
  hours_remaining: number;
  progress_percentage: number;
  upcoming_signups: any[];
  recent_history: any[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && session.user.role !== "parent") {
      router.push("/admin/dashboard");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/parent/dashboard")
        .then((r) => r.json())
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [status, session, router]);

  if (loading || !data) return <Loading text="Loading dashboard..." />;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Welcome back, {data.parent.first_name}! 👋</h1>
        <p className="text-gray-500 mt-1">Track your volunteer progress and upcoming events.</p>
      </div>

      {/* Progress card */}
      <div className="card p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ProgressRing
            percentage={data.progress_percentage}
            hours={data.hours_completed}
            required={data.hours_required}
          />
          <div className="flex-1 text-center md:text-left">
            <h2 className="section-title mb-4">Your Volunteer Progress</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-brand-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-brand-700">{data.hours_completed}</p>
                <p className="text-xs text-gray-500 mt-1">Completed</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-700">{data.hours_required}</p>
                <p className="text-xs text-gray-500 mt-1">Required</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{data.hours_remaining}</p>
                <p className="text-xs text-gray-500 mt-1">Remaining</p>
              </div>
            </div>
            {data.hours_remaining > 0 && (
              <Link href="/opportunities" className="btn-primary mt-6 inline-flex">
                Browse Opportunities
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming events */}
        <div className="card p-6">
          <h2 className="section-title mb-4">Upcoming Events</h2>
          {data.upcoming_signups.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No upcoming events"
              description="Browse opportunities to sign up for volunteer events."
              action={{ label: "Browse", href: "/opportunities" }}
            />
          ) : (
            <div className="space-y-3">
              {data.upcoming_signups.map((signup: any) => (
                <div
                  key={signup.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-brand-50/50 transition-colors"
                >
                  <div className="w-12 h-12 bg-brand-100 rounded-lg flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand-700">
                      {new Date(signup.opportunity_date).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-lg font-bold text-brand-800 leading-none">
                      {new Date(signup.opportunity_date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">
                      {signup.opportunity_title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTime(signup.start_time)} • {signup.opportunity_location}
                    </p>
                    <span className="badge-blue mt-1">{signup.opportunity_hours_credit} hrs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent history */}
        <div className="card p-6">
          <h2 className="section-title mb-4">Volunteer History</h2>
          {data.recent_history.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No history yet"
              description="Your volunteer history will appear here after events."
            />
          ) : (
            <div className="space-y-3">
              {data.recent_history.slice(0, 5).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">
                      {item.opportunity_title}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(item.opportunity_date)}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {item.attended ? (
                      <span className="badge-green">+{item.hours_credited} hrs</span>
                    ) : item.status === "cancelled" ? (
                      <span className="badge-gray">Cancelled</span>
                    ) : (
                      <span className="badge-yellow">Pending</span>
                    )}
                  </div>
                </div>
              ))}
              {data.recent_history.length > 5 && (
                <Link href="/history" className="block text-center text-sm text-brand-600 font-medium hover:underline pt-2">
                  View all history →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
