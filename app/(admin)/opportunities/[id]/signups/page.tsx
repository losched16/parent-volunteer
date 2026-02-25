// app/(admin)/opportunities/[id]/signups/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Loading from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

export default function SignupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const [signups, setSignups] = useState<any[]>([]);
  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const oppId = params.id as string;

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") loadData();
  }, [status]);

  async function loadData() {
    try {
      const [signupsRes, oppsRes] = await Promise.all([
        fetch(`/api/admin/signups?opportunity_id=${oppId}`),
        fetch("/api/admin/opportunities"),
      ]);
      const signupsData = await signupsRes.json();
      const oppsData = await oppsRes.json();
      setSignups(signupsData.signups || []);
      const opp = (oppsData.opportunities || []).find((o: any) => o.id === oppId);
      setOpportunity(opp);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAttendance(signupId: string, attended: boolean) {
    setSaving(signupId);
    try {
      const signup = signups.find((s) => s.id === signupId);
      const hoursCredit = attended ? opportunity?.hours_credit || 0 : 0;

      const res = await fetch("/api/admin/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signup_id: signupId, attended, hours_credit: hoursCredit }),
      });

      if (!res.ok) throw new Error();

      showToast(attended ? "Marked as attended ✓" : "Attendance removed");
      loadData();
    } catch {
      showToast("Failed to update", "error");
    } finally {
      setSaving(null);
    }
  }

  async function handleExport() {
    window.open(`/api/admin/export?type=signups&opportunity_id=${oppId}`, "_blank");
  }

  if (loading) return <Loading />;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/admin/opportunities" className="text-sm text-brand-600 hover:underline mb-2 inline-block">
            ← Back to Opportunities
          </Link>
          <h1 className="page-title">{opportunity?.title || "Event"} — Signups</h1>
          {opportunity && (
            <p className="text-gray-500 mt-1">
              {formatDate(opportunity.event_date)} • {opportunity.location} • {opportunity.hours_credit} hrs credit
            </p>
          )}
        </div>
        <button onClick={handleExport} className="btn-secondary btn-sm">
          📥 Export CSV
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-800">
            {signups.length} signup{signups.length !== 1 ? "s" : ""}
          </span>
          <span className="text-sm text-gray-500">
            {signups.filter((s) => s.attended).length} attended
          </span>
        </div>

        {signups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No signups yet for this opportunity.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {signups.map((signup) => (
              <div key={signup.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">
                    {signup.parent_first_name} {signup.parent_last_name}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500 mt-0.5">
                    <span>{signup.parent_email}</span>
                    <span>{signup.parent_phone}</span>
                    <span>Students: {signup.parent_student_names}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {signup.attended ? (
                    <div className="flex items-center gap-2">
                      <span className="badge-green">✓ Attended ({signup.hours_credited} hrs)</span>
                      <button
                        onClick={() => handleAttendance(signup.id, false)}
                        disabled={saving === signup.id}
                        className="text-xs text-gray-400 hover:text-red-500"
                        title="Undo"
                      >
                        undo
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAttendance(signup.id, true)}
                      disabled={saving === signup.id}
                      className="btn-primary btn-sm text-xs"
                    >
                      {saving === signup.id ? "..." : "Mark Attended"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {signups.length > 0 && signups.some((s) => !s.attended) && (
        <div className="card p-4 bg-brand-50 border-brand-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-brand-800 font-medium">
              Mark all {signups.filter((s) => !s.attended).length} remaining as attended?
            </p>
            <button
              onClick={async () => {
                for (const s of signups.filter((s) => !s.attended)) {
                  await handleAttendance(s.id, true);
                }
              }}
              className="btn-primary btn-sm text-xs"
            >
              Mark All Attended
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
