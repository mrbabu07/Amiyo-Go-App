import { useLocalSearchParams } from "expo-router";
import { VendorProductFormScreen } from "../../../../src/features/vendor/VendorProductFormScreen";
export default function VendorEditProductRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <VendorProductFormScreen id={id} />; }
