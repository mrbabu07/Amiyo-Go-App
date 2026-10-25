import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getPublicPlatformSettings } from "./platform.api";

const storageKey = "amiyo:low-data-mode";

export function useLowDataMode() {
  const platform = useQuery({ queryKey: ["platform", "public-settings"], queryFn: getPublicPlatformSettings, staleTime: 5 * 60_000 });
  const village = platform.data?.villageOperations;
  const [override, setOverride] = useState<boolean | null>(null);
  useEffect(() => { void AsyncStorage.getItem(storageKey).then((value) => { if (value !== null) setOverride(value === "true"); }); }, []);
  const enabled = village?.enabled ? override ?? village.lowDataModeDefault : false;
  async function toggle() {
    if (!village?.allowCustomerLowDataOverride) return;
    const next = !enabled;
    setOverride(next);
    await AsyncStorage.setItem(storageKey, String(next));
  }
  return { enabled, toggle, village, settingsLoading: platform.isLoading };
}
