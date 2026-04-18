import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const padMap = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
} as const;

const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  interactive = false,
  className = '',
  ...rest
}) => (
  <div
    className={[
      'rounded-xl border border-gray-200/70 bg-white shadow-card',
      interactive ? 'transition hover:shadow-md hover:-translate-y-0.5' : '',
      padMap[padding],
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
