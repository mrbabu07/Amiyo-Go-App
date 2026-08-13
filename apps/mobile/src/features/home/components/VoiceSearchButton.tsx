import { Ionicons } from "@expo/vector-icons";
import type { ExpoSpeechRecognitionErrorEvent, ExpoSpeechRecognitionResultEvent } from "expo-speech-recognition";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";
import { colors, radius } from "../../../ui/tokens";

export function VoiceSearchButton({ onResult }: { onResult(transcript: string): void }) {
  const [listening, setListening] = useState(false);
  const moduleRef = useRef<Awaited<ReturnType<typeof loadSpeechModule>> | null>(null);
  const subscriptions = useRef<Array<{ remove(): void }>>([]);

  useEffect(() => () => { subscriptions.current.forEach((subscription) => subscription.remove()); moduleRef.current?.abort(); }, []);

  async function module() {
    if (moduleRef.current) return moduleRef.current;
    const speech = await loadSpeechModule();
    subscriptions.current = [
      speech.addListener("start", () => setListening(true)),
      speech.addListener("end", () => setListening(false)),
      speech.addListener("result", (event: ExpoSpeechRecognitionResultEvent) => { const transcript = event.results[0]?.transcript.trim(); if (event.isFinal && transcript) onResult(transcript); }),
      speech.addListener("error", (event: ExpoSpeechRecognitionErrorEvent) => { setListening(false); if (event.error !== "aborted" && event.error !== "no-speech") Alert.alert("Voice search unavailable", event.message || "Please type your search instead."); })
    ];
    moduleRef.current = speech;
    return speech;
  }

  async function toggle() {
    try {
      const speech = await module();
      if (listening) { speech.stop(); return; }
      if (!speech.isRecognitionAvailable()) { Alert.alert("Voice search unavailable", "Speech recognition is not supported by this browser or device."); return; }
      const permission = await speech.requestPermissionsAsync();
      if (!permission.granted) { Alert.alert("Microphone permission required", "Allow microphone and speech recognition access to search by voice."); return; }
      speech.start({ lang: "en-BD", interimResults: true, continuous: false, maxAlternatives: 1 });
    } catch {
      Alert.alert("Voice search unavailable", "Use a supported browser or an Amiyo-Go development/production build. You can still type your search.");
    }
  }

  return <Pressable accessibilityLabel={listening ? "Stop voice search" : "Search by voice"} accessibilityRole="button" accessibilityState={{ busy: listening }} onPress={() => void toggle()} style={[styles.button, listening && styles.listening]}><Ionicons color={listening ? colors.surface : colors.primary} name={listening ? "mic" : "mic-outline"} size={21} /></Pressable>;
}

async function loadSpeechModule() { return (await import("expo-speech-recognition")).ExpoSpeechRecognitionModule; }

const styles = StyleSheet.create({ button: { alignItems: "center", borderLeftColor: colors.border, borderLeftWidth: 1, height: 42, justifyContent: "center", width: 44 }, listening: { backgroundColor: colors.danger, borderRadius: radius.sm } });
