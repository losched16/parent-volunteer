// app/(auth)/register/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    phone: "",
    student_names: "",
    student_count: "1",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          student_names: form.student_names,
          student_count: parseInt(form.student_count) || 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/login?registered=true");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-8">
      <h2 className="text-xl font-bold text-center mb-6">Create Account</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First Name</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              className="input-field"
              placeholder="Jane"
              required
            />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              className="input-field"
              placeholder="Smith"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="input-field"
            placeholder="jane@example.com"
            required
          />
        </div>

        <div>
          <label className="label">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="input-field"
            placeholder="(555) 123-4567"
            required
          />
        </div>

        <div>
          <label className="label">Student Name(s)</label>
          <input
            type="text"
            value={form.student_names}
            onChange={(e) => updateField("student_names", e.target.value)}
            className="input-field"
            placeholder="Emma Smith, Jack Smith"
            required
          />
          <p className="text-xs text-gray-400 mt-1">Separate multiple names with commas</p>
        </div>

        <div>
          <label className="label">Number of Students Enrolled</label>
          <select
            value={form.student_count}
            onChange={(e) => updateField("student_count", e.target.value)}
            className="input-field w-32"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Co-op requirement: {Math.min(parseInt(form.student_count) * 12, 30)} hours
          </p>
        </div>

        <div>
          <label className="label">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            className="input-field"
            placeholder="Min 8 characters"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="label">Confirm Password</label>
          <input
            type="password"
            value={form.confirm_password}
            onChange={(e) => updateField("confirm_password", e.target.value)}
            className="input-field"
            placeholder="Re-enter password"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Account...
            </span>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 font-semibold hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
