// app/(admin)/parents/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

export default function AdminParentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [parents, setParents] = useState<any[]>([]);
  const [requiredHours, setRequiredHours] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editHours, setEditHours] = useState<{ id: string; hours: number } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") loadParents();
  }, [status]);

  async function loadParents(searchTerm?: string) {
    const url = searchTerm ? `/api/admin/parents?search=${encodeURIComponent(searchTerm)}` : "/api/admin/parents";
    const res = await fetch(url);
    const data = await res.json();
    setParents(data.parents || []);
    setRequiredHours(data.required_hours || 20);
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    loadParents(search);
  }

  async function saveHours() {
    if (!editHours) return;
    try {
      await fetch("/api/admin/parents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: editHours.id, hours: editHours.hours }),
      });
      showToast("Hours updated");
      loadParents(search || undefined);
    } catch {
      showToast("Failed to update hours", "error");
    } finally {
      setEditHours(null);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="page-title">Parents ({parents.length})</h1>
        <a href="/api/admin/export?type=parents" target="_blank" className="btn-secondary btn-sm">
          📥 Export CSV
        </a>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
          placeholder="Search by name, email, or student..."
        />
        <button type="submit" className="btn-primary btn-sm">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); setLoading(true); loadParents(); }} className="btn-secondary btn-sm">
            Clear
          </button>
        )}
      </form>

      {/* Parents table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left p-4 font-semibold text-gray-600">Parent</th>
              <th className="text-left p-4 font-semibold text-gray-600">Students</th>
              <th className="text-left p-4 font-semibold text-gray-600">Contact</th>
              <th className="text-center p-4 font-semibold text-gray-600">Hours</th>
              <th className="text-center p-4 font-semibold text-gray-600">Progress</th>
              <th className="text-right p-4 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parents.map((parent) => {
              const pct = Math.min(100, Math.round((parent.total_hours_completed / requiredHours) * 100));
              const isComplete = parent.total_hours_completed >= requiredHours;
              return (
                <tr key={parent.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-semibold text-gray-800">{parent.first_name} {parent.last_name}</p>
                  </td>
                  <td className="p-4 text-gray-600">{parent.student_names}</td>
                  <td className="p-4">
                    <p className="text-gray-600">{parent.email}</p>
                    <p className="text-gray-400 text-xs">{parent.phone}</p>
                  </td>
                  <td className="p-4 text-center">
                    {editHours?.id === parent.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={editHours.hours}
                          onChange={(e) => setEditHours({ ...editHours, hours: parseFloat(e.target.value) || 0 })}
                          className="w-16 input-field text-center text-xs py-1 px-2"
                        />
                        <button onClick={saveHours} className="text-brand-600 font-bold text-xs">✓</button>
                        <button onClick={() => setEditHours(null)} className="text-gray-400 text-xs">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditHours({ id: parent.id, hours: parent.total_hours_completed })}
                        className="font-bold text-gray-800 hover:text-brand-600 transition-colors"
                        title="Click to edit"
                      >
                        {parent.total_hours_completed}/{requiredHours}
                      </button>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${isComplete ? "bg-green-500" : "bg-brand-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${isComplete ? "text-green-600" : "text-gray-500"}`}>
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/admin/parents/${parent.id}`}
                      className="text-brand-600 hover:underline text-xs font-medium"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {parents.length === 0 && (
          <div className="p-8 text-center text-gray-500">No parents found.</div>
        )}
      </div>
    </div>
  );
}
