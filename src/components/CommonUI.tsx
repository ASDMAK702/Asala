import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'google';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  disabled = false,
  loading = false,
  type = 'button',
  ...props
}) => {
  const baseStyle =
    'rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variants = {
    primary:
      'bg-olive-700 text-beige-50 hover:bg-olive-800 shadow-md hover:shadow-lg dark:bg-olive-600 dark:hover:bg-olive-500',
    secondary:
      'bg-beige-200 text-olive-800 hover:bg-beige-300 border border-beige-300 dark:bg-dark-surface dark:text-beige-200 dark:border-dark-border dark:hover:bg-gray-800',
    danger:
      'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50',
    ghost:
      'hover:bg-beige-200 text-olive-700 dark:text-beige-300 dark:hover:bg-dark-surface',
    google:
      'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm dark:bg-dark-surface dark:text-beige-100 dark:border-dark-border dark:hover:bg-gray-800',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <i className="fa-solid fa-spinner fa-spin text-sm"></i>
      ) : (
        icon && <i className={`${icon} ${children ? '' : 'text-lg'}`}></i>
      )}
      {children}
    </button>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  icon?: string;
  onClick?: () => void;
}> = ({ children, className = '', title, action, icon, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white dark:bg-dark-surface rounded-2xl shadow-elegant dark:shadow-elegant-dark border border-beige-200 dark:border-dark-border p-6 ${className} animate-slide-up`}
  >
    {(title || action) && (
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-beige-100 dark:border-dark-border/50">
        <h3 className="font-serif text-xl text-olive-900 dark:text-beige-50 font-bold flex items-center gap-2">
          {icon && <i className={`${icon} text-olive-500`}></i>}
          {title}
        </h3>
        {action}
      </div>
    )}
    {children}
  </div>
);

export const Input: React.FC<{
  label?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  icon?: string;
}> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
  icon,
}) => (
  <div className={`mb-4 ${className}`}>
    {label && (
      <label className="block text-sm text-olive-800 dark:text-beige-300 mb-1.5 font-medium">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-beige-400">
          <i className={icon}></i>
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500 transition-all ${
          icon ? 'pr-10' : ''
        }`}
      />
    </div>
  </div>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  color?: 'olive' | 'beige' | 'red' | 'green' | 'blue' | 'purple' | 'amber';
}> = ({ children, color = 'olive' }) => {
  const colors = {
    olive: 'bg-olive-100 text-olive-800 dark:bg-olive-900/40 dark:text-olive-300 border border-olive-200/50 dark:border-olive-800/50',
    beige: 'bg-beige-200 text-beige-800 dark:bg-dark-border dark:text-beige-300 border border-beige-300/50',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200/50',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200/50',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/50',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200/50',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/50',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1 ${colors[color] || colors.beige}`}>
      {children}
    </span>
  );
};

export const formatDate = (dateString: string, full = false): string => {
  if (!dateString) return '';
  const options: Intl.DateTimeFormatOptions = full
    ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'long', day: 'numeric' };
  try {
    return new Date(dateString).toLocaleDateString('ar-SA', options);
  } catch {
    return dateString;
  }
};
