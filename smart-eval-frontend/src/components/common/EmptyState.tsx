import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
    {icon ? (
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient-soft text-brand-600">
        {icon}
      </div>
    ) : (
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient-soft text-brand-600">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    )}
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    {description && <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
