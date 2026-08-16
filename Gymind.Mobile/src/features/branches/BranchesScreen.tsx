import { useQuery } from "@tanstack/react-query";
import { getBranchAccess } from "@/api/branchesApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { BranchAccessCard } from "./BranchAccessCard";

export function BranchesScreen() {
  const query = useQuery({ queryKey: ["branches", "access"], queryFn: getBranchAccess });
  return (
    <ForgeScreen title="Branches" subtitle="Access and live capacity" refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {query.data?.length === 0 ? <EmptyState title="No accessible branches" message="Your active membership branch access will appear here." /> : null}
      {query.data?.map((branch) => <BranchAccessCard key={branch.branchId} branch={branch} />)}
    </ForgeScreen>
  );
}
