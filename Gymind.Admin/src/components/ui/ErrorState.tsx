import { AlertTriangle } from "lucide-react";

export function ErrorState({ title = "Unable to load data", message }: { title?: string; message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
      <div className="flex items-center gap-2 font-bold"><AlertTriangle size={18} />{title}</div>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}
