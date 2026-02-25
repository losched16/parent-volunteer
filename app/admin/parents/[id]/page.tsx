// app/(admin)/parents/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Loading from "@/components/ui/Loading";
import ProgressRing from "@/components/parent/ProgressRing";
import Link from "next/link";

export default function ParentDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch(`/api/admin/parents?id=${params.id}`)
        .then((r) => r.json())
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [status, params.id]);

  if (loading || !data) return <Loading />;
  const { parent, history, upcoming, required_hours } = data;
  const pct = Math.min(100, Math.round((parent.total_hours_completed / required_hours) * 100));

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <Link href="/admin/parents" className="text-sm text-brand-600 hover:underline">← Back to Parents</Link>
      <div className="flex items-start gap-6 flex-wrap">
        <div className="card p-6 flex-1 min-w-[300px]">
          <h1 className="page-title">{parent.first_name} {parent.last_name}</h1>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p>📧 {parent.email}</p>
            <p>📱 {parent.phone}</p>
            <p>👧 Students: {parent.student_names}</p>
            {parent.ghl_contact_id && <p className="text-xs text-gray-400">GHL ID: {parent.ghl_contact_id}</p>}
          </div>
        </div>
        <div className="card p-6 flex items-center justify-center">
          <ProgressRing percentage={pct} hours={parent.total_hours_completed} required={required_hours} size={160} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="section-title mb-4">Upcoming Events ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming signups.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="font-medium">{s.opportunity_title}</span>
                  <span className="text-gray-500">{formatDate(s.opportunity_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="section-title mb-4">History ({history.length})</h2>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">No history yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">{s.opportunity_title}</span>
                    <span className="text-gray-400 ml-2">{formatDate(s.opportunity_date)}</span>
                  </div>
                  {s.attended ? (
                    <span className="badge-green">+{s.hours_credited} hrs</span>
                  ) : (
                    <span className="badge-gray">{s.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
