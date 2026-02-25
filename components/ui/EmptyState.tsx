// components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">{description}</p>
      {action && (
        action.href ? (
          <a href={action.href} className="btn-primary">{action.label}</a>
        ) : (
          <button onClick={action.onClick} className="btn-primary">{action.label}</button>
        )
      )}
    </div>
  );
}
