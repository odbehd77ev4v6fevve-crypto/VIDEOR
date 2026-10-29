import React from 'react';

interface DotCircleLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'rose' | 'amber' | 'white';
  label?: string;
  className?: string;
  fullscreen?: boolean;
}

export const DotCircleLoader: React.FC<DotCircleLoaderProps> = ({
  size = 'md',
  variant = 'rose',
  label = 'Loading VIDORA...',
  className = '',
  fullscreen = false,
}) => {
  const dotCount = 8;
  const dots = Array.from({ length: dotCount });

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }[size];

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  const colorClasses = {
    rose: 'bg-rose-500 shadow-rose-500/50',
    amber: 'bg-amber-500 shadow-amber-500/50',
    white: 'bg-slate-200 shadow-white/40',
  }[variant];

  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3.5 select-none ${className}`}
    >
      <div className={`relative ${sizeClasses} animate-spin motion-reduce:animate-none [animation-duration:1.6s]`}>
        {dots.map((_, i) => {
          const angle = (i * 360) / dotCount;
          const radius = size === 'sm' ? 10 : size === 'md' ? 16 : 22;
          const rad = (angle * Math.PI) / 180;
          const x = Math.round(radius * Math.cos(rad));
          const y = Math.round(radius * Math.sin(rad));

          // Calculate center offset
          return (
            <span
              key={i}
              style={{
                transform: `translate(${x}px, ${y}px)`,
                animationDelay: `${(i * 1.6) / dotCount}s`,
              }}
              className={`absolute top-1/2 left-1/2 -ml-1 -mt-1 rounded-full ${dotSizeClasses} ${colorClasses} shadow-sm animate-pulse motion-reduce:animate-none`}
            />
          );
        })}
      </div>

      {label && (
        <p className="text-xs font-mono font-medium tracking-wider uppercase text-slate-400 animate-pulse motion-reduce:animate-none">
          {label}
        </p>
      )}
      <span className="sr-only">{label || 'Loading content...'}</span>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080c]/90 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};
