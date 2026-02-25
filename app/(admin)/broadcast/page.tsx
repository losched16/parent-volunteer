// app/(admin)/broadcast/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function BroadcastPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    subject: "",
    body: "",
    target: "all" as "all" | "event" | "low_hours",
    event_id: "",
    hours_threshold: 20,
  });
  const [sending, setSending] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/admin/opportunities").then((r) => r.json()).then((d) => setOpportunities(d.opportunities || []));
    }
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to send", "error");
        return;
      }
      showToast(`Broadcast sent to ${data.sent} recipients!`);
      setForm({ ...form, subject: "", body: "" });
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Send Broadcast Email</h1>

      <div className="card p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Target Audience</label>
            <select
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value as any })}
              className="input-field"
            >
              <option value="all">All Parents</option>
              <option value="event">Parents Signed Up for Event</option>
              <option value="low_hours">Parents Below Hour Threshold</option>
            </select>
          </div>

          {form.target === "event" && (
            <div>
              <label className="label">Select Event</label>
              <select value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })} className="input-field" required>
                <option value="">Select an event...</option>
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.title} ({new Date(opp.event_date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.target === "low_hours" && (
            <div>
              <label className="label">Hour Threshold (send to parents below this)</label>
              <input
                type="number" min="1" value={form.hours_threshold}
                onChange={(e) => setForm({ ...form, hours_threshold: parseInt(e.target.value) })}
                className="input-field w-32"
              />
            </div>
          )}

          <div>
            <label className="label">Subject</label>
            <input
              type="text" value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="input-field" placeholder="Email subject line" required
            />
          </div>

          <div>
            <label className="label">Message</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="input-field min-h-[150px]"
              placeholder="Write your message here...&#10;&#10;Available variables: {parent_name}, {hours_remaining}, {school_name}"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Variables: {"{parent_name}"}, {"{hours_remaining}"}, {"{school_name}"}
            </p>
          </div>

          <button type="submit" disabled={sending} className="btn-primary">
            {sending ? "Sending..." : "Send Broadcast"}
          </button>
        </form>
      </div>
    </div>
  );
}
