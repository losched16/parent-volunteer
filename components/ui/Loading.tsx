// components/ui/Loading.tsx
export default function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-brand-100 rounded-full"></div>
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-sm text-gray-500 font-medium">{text}</p>
    </div>
  );
}
