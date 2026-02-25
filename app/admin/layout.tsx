// app/(admin)/layout.tsx
import SessionProvider from "@/components/shared/SessionProvider";
import AdminNav from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/ui/Toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50">
          <AdminNav />
          <main className="lg:ml-64 pt-16 lg:pt-0">
            <div className="max-w-6xl mx-auto p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
