import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`focus-ring w-full rounded-lg border border-forge-border bg-white px-3 py-2 text-sm ${className}`} />;
}
