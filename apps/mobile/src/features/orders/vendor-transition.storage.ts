import AsyncStorage from "@react-native-async-storage/async-storage";
import { createVendorTransitionRecovery } from "./vendor-transition-recovery";

export const vendorTransitionRecovery = createVendorTransitionRecovery(AsyncStorage);
