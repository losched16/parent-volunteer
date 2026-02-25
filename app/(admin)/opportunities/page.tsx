// app/(admin)/opportunities/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/Loading";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

export default function AdminOpportunitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") loadOpportunities();
  }, [status]);

  async function loadOpportunities() {
    const res = await fetch("/api/admin/opportunities");
    const data = await res.json();
    setOpportunities(data.opportunities || []);
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await fetch("/api/admin/opportunities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      showToast("Opportunity deleted");
      loadOpportunities();
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setDeleteId(null);
    }
  }

  async function handleDuplicate(opp: any) {
    try {
      await fetch("/api/admin/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${opp.title} (Copy)`,
          description: opp.description,
          event_date: opp.event_date,
          start_time: opp.start_time,
          end_time: opp.end_time,
          hours_credit: opp.hours_credit,
          total_slots: opp.total_slots,
          location: opp.location,
        }),
      });
      showToast("Opportunity duplicated");
      loadOpportunities();
    } catch {
      showToast("Failed to duplicate", "error");
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  const today = new Date().toISOString().split("T")[0];
  const filtered = opportunities.filter((opp) => {
    if (filter === "upcoming") return opp.event_date >= today;
    if (filter === "past") return opp.event_date < today;
    return true;
  });

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="page-title">Volunteer Opportunities</h1>
        <Link href="/admin/opportunities/new" className="btn-primary">+ New Opportunity</Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["all", "upcoming", "past"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize
              ${filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {f} ({f === "all" ? opportunities.length : opportunities.filter((o) => f === "upcoming" ? o.event_date >= today : o.event_date < today).length})
          </button>
        ))}
      </div>

      {/* Opportunities list */}
      <div className="space-y-3">
        {filtered.map((opp) => {
          const isPast = opp.event_date < today;
          const signedUp = opp.total_slots - opp.slots_remaining;
          return (
            <div key={opp.id} className={`card p-5 ${isPast ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{opp.title}</h3>
                    <span className={opp.status === "active" ? "badge-green" : "badge-gray"}>
                      {opp.status}
                    </span>
                    {isPast && <span className="badge-gray">Past</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>{formatDate(opp.event_date)}</span>
                    <span>{formatTime(opp.start_time)} - {formatTime(opp.end_time)}</span>
                    <span>{opp.location}</span>
                    <span>{opp.hours_credit} hrs</span>
                    <span className="font-medium text-gray-700">{signedUp}/{opp.total_slots} signed up</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/opportunities/${opp.id}/signups`}
                    className="btn-secondary btn-sm text-xs"
                  >
                    Signups ({signedUp})
                  </Link>
                  <Link
                    href={`/admin/opportunities/${opp.id}/edit`}
                    className="btn-secondary btn-sm text-xs"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDuplicate(opp)}
                    className="btn-secondary btn-sm text-xs"
                    title="Duplicate"
                  >
                    ⧉
                  </button>
                  <button
                    onClick={() => setDeleteId(opp.id)}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 text-sm"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Opportunity"
        message="Are you sure you want to delete this opportunity? All signups will also be removed. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
