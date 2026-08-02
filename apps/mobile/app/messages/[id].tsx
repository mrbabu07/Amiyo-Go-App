import { useLocalSearchParams } from "expo-router";
import { ChatThreadScreen } from "../../src/features/engagement/ChatThreadScreen";
export default function Route() { const { id } = useLocalSearchParams<{ id: string }>(); return <ChatThreadScreen id={id} />; }
