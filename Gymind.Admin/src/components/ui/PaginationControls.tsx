import { Button } from "./Button";

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange
}: {
  page: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const safeTotalPages = Math.max(totalPages || 1, 1);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-forge-border bg-white p-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {safePage} of {safeTotalPages}
        {typeof totalCount === "number" ? ` (${totalCount} total${pageSize ? `, ${pageSize} per page` : ""})` : null}
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
          Previous
        </Button>
        <Button type="button" variant="secondary" disabled={safePage >= safeTotalPages} onClick={() => onPageChange(safePage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
