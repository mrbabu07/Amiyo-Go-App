import AsyncStorage from "@react-native-async-storage/async-storage";
import { createVendorBatchRecovery } from "./vendor-batch-recovery";

export const vendorBatchRecovery = createVendorBatchRecovery(AsyncStorage);
