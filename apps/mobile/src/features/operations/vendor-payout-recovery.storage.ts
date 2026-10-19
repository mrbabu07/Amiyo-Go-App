import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { createPendingVendorPayoutStore } from "./pending-vendor-payout";

export const pendingVendorPayoutStore = createPendingVendorPayoutStore(AsyncStorage, async (uid) =>
  `amiyo.vendor-payout-recovery.v1.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uid)}`
);
