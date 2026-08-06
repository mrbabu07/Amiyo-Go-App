import { useLocalSearchParams } from "expo-router";
import { ChatThreadScreen } from "../../../src/features/engagement/ChatThreadScreen";
export default function VendorMessageRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <ChatThreadScreen id={id} inboxPath="/vendor/messages" />; }
