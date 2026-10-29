import React from 'react';

export const SkeletonBox: React.FC<{
  className?: string;
  rounded?: string;
}> = ({ className = 'h-4 w-full', rounded = 'rounded-xl' }) => (
  <div
    className={`bg-slate-900/80 border border-slate-800/60 animate-pulse motion-reduce:animate-none ${rounded} ${className}`}
  />
);

export const VideoCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl overflow-hidden bg-slate-950/40 border border-slate-800/80 p-2.5 space-y-3"
      >
        {/* Thumbnail Aspect */}
        <div className="w-full aspect-video rounded-xl bg-slate-900/90 animate-pulse motion-reduce:animate-none border border-slate-800/50" />
        {/* Info Area */}
        <div className="space-y-2 p-1">
          <SkeletonBox className="h-4 w-3/4" />
          <div className="flex items-center justify-between pt-1">
            <SkeletonBox className="h-3 w-1/3" />
            <SkeletonBox className="h-3 w-1/5" />
          </div>
        </div>
      </div>
    ))}
  </>
);

export const HeroSkeleton: React.FC = () => (
  <section className="relative w-full bg-[#050608] border-b border-slate-800/80 p-8 md:py-20">
    <div className="max-w-7xl mx-auto space-y-6">
      <SkeletonBox className="h-6 w-32" rounded="rounded-full" />
      <SkeletonBox className="h-12 w-3/5" rounded="rounded-2xl" />
      <SkeletonBox className="h-5 w-2/5" />
      <div className="flex items-center gap-4 pt-4">
        <SkeletonBox className="h-11 w-36" rounded="rounded-xl" />
        <SkeletonBox className="h-11 w-32" rounded="rounded-xl" />
      </div>
    </div>
  </section>
);

export const DashboardMetricsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-3"
      >
        <div className="flex items-center justify-between">
          <SkeletonBox className="h-3 w-20" />
          <SkeletonBox className="h-8 w-8" rounded="rounded-xl" />
        </div>
        <SkeletonBox className="h-8 w-28" />
        <SkeletonBox className="h-2.5 w-36" />
      </div>
    ))}
  </div>
);

export const TableRowsSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="divide-y divide-slate-800/80">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SkeletonBox className="w-16 h-10 shrink-0" rounded="rounded-lg" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <SkeletonBox className="h-3.5 w-2/3" />
            <SkeletonBox className="h-2.5 w-1/3" />
          </div>
        </div>
        <SkeletonBox className="h-7 w-20 shrink-0" rounded="rounded-lg" />
      </div>
    ))}
  </div>
);
