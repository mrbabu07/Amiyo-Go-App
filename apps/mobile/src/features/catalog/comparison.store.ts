import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const maximumProducts = 4;

type ComparisonState = {
  productIds: string[];
  addProduct: (productId: string) => void;
  removeProduct: (productId: string) => void;
  clearProducts: () => void;
};

export const useComparisonStore = create<ComparisonState>()(persist((set) => ({
  productIds: [],
  addProduct: (productId) => set((state) => state.productIds.includes(productId) || state.productIds.length >= maximumProducts ? state : { productIds: [...state.productIds, productId] }),
  removeProduct: (productId) => set((state) => ({ productIds: state.productIds.filter((id) => id !== productId) })),
  clearProducts: () => set({ productIds: [] })
}), { name: "amiyo-product-comparison", storage: createJSONStorage(() => AsyncStorage), partialize: (state) => ({ productIds: state.productIds }) }));
