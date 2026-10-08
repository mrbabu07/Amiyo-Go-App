import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { createReorderRecovery } from "./reorder-recovery";

export const reorderRecovery = createReorderRecovery(AsyncStorage, async (uid, itemId) =>
  `amiyo.reorder.v1.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify([uid, itemId]))}`
);
