// app/admin/settings/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import Loading from "@/components/ui/Loading";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<any>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [ghlKey, setGhlKey] = useState("");

  // Admin management state
  const [admins, setAdmins] = useState<any[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);

  // Change password state
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/admin/settings").then((r) => r.json()),
        fetch("/api/admin/users").then((r) => r.json()).catch(() => ({ admins: [] })),
      ]).then(([settingsData, adminsData]) => {
        setSchool(settingsData.school || {});
        setSettings(settingsData.settings || {});
        setAdmins(adminsData.admins || []);
      }).finally(() => setLoading(false));
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

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAddingAdmin(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create admin", "error");
        return;
      }
      showToast("Admin created!");
      setNewAdmin({ email: "", password: "", first_name: "", last_name: "" });
      setShowAddAdmin(false);
      const adminsRes = await fetch("/api/admin/users");
      const adminsData = await adminsRes.json();
      setAdmins(adminsData.admins || []);
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setAddingAdmin(false);
    }
  }

  async function handleDeleteAdmin() {
    if (!deleteAdminId) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteAdminId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Cannot delete this admin", "error");
        return;
      }
      showToast("Admin removed");
      setAdmins(admins.filter((a) => a.id !== deleteAdminId));
    } catch {
      showToast("Failed to delete admin", "error");
    } finally {
      setDeleteAdminId(null);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (passwords.new_password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to change password", "error");
        return;
      }
      showToast("Password updated!");
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) return <Loading />;

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";

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
          <h2 className="section-title mb-4">Growth Suite Integration</h2>
          <div className="space-y-4">
            <div>
              <label className="label">API Key</label>
              <input type="password" value={ghlKey || school.ghl_api_key || ""}
                onChange={(e) => setGhlKey(e.target.value)}
                className="input-field" placeholder="Enter Growth Suite API key" />
              <p className="text-xs text-gray-400 mt-1">Leave blank to keep existing key</p>
            </div>
            <div>
              <label className="label">Location ID</label>
              <input type="text" value={school.ghl_location_id || ""}
                onChange={(e) => setSchool({ ...school, ghl_location_id: e.target.value })}
                className="input-field" placeholder="Growth Suite Location ID" />
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

      {/* Change Password */}
      <div className="card p-6 max-w-2xl">
        <h2 className="section-title mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
              className="input-field" placeholder="Enter current password" required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              className="input-field" placeholder="Min 8 characters" required minLength={8} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              className="input-field" placeholder="Re-enter new password" required minLength={8} />
          </div>
          <button type="submit" disabled={changingPassword} className="btn-primary btn-sm">
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Admin Management */}
      <div className="card p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Admin Users</h2>
          <button onClick={() => setShowAddAdmin(!showAddAdmin)} className="btn-primary btn-sm">
            {showAddAdmin ? "Cancel" : "+ Add Admin"}
          </button>
        </div>

        {/* Add admin form */}
        {showAddAdmin && (
          <form onSubmit={handleAddAdmin} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input type="text" value={newAdmin.first_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, first_name: e.target.value })}
                  className="input-field" placeholder="Jane" required />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input type="text" value={newAdmin.last_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, last_name: e.target.value })}
                  className="input-field" placeholder="Smith" required />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                className="input-field" placeholder="admin@salemmontessori.org" required />
            </div>
            <div>
              <label className="label">Temporary Password</label>
              <input type="password" value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                className="input-field" placeholder="Min 8 characters" required minLength={8} />
              <p className="text-xs text-gray-400 mt-1">The new admin can change this after logging in via Settings</p>
            </div>
            <button type="submit" disabled={addingAdmin} className="btn-primary btn-sm">
              {addingAdmin ? "Creating..." : "Create Admin"}
            </button>
          </form>
        )}

        {/* Admin list */}
        <div className="divide-y divide-gray-100">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-gray-800">
                  {admin.first_name} {admin.last_name}
                  {admin.role === "super_admin" && (
                    <span className="badge-blue ml-2">Primary</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">{admin.email}</p>
                <p className="text-xs text-gray-400">Last login: {formatDate(admin.last_login)}</p>
              </div>
              {admin.role !== "super_admin" && (
                <button
                  onClick={() => setDeleteAdminId(admin.id)}
                  className="text-red-400 hover:text-red-600 text-sm p-2 rounded hover:bg-red-50"
                  title="Remove admin"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {admins.length === 0 && (
            <p className="text-gray-500 text-sm py-4">No admin users found. The primary admin account is managed in school settings.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteAdminId}
        title="Remove Admin"
        message="Are you sure you want to remove this admin? They will no longer be able to log in to the admin portal."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleDeleteAdmin}
        onCancel={() => setDeleteAdminId(null)}
      />
    </div>
  );
}
