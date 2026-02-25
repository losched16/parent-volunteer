// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://assets.cdn.filesafe.space/sgdhr60vufwWbqZodBIt/media/68ad955422ca861c74c6e924.png"
            alt="Salem Montessori School"
            className="h-20 mx-auto mb-4"
          />
          <h1 className="font-display text-2xl font-bold text-gray-900">Salem Montessori</h1>
          <p className="text-gray-500 text-sm mt-1">Volunteer Portal</p>
        </div>
        {children}
      </div>
    </div>
  );
}
