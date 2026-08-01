export type HomeCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type HomeProduct = {
  id: string;
  title: string;
  shop: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  sold: number;
  badge?: string;
};

export const categories: HomeCategory[] = [
  { id: "fashion", name: "Fashion", icon: "shirt-outline", color: "#fce7f3" },
  { id: "electronics", name: "Electronics", icon: "phone-portrait-outline", color: "#dbeafe" },
  { id: "beauty", name: "Beauty", icon: "sparkles-outline", color: "#fef3c7" },
  { id: "home", name: "Home & Living", icon: "home-outline", color: "#dcfce7" },
  { id: "baby", name: "Baby Care", icon: "happy-outline", color: "#f3e8ff" },
  { id: "grocery", name: "Grocery", icon: "basket-outline", color: "#ffedd5" },
  { id: "sports", name: "Sports", icon: "football-outline", color: "#cffafe" },
  { id: "more", name: "All Categories", icon: "grid-outline", color: "#e2e8f0" }
];

export const flashProducts: HomeProduct[] = [
  { id: "wireless-headphones", title: "Premium Wireless Headphones", shop: "Tech Gallery", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&h=700&fit=crop", price: 2490, originalPrice: 3490, rating: 4.8, sold: 124, badge: "Flash sale" },
  { id: "smart-watch", title: "Active Smart Watch Series 8", shop: "Gadget Zone", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&h=700&fit=crop", price: 1890, originalPrice: 2590, rating: 4.7, sold: 89, badge: "Top rated" },
  { id: "sneakers", title: "Everyday Comfort Sneakers", shop: "Urban Steps", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&h=700&fit=crop", price: 1590, originalPrice: 2190, rating: 4.6, sold: 203, badge: "Free delivery" },
  { id: "backpack", title: "Water Resistant Travel Backpack", shop: "Daily Carry", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700&h=700&fit=crop", price: 1290, originalPrice: 1690, rating: 4.5, sold: 67 },
  { id: "skincare", title: "Hydrating Daily Skincare Set", shop: "Glow House", image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=700&h=700&fit=crop", price: 990, originalPrice: 1390, rating: 4.9, sold: 156, badge: "Official store" }
];

export const recommendedProducts: HomeProduct[] = [
  { id: "camera", title: "Compact Mirrorless Camera", shop: "Camera World", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&h=700&fit=crop", price: 48990, rating: 4.9, sold: 42, badge: "Official store" },
  { id: "sunglasses", title: "Classic Polarized Sunglasses", shop: "Style Avenue", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=700&h=700&fit=crop", price: 890, originalPrice: 1190, rating: 4.5, sold: 74 },
  { id: "chair", title: "Modern Lounge Chair", shop: "Home Studio", image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=700&h=700&fit=crop", price: 6490, rating: 4.7, sold: 31, badge: "New arrival" },
  { id: "perfume", title: "Signature Eau de Parfum", shop: "Essence BD", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=700&h=700&fit=crop", price: 2290, originalPrice: 2790, rating: 4.8, sold: 98 },
  { id: "plant", title: "Indoor Plant with Ceramic Pot", shop: "Green Corner", image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=700&h=700&fit=crop", price: 690, rating: 4.6, sold: 53 },
  { id: "coffee", title: "Premium Roasted Coffee Beans", shop: "Bean Theory", image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=700&h=700&fit=crop", price: 780, rating: 4.9, sold: 118, badge: "Best seller" }
];
