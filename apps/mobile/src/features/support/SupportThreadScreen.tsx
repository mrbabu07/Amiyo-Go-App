import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { User } from "@firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { pickAndUploadDocument } from "../media/media.api";
import { accessSupportAttachment, getMyTickets, replyToTicket } from "./support.api";

type Attachment = { storageKey: string; name: string; mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" };
type SavedAttachment = { id: string; name: string; mimeType: Attachment["mimeType"] };

export function SupportThreadScreen({ id, basePath = "/support", audience = "customer" }: { id: string; basePath?: "/support" | "/vendor/support"; audience?: "customer" | "seller" }) {
  const compact = useWindowDimensions().width < 620;
  const router = useRouter();
  const cache = useQueryClient();
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  useEffect(() => { setBody(""); setFiles([]); setUploading(false); setOpeningAttachment(null); setAttachmentError(null); }, [id, user?.uid]);
  const tickets = useQuery({ queryKey: ["support", "mine", user?.uid], queryFn: () => getMyTickets(user!), enabled: Boolean(user), retry: false });
  const ticket = tickets.data?.find((item) => item.id === id);
  const reply = useMutation({ retry: false, mutationFn: (owner: User) => replyToTicket(owner, id, body.trim(), files), onSuccess: async (_data, owner) => {
    if (activeUid.current !== owner.uid) return;
    setBody(""); setFiles([]);
    await cache.invalidateQueries({ queryKey: ["support", "mine", owner.uid] });
  } });
  const addFile = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const result = await pickAndUploadDocument(user, "support");
      if (result && activeUid.current === user.uid) setFiles((current) => current.length < 5 ? [...current, { storageKey: result.storageKey, name: result.originalName, mimeType: result.mimeType as Attachment["mimeType"] }] : current);
    } finally { if (activeUid.current === user.uid) setUploading(false); }
  };
  const openAttachment = async (file: SavedAttachment) => {
    if (!user || openingAttachment) return;
    setOpeningAttachment(file.id);
    setAttachmentError(null);
    try {
      const signed = await accessSupportAttachment(user, id, file.id, file.mimeType === "application/pdf");
      if (activeUid.current === user.uid) await Linking.openURL(signed.url);
    } catch (error) {
      if (activeUid.current === user.uid) setAttachmentError(error instanceof Error ? error.message : "Could not open this attachment");
    } finally {
      if (activeUid.current === user.uid) setOpeningAttachment(null);
    }
  };
  if (tickets.isLoading) return <Screen title="Support conversation"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!ticket) return <Screen title="Ticket unavailable" description="This support request could not be found."><Pressable onPress={() => router.replace(basePath)} style={styles.primary}><Text style={styles.primaryText}>Back to support</Text></Pressable></Screen>;
  return <Screen eyebrow={audience === "seller" ? "SELLER SUPPORT THREAD" : "SUPPORT THREAD"} title={ticket.subject} description={`${ticket.category} · Ticket #${ticket.id.slice(0, 8).toUpperCase()}`}>
    <View style={[styles.header, compact && styles.headerCompact]}><Pressable onPress={() => router.replace(basePath)} style={styles.back}><Ionicons color={colors.primary} name="arrow-back" size={18} /><Text style={styles.backText}>All tickets</Text></Pressable><Text style={styles.status}>{ticket.status.replaceAll("_", " ").toUpperCase()}</Text></View>
    {ticket.orderId || ticket.returnId ? <View style={[styles.context, compact && styles.contextCompact]}><View style={styles.contextCopy}><Text style={styles.contextTitle}>Linked case context</Text><Text style={styles.date}>{ticket.returnId ? `Return #${ticket.returnId.slice(0, 8).toUpperCase()}` : "Order support"}</Text></View><View style={[styles.contextActions, compact && styles.contextActionsCompact]}>{ticket.orderId ? <Pressable accessibilityRole="link" onPress={() => router.push((audience === "seller" ? { pathname: "/vendor/orders", params: { orderId: ticket.orderId } } : `/orders/${ticket.orderId}`) as never)} style={[styles.contextButton, compact && styles.contextButtonCompact]}><Text style={styles.contextButtonText}>View order</Text></Pressable> : null}{ticket.returnId ? <Pressable accessibilityRole="link" onPress={() => router.push((audience === "seller" ? `/vendor/returns/${ticket.returnId}` : `/return/${ticket.returnId}`) as never)} style={[styles.contextButton, compact && styles.contextButtonCompact]}><Text style={styles.contextButtonText}>Track return</Text></Pressable> : null}</View></View> : null}
    <View style={styles.thread}>{ticket.messages.map((message, index) => <View key={message.id} style={[styles.message, compact && styles.messageCompact, index === 0 && styles.opening]}><Text style={styles.sender}>{index === 0 ? "Request opened" : "Conversation update"}</Text><Text style={styles.body}>{message.body}</Text>{message.attachments.map((file) => <SavedAttachmentRow busy={openingAttachment === file.id} disabled={Boolean(openingAttachment)} file={file} key={file.id} open={() => void openAttachment(file)} />)}<Text style={styles.date}>{new Date(message.createdAt).toLocaleString("en-BD")}</Text></View>)}</View>
    {attachmentError ? <View accessibilityRole="alert" style={styles.error}><Ionicons color={colors.danger} name="alert-circle-outline" size={19} /><Text style={styles.errorText}>{attachmentError}</Text></View> : null}
    {ticket.status !== "closed" ? <View style={styles.composer}><View style={styles.composerHeading}><View><Text style={styles.composerTitle}>Reply to support</Text><Text style={styles.composerMeta}>Your message and attachments stay inside this protected ticket.</Text></View><Ionicons color={colors.primary} name="shield-checkmark-outline" size={22} /></View><TextInput accessibilityLabel="Support reply" maxLength={3000} multiline onChangeText={setBody} placeholder="Write a clear update for the support team…" placeholderTextColor={colors.muted} style={styles.input} value={body} /><View style={styles.attachRow}><Pressable accessibilityRole="button" disabled={uploading || files.length >= 5} onPress={() => void addFile()} style={[styles.attach, (uploading || files.length >= 5) && styles.disabled]}>{uploading ? <ActivityIndicator color={colors.primary} /> : <Ionicons color={colors.primary} name="attach-outline" size={18} />}<Text style={styles.attachText}>{uploading ? "Uploading…" : `Attach image or PDF (${files.length}/5)`}</Text></Pressable></View>{files.map((file) => <AttachmentRow file={file} key={file.storageKey} remove={() => setFiles((current) => current.filter((item) => item.storageKey !== file.storageKey))} />)}<Pressable accessibilityRole="button" accessibilityState={{ busy: reply.isPending, disabled: !user || reply.isPending || !body.trim() }} disabled={!user || reply.isPending || !body.trim()} onPress={() => user && reply.mutate(user)} style={[styles.primary, (reply.isPending || !body.trim()) && styles.disabled]}>{reply.isPending ? <ActivityIndicator color={colors.surface} /> : <Ionicons color={colors.surface} name="send-outline" size={18} />}<Text style={styles.primaryText}>{reply.isPending ? "Sending…" : "Send reply"}</Text></Pressable></View> : <View style={styles.closed}><Ionicons color={colors.muted} name="lock-closed-outline" size={19} /><Text style={styles.closedText}>This ticket is closed. Create a new ticket if you need more help.</Text></View>}
    {reply.error ? <View accessibilityRole="alert" style={styles.error}><Ionicons color={colors.danger} name="alert-circle-outline" size={19} /><Text style={styles.errorText}>{reply.error.message}</Text></View> : null}
  </Screen>;
}

function AttachmentRow({ file, remove }: { file: Attachment; remove?: () => void }) { return <View style={styles.attachment}><Ionicons color={colors.primary} name="document-attach-outline" size={17} /><Text numberOfLines={1} style={styles.attachmentText}>{file.name}</Text>{remove ? <Pressable onPress={remove}><Ionicons color={colors.danger} name="close-circle" size={19} /></Pressable> : null}</View>; }
function SavedAttachmentRow({ busy, disabled, file, open }: { busy: boolean; disabled: boolean; file: SavedAttachment; open: () => void }) { return <Pressable accessibilityLabel={`Open attachment ${file.name}`} accessibilityRole="link" disabled={disabled} onPress={open} style={[styles.attachment, disabled && !busy && styles.disabled]}><Ionicons color={colors.primary} name="document-attach-outline" size={17} /><Text numberOfLines={1} style={styles.attachmentText}>{file.name}</Text>{busy ? <ActivityIndicator color={colors.primary} size="small" /> : <Ionicons color={colors.primary} name="open-outline" size={17} />}</Pressable>; }

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }, headerCompact: { alignItems: "flex-start", flexWrap: "wrap" }, back: { alignItems: "center", flexDirection: "row", gap: 6, minHeight: 44 }, backText: { color: colors.primary, fontWeight: "700" }, status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  context: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between", padding: spacing.md }, contextCompact: { alignItems: "stretch", flexDirection: "column" }, contextCopy: { flex: 1, minWidth: 150 }, contextTitle: { color: colors.text, fontSize: 13, fontWeight: "700" }, contextActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, contextActionsCompact: { flexDirection: "column" }, contextButton: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md }, contextButtonCompact: { width: "100%" }, contextButtonText: { color: colors.primary, fontWeight: "700" },
  thread: { gap: spacing.md }, message: { alignSelf: "flex-end", backgroundColor: colors.primarySoft, borderBottomRightRadius: 4, borderRadius: radius.lg, gap: 6, maxWidth: 720, padding: spacing.md, width: "88%" }, messageCompact: { maxWidth: "100%", width: "94%" }, opening: { alignSelf: "flex-start", backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderBottomRightRadius: radius.lg, boxShadow: "0 8px 22px rgba(11,31,58,.07)" }, sender: { color: colors.primary, fontSize: 9, fontWeight: "700", textTransform: "uppercase" }, body: { color: colors.text, lineHeight: 21 }, date: { color: colors.muted, fontSize: 9 },
  composer: { backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 12px 34px rgba(11,31,58,.10)", gap: spacing.md, padding: spacing.md }, composerHeading: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }, composerTitle: { color: colors.text, fontSize: 16, fontWeight: "700" }, composerMeta: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 112, padding: spacing.md, textAlignVertical: "top" }, primary: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.lg }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .5 }, closed: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, closedText: { color: colors.muted, flex: 1, lineHeight: 19 }, error: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, errorText: { color: colors.danger, flex: 1, lineHeight: 19 },
  attachment: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 44, padding: spacing.sm }, attachmentText: { color: colors.text, flex: 1, fontSize: 12, fontWeight: "600" }, attachRow: { flexDirection: "row" }, attach: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md }, attachText: { color: colors.primary, fontWeight: "700" }
});
