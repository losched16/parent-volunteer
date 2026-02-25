// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-500/20">
            <span className="text-3xl">🌳</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Salem Montessori</h1>
          <p className="text-gray-500 text-sm mt-1">Volunteer Portal</p>
        </div>
        {children}
      </div>
    </div>
  );
}
