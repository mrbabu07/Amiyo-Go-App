import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { getGrowthFeed } from "./engagement.api";

export function CampaignScreen({ slug }: { slug: string }) { const query = useQuery({ queryKey: ["growth", "feed"], queryFn: getGrowthFeed }); const item = query.data?.campaigns.find((campaign) => campaign.slug === slug); return <Screen title={item?.name || "Campaign"} description="Published campaign details and deep-link destination.">{query.isLoading ? <ActivityIndicator /> : null}{item ? <ModuleCard title={item.name} meta={`Ends ${new Date(item.endsAt).toLocaleString()}`}><Text>Explore eligible campaign products from the marketplace.</Text></ModuleCard> : null}</Screen>; }
export function FlashSaleScreen({ id }: { id: string }) { const query = useQuery({ queryKey: ["growth", "feed"], queryFn: getGrowthFeed }); const item = query.data?.flashSales.find((sale) => sale.id === id); return <Screen title={item?.name || "Flash sale"} description="Live, database-backed flash-sale availability.">{query.isLoading ? <ActivityIndicator /> : null}{item?.products.map((product) => <ModuleCard key={product.productId} title={`${product.price.amountMinor} ${product.price.currency}`} meta={product.quantityRemaining === null ? "No published limit" : `${product.quantityRemaining} remaining`}><Text>Product {product.productId}</Text></ModuleCard>)}</Screen>; }
