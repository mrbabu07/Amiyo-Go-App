import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import type { LocationOption } from "../data/locations";

type Props = {
  disabled?: boolean;
  label: string;
  onChange(id: string): void;
  options: LocationOption[];
  placeholder: string;
  required?: boolean;
  value: string;
};

export function LocationSelect({ disabled, label, onChange, options, placeholder, required, value }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.id === value);
  const visibleOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? options.filter((option) => option.name.toLowerCase().includes(query)) : options;
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? " *" : ""}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.select, disabled && styles.disabled]}
      >
        <Text numberOfLines={1} style={[styles.value, !selected && styles.placeholder]}>
          {selected?.name ?? placeholder}
        </Text>
        <Ionicons color={colors.muted} name="chevron-down" size={18} />
      </Pressable>
      <Modal animationType="fade" onRequestClose={close} transparent visible={open}>
        <Pressable onPress={close} style={styles.backdrop}>
          <Pressable onPress={() => undefined} style={styles.modal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>SHOP ADDRESS</Text>
                <Text style={styles.modalTitle}>{placeholder}</Text>
              </View>
              <Pressable accessibilityLabel="Close" onPress={close} style={styles.close}>
                <Ionicons color={colors.text} name="close" size={21} />
              </Pressable>
            </View>
            <View style={styles.search}>
              <Ionicons color={colors.muted} name="search-outline" size={18} />
              <TextInput
                autoFocus
                onChangeText={setSearch}
                placeholder={`Search ${label.toLowerCase()}`}
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                value={search}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
              {visibleOptions.map((option) => {
                const active = option.id === value;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      onChange(option.id);
                      close();
                    }}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.name}</Text>
                    {active ? <Ionicons color={colors.primary} name="checkmark-circle" size={20} /> : null}
                  </Pressable>
                );
              })}
              {!visibleOptions.length ? <Text style={styles.empty}>No location found.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, gap: 6, minWidth: 0, width: "100%" },
  label: { color: colors.text, fontSize: 13, fontWeight: "700" },
  select: { alignItems: "center", backgroundColor: colors.surface, borderColor: "#d1d5db", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", minHeight: 48, paddingHorizontal: 14 },
  disabled: { backgroundColor: "#f3f4f6", opacity: 0.65 },
  value: { color: colors.text, flex: 1, fontSize: 14 },
  placeholder: { color: colors.muted },
  backdrop: { alignItems: "center", backgroundColor: "rgba(15,23,42,.48)", flex: 1, justifyContent: "center", padding: spacing.md },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, maxHeight: "78%", maxWidth: 520, padding: spacing.lg, width: "100%" },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  modalEyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 3 },
  close: { alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: radius.pill, height: 38, justifyContent: "center", width: 38 },
  search: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: spacing.md, paddingHorizontal: 12 },
  searchInput: { color: colors.text, flex: 1, minHeight: 46, outlineStyle: "none" } as never,
  list: { marginTop: spacing.sm },
  option: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", minHeight: 48, paddingHorizontal: 10 },
  optionActive: { backgroundColor: colors.primarySoft, borderRadius: radius.sm },
  optionText: { color: colors.text, flex: 1, fontSize: 14 },
  optionTextActive: { color: colors.primary, fontWeight: "800" },
  empty: { color: colors.muted, padding: spacing.lg, textAlign: "center" }
});
