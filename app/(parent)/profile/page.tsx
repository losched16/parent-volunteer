// app/(parent)/profile/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", student_names: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/parent/profile")
        .then((r) => r.json())
        .then(setForm)
        .finally(() => setLoading(false));
    }
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/parent/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast("Profile updated!");
    } catch {
      showToast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="page-title">My Profile</h1>
      <div className="card p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} className="input-field bg-gray-50" disabled />
            <p className="text-xs text-gray-400 mt-1">Contact admin to change email</p>
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="label">Student Name(s)</label>
            <input type="text" value={form.student_names} onChange={(e) => setForm({ ...form, student_names: e.target.value })} className="input-field" required />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
