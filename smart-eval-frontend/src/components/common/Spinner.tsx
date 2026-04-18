interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' } as const;

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label = 'Loading', className = '' }) => (
  <div role="status" aria-live="polite" className={`inline-flex items-center gap-2 ${className}`}>
    <svg
      className={`animate-spin text-brand-600 ${sizeMap[size]}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="opacity-75"
      />
    </svg>
    <span className="sr-only">{label}</span>
  </div>
);

export default Spinner;
