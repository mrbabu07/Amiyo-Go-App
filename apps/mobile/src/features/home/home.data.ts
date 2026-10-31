export type HomeCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  foreground: string;
};

export type HomeProduct = {
  id: string;
  slug?: string;
  title: string;
  shop: string;
  isVerified?: boolean;
  image: string;
  priceMinor: string;
  originalPriceMinor?: string;
  rating: number;
  reviewCount: number;
  badge?: string;
};
