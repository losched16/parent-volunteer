// app/(parent)/layout.tsx
import SessionProvider from "@/components/shared/SessionProvider";
import ParentNav from "@/components/parent/ParentNav";
import { ToastProvider } from "@/components/ui/Toast";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50">
          <ParentNav />
          <main className="lg:ml-64 pt-16 lg:pt-0">
            <div className="max-w-5xl mx-auto p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
