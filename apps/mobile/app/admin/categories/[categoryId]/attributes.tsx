import { useLocalSearchParams } from "expo-router";
import { AdminCategoryAttributesScreen } from "../../../../src/features/admin/AdminCategoryAttributesScreen";
export default function Route() { const { categoryId } = useLocalSearchParams<{ categoryId: string }>(); return <AdminCategoryAttributesScreen initialCategoryId={categoryId} />; }
