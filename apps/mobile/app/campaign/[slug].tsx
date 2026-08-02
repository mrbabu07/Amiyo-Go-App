import { useLocalSearchParams } from "expo-router";
import { CampaignScreen } from "../../src/features/engagement/GrowthDetailScreen";
export default function Route() { const { slug } = useLocalSearchParams<{ slug: string }>(); return <CampaignScreen slug={slug} />; }
