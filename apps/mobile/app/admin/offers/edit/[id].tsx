import { useLocalSearchParams } from "expo-router";
import { AdminOfferFormScreen } from "../../../../src/features/admin/AdminOfferFormScreen";
export default function Route() { const { id } = useLocalSearchParams<{ id: string }>(); return <AdminOfferFormScreen id={id} />; }
