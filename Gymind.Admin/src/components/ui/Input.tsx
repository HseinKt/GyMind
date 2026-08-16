import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`focus-ring w-full rounded-lg border border-forge-border bg-white px-3 py-2 text-sm ${className}`} />;
}
