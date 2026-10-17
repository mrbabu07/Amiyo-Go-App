import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { addWishlistItem, createWishlistCollection, deleteWishlistCollection, getWishlistCollections, renameWishlistCollection } from "./engagement.api";

export function WishlistCollections({ selectedId, onSelect }: { selectedId?: string; onSelect: (id?: string) => void }) {
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid); activeUid.current = user?.uid;
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [rename, setRename] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const query = useQuery({ queryKey: ["wishlist-collections", user?.uid], queryFn: () => getWishlistCollections(user!), enabled: Boolean(user) });
  const selected = query.data?.find((list) => list.id === selectedId);
  const mutation = useMutation({
    mutationFn: async (action: "create" | "rename" | "delete") => {
      if (!user) throw new Error("Sign in to manage collections.");
      if (action === "create") return { uid: user.uid, id: (await createWishlistCollection(user, name)).id, action };
      if (!selected || selected.isDefault) throw new Error("Choose a custom collection.");
      if (action === "rename") await renameWishlistCollection(user, selected.id, rename);
      else await deleteWishlistCollection(user, selected.id);
      return { uid: user.uid, id: action === "delete" ? undefined : selected.id, action };
    },
    onSuccess: (result) => {
      if (activeUid.current !== result.uid) return;
      void cache.invalidateQueries({ queryKey: ["wishlist-collections", result.uid] });
      void cache.invalidateQueries({ queryKey: ["wishlist", result.uid] });
      setName(""); setRename(""); setConfirmDelete(false);
      onSelect(result.id);
    }
  });
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Collections</Text>
    {query.isLoading ? <Text style={styles.copy}>Loading collections…</Text> : null}
    {query.error ? <><Text accessibilityRole="alert" style={styles.error}>Could not load collections.</Text><Pressable accessibilityRole="button" onPress={() => query.refetch()} style={styles.button}><Text style={styles.label}>Try again</Text></Pressable></> : null}
    {query.data?.map((list) => {
      const active = list.isDefault ? !selectedId || selectedId === list.id : selectedId === list.id;
      return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={list.id} onPress={() => { onSelect(list.isDefault ? undefined : list.id); setRename(""); setConfirmDelete(false); }} style={[styles.button, active && styles.active]}><Text style={styles.label}>{list.isDefault ? "All saved items" : list.name} ({list.itemCount})</Text></Pressable>;
    })}
    <Text style={styles.label}>New collection</Text>
    <TextInput accessibilityLabel="New collection name" value={name} onChangeText={setName} maxLength={80} placeholder="Birthday gifts" placeholderTextColor={colors.muted} style={styles.input} />
    <Pressable accessibilityRole="button" disabled={mutation.isPending || !name.trim()} onPress={() => mutation.mutate("create")} style={styles.button}><Text style={styles.label}>{mutation.isPending ? "Saving…" : "Create list"}</Text></Pressable>
    {selected && !selected.isDefault ? <>
      <Text style={styles.label}>Rename {selected.name}</Text>
      <TextInput accessibilityLabel="Collection new name" value={rename} onChangeText={setRename} maxLength={80} placeholder={selected.name} placeholderTextColor={colors.muted} style={styles.input} />
      <Pressable accessibilityRole="button" disabled={mutation.isPending || !rename.trim()} onPress={() => mutation.mutate("rename")} style={styles.button}><Text style={styles.label}>Save name</Text></Pressable>
      {confirmDelete ? <><Text style={styles.copy}>Delete this collection and its share link? Items saved in other lists will stay there.</Text><Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => mutation.mutate("delete")} style={styles.button}><Text style={styles.error}>Confirm delete collection</Text></Pressable><Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => setConfirmDelete(false)} style={styles.button}><Text style={styles.label}>Keep collection</Text></Pressable></> : <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} style={styles.button}><Text style={styles.error}>Delete collection</Text></Pressable>}
    </> : null}
    {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{mutation.error.message}</Text> : null}
  </View>;
}

export function WishlistCollectionPicker({ productId, selectedId }: { productId: string; selectedId?: string }) {
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid); activeUid.current = user?.uid;
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["wishlist-collections", user?.uid], queryFn: () => getWishlistCollections(user!), enabled: Boolean(user) && open });
  const save = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sign in to save this product.");
      await addWishlistItem(user, productId, id);
      return user.uid;
    },
    onSuccess: (uid) => {
      if (activeUid.current !== uid) return;
      void cache.invalidateQueries({ queryKey: ["wishlist", uid] });
      void cache.invalidateQueries({ queryKey: ["wishlist-collections", uid] });
      setOpen(false);
    }
  });
  return <View style={styles.picker}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.button}><Text style={styles.label}>Save to collection</Text></Pressable>
    {open ? <>
      {query.isLoading ? <Text style={styles.copy}>Loading lists…</Text> : null}
      {query.error ? <Pressable accessibilityRole="button" onPress={() => query.refetch()} style={styles.button}><Text style={styles.error}>Could not load lists. Retry</Text></Pressable> : null}
      {query.data?.filter((list) => list.id !== selectedId).map((list) => <Pressable accessibilityRole="button" disabled={save.isPending} key={list.id} onPress={() => save.mutate(list.id)} style={styles.button}><Text style={styles.label}>{list.isDefault ? "All saved items" : list.name}</Text></Pressable>)}
    </> : null}
    {save.error ? <Text accessibilityRole="alert" style={styles.error}>{save.error.message}</Text> : null}
    {save.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.copy}>Saved to collection</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  picker: { padding: spacing.sm, gap: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  label: { color: colors.text, fontWeight: "500", flexShrink: 1 },
  copy: { color: colors.muted, lineHeight: 20 },
  error: { color: colors.danger },
  input: { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, minHeight: 44, paddingHorizontal: spacing.sm },
  button: { minHeight: 44, justifyContent: "center", padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.background },
  active: { backgroundColor: colors.primarySoft },
});
