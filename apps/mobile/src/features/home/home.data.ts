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
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  sold: number;
  badge?: string;
};
