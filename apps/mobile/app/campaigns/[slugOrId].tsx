import { useLocalSearchParams } from "expo-router";
import { CampaignScreen } from "../../src/features/engagement/GrowthDetailScreen";
export default function CampaignAliasRoute() { const { slugOrId } = useLocalSearchParams<{ slugOrId: string }>(); return <CampaignScreen slug={slugOrId} />; }
