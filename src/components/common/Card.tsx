import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'mint' | 'light-green' | 'muted';
  border?: boolean;
  elevation?: 'none' | 'subtle' | 'card' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'white',
  border = true,
  elevation = 'subtle',
  className = '',
  ...props
}) => {
  const variants = {
    white: 'bg-white',
    mint: 'bg-brand-mint',
    'light-green': 'bg-brand-card-green',
    muted: 'bg-brand-muted',
  };

  const elevations = {
    none: '',
    subtle: 'shadow-subtle',
    card: 'shadow-card',
    elevated: 'shadow-elevated',
  };

  const borderClass = border ? 'border border-brand-border' : '';

  return (
    <div
      className={`rounded-2xl transition-all duration-150 ${variants[variant]} ${borderClass} ${elevations[elevation]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
