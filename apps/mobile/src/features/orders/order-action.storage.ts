import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { createPendingOrderActionStore } from "./pending-order-action";

export const pendingOrderActions = createPendingOrderActionStore(AsyncStorage, async (uid, orderId) =>
  `amiyo.order-action.v1.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify([uid, orderId]))}`
);
