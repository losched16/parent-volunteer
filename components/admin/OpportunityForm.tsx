// components/admin/OpportunityForm.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface OpportunityFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function OpportunityForm({ initialData, isEdit = false }: OpportunityFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    event_date: initialData?.event_date?.split("T")[0] || "",
    start_time: initialData?.start_time || "",
    end_time: initialData?.end_time || "",
    hours_credit: initialData?.hours_credit || 2,
    total_slots: initialData?.total_slots || 10,
    location: initialData?.location || "",
    status: initialData?.status || "active",
  });

  function updateField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const body = isEdit ? { id: initialData.id, ...form, hours_credit: Number(form.hours_credit), total_slots: Number(form.total_slots) }
        : { ...form, hours_credit: Number(form.hours_credit), total_slots: Number(form.total_slots) };

      const res = await fetch("/api/admin/opportunities", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to save", "error");
        return;
      }

      showToast(isEdit ? "Opportunity updated!" : "Opportunity created!");
      router.push("/admin/opportunities");
      router.refresh();
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 max-w-2xl space-y-5">
      <div>
        <label className="label">Title *</label>
        <input type="text" value={form.title} onChange={(e) => updateField("title", e.target.value)}
          className="input-field" placeholder="e.g., Library Shelf Organizing" required />
      </div>

      <div>
        <label className="label">Description *</label>
        <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)}
          className="input-field min-h-[100px]" placeholder="Describe the volunteer opportunity..." required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Date *</label>
          <input type="date" value={form.event_date} onChange={(e) => updateField("event_date", e.target.value)}
            className="input-field" required />
        </div>
        <div>
          <label className="label">Start Time *</label>
          <input type="time" value={form.start_time} onChange={(e) => updateField("start_time", e.target.value)}
            className="input-field" required />
        </div>
        <div>
          <label className="label">End Time *</label>
          <input type="time" value={form.end_time} onChange={(e) => updateField("end_time", e.target.value)}
            className="input-field" required />
        </div>
      </div>

      <div>
        <label className="label">Location *</label>
        <input type="text" value={form.location} onChange={(e) => updateField("location", e.target.value)}
          className="input-field" placeholder="e.g., School Library, Room 202" required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Hours Credit *</label>
          <input type="number" step="0.5" min="0.5" value={form.hours_credit}
            onChange={(e) => updateField("hours_credit", e.target.value)}
            className="input-field" required />
        </div>
        <div>
          <label className="label">Total Slots *</label>
          <input type="number" min="1" value={form.total_slots}
            onChange={(e) => updateField("total_slots", e.target.value)}
            className="input-field" required />
        </div>
        <div>
          <label className="label">Status</label>
          <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="input-field">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : isEdit ? "Update Opportunity" : "Create Opportunity"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
