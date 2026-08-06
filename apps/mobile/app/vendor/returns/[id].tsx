import { useLocalSearchParams } from "expo-router";
import { ReturnDetailScreen } from "../../../src/features/operations/ReturnDetailScreen";
export default function VendorReturnDetailRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <ReturnDetailScreen id={id} vendor />; }
