// app/(parent)/history/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/parent/dashboard")
        .then((r) => r.json())
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (loading || !data) return <Loading />;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Volunteer History</h1>
        <p className="text-gray-500 mt-1">
          {data.hours_completed} of {data.hours_required} hours completed
        </p>
      </div>

      {/* Progress bar */}
      <div className="card p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">{data.progress_percentage}% complete</span>
          <span className="text-gray-500">{data.hours_remaining} hrs remaining</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-brand-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, data.progress_percentage)}%` }}
          />
        </div>
      </div>

      {data.recent_history.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No history yet"
          description="Your volunteer history will appear here after you attend events."
          action={{ label: "Browse Opportunities", href: "/opportunities" }}
        />
      ) : (
        <div className="card divide-y divide-gray-100">
          {data.recent_history.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-semibold text-gray-800">{item.opportunity_title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDate(item.opportunity_date)} • {item.opportunity_location}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                {item.attended ? (
                  <div>
                    <span className="badge-green">✓ Attended</span>
                    <p className="text-sm font-bold text-brand-700 mt-1">+{item.hours_credited} hrs</p>
                  </div>
                ) : item.status === "cancelled" ? (
                  <span className="badge-gray">Cancelled</span>
                ) : (
                  <span className="badge-yellow">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
