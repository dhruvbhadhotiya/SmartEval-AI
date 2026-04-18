import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <input
          id={fieldId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={[
            'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900',
            'placeholder:text-gray-400 shadow-soft transition',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-rose-400 focus:ring-rose-200'
              : 'border-gray-300 focus:border-brand-500 focus:ring-brand-200',
            'disabled:bg-gray-50 disabled:text-gray-500',
            className,
          ].join(' ')}
          {...rest}
        />
        {error ? (
          <p id={`${fieldId}-error`} className="text-xs text-rose-600">
            {error}
          </p>
        ) : hint ? (
          <p id={`${fieldId}-hint`} className="text-xs text-gray-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export default Input;
