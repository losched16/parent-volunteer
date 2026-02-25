// app/(parent)/opportunities/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

export default function OpportunitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmSignup, setConfirmSignup] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") loadOpportunities();
  }, [status]);

  async function loadOpportunities() {
    try {
      const res = await fetch("/api/parent/opportunities");
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch (error) {
      showToast("Failed to load opportunities", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(opportunity: any) {
    setActionId(opportunity.id);
    try {
      const res = await fetch("/api/parent/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunity.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to sign up", "error");
        return;
      }
      showToast(`Signed up for ${opportunity.title}!`, "success");
      loadOpportunities();
    } catch (error) {
      showToast("Something went wrong", "error");
    } finally {
      setActionId(null);
      setConfirmSignup(null);
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  if (loading) return <Loading text="Loading opportunities..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Volunteer Opportunities</h1>
        <p className="text-gray-500 mt-1">Browse and sign up for upcoming events.</p>
      </div>

      {opportunities.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="No opportunities available"
          description="Check back later for new volunteer opportunities."
        />
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="card p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Date badge */}
                <div className="w-16 h-16 bg-brand-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-brand-100">
                  <span className="text-xs font-bold text-brand-600 uppercase">
                    {new Date(opp.event_date).toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  <span className="text-2xl font-bold text-brand-800 leading-none">
                    {new Date(opp.event_date).getDate()}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">{opp.title}</h3>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">{opp.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                    <span>📅 {formatDate(opp.event_date)}</span>
                    <span>🕐 {formatTime(opp.start_time)} - {formatTime(opp.end_time)}</span>
                    <span>📍 {opp.location}</span>
                    <span>⏱ {opp.hours_credit} hrs credit</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`text-sm font-medium ${opp.slots_remaining > 3 ? "text-green-600" : opp.slots_remaining > 0 ? "text-orange-600" : "text-red-600"}`}>
                      {opp.is_full ? "FULL" : `${opp.slots_remaining} of ${opp.total_slots} spots left`}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="shrink-0">
                  {opp.is_signed_up ? (
                    <span className="badge-green px-4 py-2 text-sm">✓ Signed Up</span>
                  ) : opp.is_full ? (
                    <span className="badge-red px-4 py-2 text-sm">Full</span>
                  ) : (
                    <button
                      onClick={() => setConfirmSignup(opp)}
                      disabled={actionId === opp.id}
                      className="btn-primary btn-sm"
                    >
                      {actionId === opp.id ? "Signing up..." : "Sign Up"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmSignup}
        title="Confirm Signup"
        message={confirmSignup ? `Sign up for "${confirmSignup.title}" on ${formatDate(confirmSignup.event_date)}? You'll earn ${confirmSignup.hours_credit} volunteer hours.` : ""}
        confirmLabel="Sign Up"
        onConfirm={() => confirmSignup && handleSignup(confirmSignup)}
        onCancel={() => setConfirmSignup(null)}
      />
    </div>
  );
}
