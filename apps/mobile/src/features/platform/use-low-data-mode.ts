import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getPublicPlatformSettings } from "./platform.api";

const storageKey = "amiyo:low-data-mode";
let storedOverride: boolean | null | undefined;
let overrideLoad: Promise<boolean | null> | null = null;

function loadOverride() {
  if (storedOverride !== undefined) return Promise.resolve(storedOverride);
  overrideLoad ??= AsyncStorage.getItem(storageKey).then((value) => {
    storedOverride = value === null ? null : value === "true";
    return storedOverride;
  });
  return overrideLoad;
}

export function useLowDataMode() {
  const platform = useQuery({ queryKey: ["platform", "public-settings"], queryFn: getPublicPlatformSettings, staleTime: 5 * 60_000 });
  const village = platform.data?.villageOperations;
  const [override, setOverride] = useState<boolean | null>(storedOverride ?? null);
  useEffect(() => { void loadOverride().then(setOverride); }, []);
  const enabled = village?.enabled ? override ?? village.lowDataModeDefault : false;
  async function toggle() {
    if (!village?.allowCustomerLowDataOverride) return;
    const next = !enabled;
    storedOverride = next;
    setOverride(next);
    await AsyncStorage.setItem(storageKey, String(next));
  }
  return { enabled, toggle, village, settingsLoading: platform.isLoading };
}
