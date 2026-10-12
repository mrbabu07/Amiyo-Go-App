import { SupportScreen } from "../src/features/support/SupportScreen";
import { useLocalSearchParams } from "expo-router";
export default function SupportRoute() { const { returnId, orderId } = useLocalSearchParams<{ returnId?: string; orderId?: string }>(); return <SupportScreen returnId={typeof returnId === "string" ? returnId : undefined} orderId={typeof orderId === "string" ? orderId : undefined} />; }
