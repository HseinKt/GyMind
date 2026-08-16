import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getClass } from "@/api/classesApi";
import { ForgeScreen } from "@/components/layout/ForgeScreen";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ForgeCard } from "@/components/ui/ForgeCard";
import { Text } from "react-native";
import { useForgeTheme } from "@/theme/theme";

export function ClassDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const query = useQuery({ queryKey: ["classes", id], queryFn: () => getClass(id), enabled: Number.isFinite(id) });
  const theme = useForgeTheme();
  return (
    <ForgeScreen title="Class details">
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {query.data ? <ForgeCard><Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>{query.data.title}</Text><Text style={{ color: theme.muted, marginTop: 8 }}>{query.data.description || "Details will appear when provided by the backend."}</Text></ForgeCard> : null}
    </ForgeScreen>
  );
}
