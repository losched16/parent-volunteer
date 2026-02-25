// app/(admin)/settings/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import Loading from "@/components/ui/Loading";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<any>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [ghlKey, setGhlKey] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((data) => {
          setSchool(data.school || {});
          setSettings(data.settings || {});
        })
        .finally(() => setLoading(false));
    }
  }, [status]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: any = {
        name: school.name,
        required_hours_per_year: school.required_hours_per_year,
        ghl_location_id: school.ghl_location_id,
        settings,
      };
      if (ghlKey && ghlKey !== "••••••") body.ghl_api_key = ghlKey;

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast("Settings saved!");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Settings</h1>

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
        {/* School Settings */}
        <div className="card p-6">
          <h2 className="section-title mb-4">School Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="label">School Name</label>
              <input type="text" value={school.name || ""} onChange={(e) => setSchool({ ...school, name: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="label">Required Hours Per Year</label>
              <input type="number" min="1" value={school.required_hours_per_year || 20}
                onChange={(e) => setSchool({ ...school, required_hours_per_year: parseInt(e.target.value) })}
                className="input-field w-32" />
            </div>
            <div>
              <label className="label">Admin Email</label>
              <input type="email" value={school.admin_email || ""} className="input-field bg-gray-50" disabled />
            </div>
          </div>
        </div>

        {/* GHL Settings */}
        <div className="card p-6">
          <h2 className="section-title mb-4">GoHighLevel Integration</h2>
          <div className="space-y-4">
            <div>
              <label className="label">API Key</label>
              <input type="password" value={ghlKey || school.ghl_api_key || ""}
                onChange={(e) => setGhlKey(e.target.value)}
                className="input-field" placeholder="Enter GHL API key" />
              <p className="text-xs text-gray-400 mt-1">Leave blank to keep existing key</p>
            </div>
            <div>
              <label className="label">Location ID</label>
              <input type="text" value={school.ghl_location_id || ""}
                onChange={(e) => setSchool({ ...school, ghl_location_id: e.target.value })}
                className="input-field" placeholder="GHL Location ID" />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="card p-6">
          <h2 className="section-title mb-4">Email Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Reminder Timing</label>
              <select value={settings.reminder_hours || "24"}
                onChange={(e) => setSettings({ ...settings, reminder_hours: e.target.value })}
                className="input-field w-48">
                <option value="12">12 hours before</option>
                <option value="24">24 hours before</option>
                <option value="48">48 hours before</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
