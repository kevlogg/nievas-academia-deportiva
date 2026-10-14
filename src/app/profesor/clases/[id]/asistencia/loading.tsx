import React from "react";

export default function AsistenciaLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-pulse">
      {/* Back button skeleton */}
      <div className="h-6 w-32 bg-slate-800 rounded-md" />

      {/* Header session card skeleton */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-800 rounded-full" />
            <div className="h-6 w-52 bg-slate-800 rounded-md" />
          </div>
          <div className="h-8 w-24 bg-slate-800 rounded-xl" />
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
          <div className="h-12 bg-slate-950/70 rounded-xl" />
          <div className="h-12 bg-slate-950/70 rounded-xl" />
          <div className="h-12 bg-slate-950/70 rounded-xl" />
          <div className="h-12 bg-slate-950/70 rounded-xl" />
        </div>
      </div>

      {/* Quick action buttons skeleton */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-12 bg-slate-900 rounded-xl border border-slate-800" />
        <div className="h-12 bg-slate-900 rounded-xl border border-slate-800" />
      </div>

      {/* Student cards skeleton */}
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800" />
              <div className="space-y-2">
                <div className="h-4 w-36 bg-slate-800 rounded-md" />
                <div className="h-3 w-24 bg-slate-800 rounded-md" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-slate-800 rounded-xl" />
              <div className="h-10 w-20 bg-slate-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
