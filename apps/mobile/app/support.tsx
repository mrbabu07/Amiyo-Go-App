import { SupportScreen } from "../src/features/support/SupportScreen";
import { useLocalSearchParams } from "expo-router";
export default function SupportRoute() { const { returnId } = useLocalSearchParams<{ returnId?: string }>(); return <SupportScreen returnId={typeof returnId === "string" ? returnId : undefined} />; }
