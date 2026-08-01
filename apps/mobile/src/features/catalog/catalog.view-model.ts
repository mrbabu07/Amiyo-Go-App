import type { ProductSummaryDto } from "@amiyo/contracts";
import type { HomeProduct } from "../home/home.data";

export const fallbackProductImage = "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=900&h=900&fit=crop";

export function toHomeProduct(product: ProductSummaryDto): HomeProduct {
  return {
    id: product.id,
    slug: product.slug,
    title: product.name,
    shop: product.shopName,
    image: product.thumbnailUrl || fallbackProductImage,
    price: Number(product.minimumPrice.amountMinor) / 100,
    rating: product.rating,
    sold: product.reviewCount,
    ...(product.status === "APPROVED" ? { badge: "Verified" } : {})
  };
}
