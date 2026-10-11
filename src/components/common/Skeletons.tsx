import React from 'react';

/**
 * Base shimmering skeleton block
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`bg-slate-200/80 animate-pulse rounded-md ${className}`}
      aria-hidden="true"
    />
  );
};

/**
 * Skeleton for a single Property Card, precisely matching PropertyCard.tsx
 */
export const PropertyCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden animate-pulse">
      {/* Property Image Container Skeleton */}
      <div className="relative aspect-16/10 bg-slate-200 overflow-hidden">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-shimmer" />

        {/* Top Badges Placeholders */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <div className="h-5 w-20 bg-slate-300/80 rounded-full" />
          <div className="h-5 w-16 bg-slate-300/80 rounded-full" />
        </div>

        {/* Favorite Button Placeholder */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-300/80" />

        {/* Multi-unit badge placeholder */}
        <div className="absolute bottom-3 left-3 h-6 w-36 bg-slate-300/80 rounded-lg" />
      </div>

      {/* Card Body Skeleton */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Price Header Skeleton */}
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <div className="h-6 w-28 bg-slate-200 rounded-lg" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>

          {/* Title Skeleton (2 lines) */}
          <div className="space-y-1.5 mb-3">
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>

          {/* Location Skeleton */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-200 shrink-0" />
            <div className="h-3 w-44 bg-slate-100 rounded" />
          </div>

          {/* Key Attributes Skeleton */}
          <div className="flex items-center gap-4 py-3 border-y border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-slate-200" />
              <div className="h-3 w-12 bg-slate-100 rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-slate-200" />
              <div className="h-3 w-12 bg-slate-100 rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-slate-200" />
              <div className="h-3 w-14 bg-slate-100 rounded" />
            </div>
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="pt-2 flex items-center gap-2">
          <div className="h-9 flex-1 bg-slate-200 rounded-xl" />
          <div className="h-9 w-20 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

/**
 * Responsive Grid of Property Card Skeletons
 */
export const PropertyListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading properties">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Dashboard KPI Metric Cards Skeleton
 */
export const DashboardStatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="h-3 w-28 bg-slate-200 rounded" />
          <div className="h-8 w-36 bg-slate-300 rounded-lg" />
          <div className="h-3 w-40 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
};

/**
 * Dashboard Table Skeleton for Properties, Reservations, Payments, Viewings
 */
export const DashboardTableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  title?: string;
}> = ({ rows = 5, columns = 6, title }) => {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden animate-pulse bg-white">
      {title && (
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-100 rounded" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="py-3.5 px-4 text-left">
                  <div className="h-3 w-16 bg-slate-300 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c} className="py-4 px-4">
                    {c === 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1 min-w-[120px]">
                          <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
                          <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
                        </div>
                      </div>
                    ) : c === columns - 1 ? (
                      <div className="flex justify-end gap-2">
                        <div className="h-7 w-12 bg-slate-200 rounded-lg" />
                        <div className="h-7 w-7 bg-slate-100 rounded-lg" />
                      </div>
                    ) : c === 3 || c === 4 ? (
                      <div className="h-5 w-20 bg-slate-200 rounded-full" />
                    ) : (
                      <div className="h-3 w-20 bg-slate-200 rounded" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Staff Roster Table Skeleton
 */
export const StaffTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden animate-pulse bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="py-3 px-4 text-left"><div className="h-3 w-20 bg-slate-300 rounded" /></th>
            <th className="py-3 px-4 text-left"><div className="h-3 w-12 bg-slate-300 rounded" /></th>
            <th className="py-3 px-4 text-left"><div className="h-3 w-16 bg-slate-300 rounded" /></th>
            <th className="py-3 px-4 text-left"><div className="h-3 w-14 bg-slate-300 rounded" /></th>
            <th className="py-3 px-4 text-right"><div className="h-3 w-20 bg-slate-300 rounded ml-auto" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                  <div className="h-3.5 w-28 bg-slate-200 rounded" />
                </div>
              </td>
              <td className="py-3.5 px-4">
                <div className="h-5 w-24 bg-slate-200 rounded-md" />
              </td>
              <td className="py-3.5 px-4">
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </td>
              <td className="py-3.5 px-4">
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </td>
              <td className="py-3.5 px-4 text-right">
                <div className="h-7 w-28 bg-slate-200 rounded-lg ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Customer Portal Items Skeleton (for Reservations, Payments, Viewings)
 */
export const CustomerPortalListSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => {
  return (
    <div className="divide-y divide-slate-100 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-200 rounded-full" />
            </div>
            <div className="h-4 w-48 bg-slate-300 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
          <div className="space-y-2 text-right">
            <div className="h-5 w-24 bg-slate-200 rounded ml-auto" />
            <div className="h-3 w-28 bg-slate-100 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};
