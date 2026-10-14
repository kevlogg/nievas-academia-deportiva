import React from "react";
import { BELT_CONFIG, KarateBelt } from "@/types";
import { cn } from "@/lib/utils";

interface BeltBadgeProps {
  belt: KarateBelt;
  size?: "sm" | "md" | "lg";
  showKanji?: boolean;
  className?: string;
}

export function BeltBadge({
  belt,
  size = "md",
  showKanji = true,
  className,
}: BeltBadgeProps) {
  const config = BELT_CONFIG[belt] || BELT_CONFIG["Blanco"];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5 font-medium",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border shadow-xs transition-transform duration-150 select-none",
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizeClasses[size],
        className
      )}
      title={`Cinturón ${belt}`}
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20 dark:border-white/20"
        style={{
          background: config.indicatorBg,
        }}
        aria-hidden="true"
      />
      <span>{belt}</span>
      {showKanji && (
        <span
          className="text-[10px] opacity-75 font-serif font-normal"
          aria-hidden="true"
        >
          {config.kanji}
        </span>
      )}
    </span>
  );
}
