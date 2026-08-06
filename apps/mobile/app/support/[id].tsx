import { useLocalSearchParams } from "expo-router";
import { SupportThreadScreen } from "../../src/features/support/SupportThreadScreen";
export default function SupportThreadRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <SupportThreadScreen id={id} />; }
