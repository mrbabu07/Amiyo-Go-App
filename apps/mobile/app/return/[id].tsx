import { useLocalSearchParams } from "expo-router";
import { ReturnDetailScreen } from "../../src/features/operations/ReturnDetailScreen";
export default function ReturnDetailRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <ReturnDetailScreen id={id} />; }
