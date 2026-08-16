import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`focus-ring min-h-24 w-full rounded-lg border border-forge-border bg-white px-3 py-2 text-sm ${className}`} />;
}
