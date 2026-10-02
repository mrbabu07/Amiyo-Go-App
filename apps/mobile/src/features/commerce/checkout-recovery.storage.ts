import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { createPendingCheckoutStore } from "./pending-checkout";

export const pendingCheckoutStore = createPendingCheckoutStore(AsyncStorage, async (uid) =>
  `amiyo.checkout-recovery.v1.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uid)}`
);
