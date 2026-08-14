import { useLocalSearchParams } from "expo-router";
import { AdminChatDetailScreen } from "../../../src/features/admin/AdminChatDetailScreen";
export default function Route() { const { vendorId } = useLocalSearchParams<{ vendorId: string }>(); return <AdminChatDetailScreen threadId={vendorId} />; }
