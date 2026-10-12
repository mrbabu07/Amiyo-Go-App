import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { createWishlistCartRecovery } from "./wishlist-cart-recovery";

export const wishlistCartRecovery = createWishlistCartRecovery(
  AsyncStorage,
  async (uid, collectionId) => `amiyo.wishlist-cart.v1.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify([uid, collectionId]))}`,
  () => Crypto.randomUUID()
);
