import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { pickAndUploadDocument } from "../media/media.api";
import { accessSupportAttachment, getMyTickets, replyToTicket } from "./support.api";

type Attachment = { storageKey: string; name: string; mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" };
type SavedAttachment = { id: string; name: string; mimeType: Attachment["mimeType"] };

export function SupportThreadScreen({ id }: { id: string }) {
  const router = useRouter();
  const cache = useQueryClient();
  const user = useCurrentUser();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const tickets = useQuery({ queryKey: ["support", "mine", user?.uid], queryFn: () => getMyTickets(user!), enabled: Boolean(user), retry: false });
  const ticket = tickets.data?.find((item) => item.id === id);
  const reply = useMutation({ retry: false, mutationFn: () => replyToTicket(user!, id, body.trim(), files), onSuccess: async () => {
    setBody(""); setFiles([]);
    await cache.invalidateQueries({ queryKey: ["support", "mine", user!.uid] });
  } });
  const addFile = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const result = await pickAndUploadDocument(user, "support");
      if (result) setFiles((current) => current.length < 5 ? [...current, { storageKey: result.storageKey, name: result.originalName, mimeType: result.mimeType as Attachment["mimeType"] }] : current);
    } finally { setUploading(false); }
  };
  const openAttachment = async (file: SavedAttachment) => {
    if (!user || openingAttachment) return;
    setOpeningAttachment(file.id);
    setAttachmentError(null);
    try {
      const signed = await accessSupportAttachment(user, id, file.id, file.mimeType === "application/pdf");
      await Linking.openURL(signed.url);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Could not open this attachment");
    } finally {
      setOpeningAttachment(null);
    }
  };
  if (tickets.isLoading) return <Screen title="Support conversation"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!ticket) return <Screen title="Ticket unavailable" description="This support request could not be found."><Pressable onPress={() => router.replace("/support")} style={styles.primary}><Text style={styles.primaryText}>Back to support</Text></Pressable></Screen>;
  return <Screen eyebrow="SUPPORT THREAD" title={ticket.subject} description={`${ticket.category} · Ticket #${ticket.id.slice(0, 8).toUpperCase()}`}>
    <View style={styles.header}><Pressable onPress={() => router.replace("/support")} style={styles.back}><Ionicons color={colors.primary} name="arrow-back" size={18} /><Text style={styles.backText}>All tickets</Text></Pressable><Text style={styles.status}>{ticket.status.replaceAll("_", " ").toUpperCase()}</Text></View>
    {ticket.orderId || ticket.returnId ? <View style={styles.context}><View style={styles.contextCopy}><Text style={styles.contextTitle}>Linked case context</Text><Text style={styles.date}>{ticket.returnId ? `Return #${ticket.returnId.slice(0, 8).toUpperCase()}` : "Order support"}</Text></View><View style={styles.contextActions}>{ticket.orderId ? <Pressable accessibilityRole="link" onPress={() => router.push(`/orders/${ticket.orderId}` as never)} style={styles.contextButton}><Text style={styles.contextButtonText}>View order</Text></Pressable> : null}{ticket.returnId ? <Pressable accessibilityRole="link" onPress={() => router.push(`/return/${ticket.returnId}` as never)} style={styles.contextButton}><Text style={styles.contextButtonText}>Track return</Text></Pressable> : null}</View></View> : null}
    <View style={styles.thread}>{ticket.messages.map((message, index) => <View key={message.id} style={[styles.message, index === 0 && styles.opening]}><Text style={styles.sender}>{index === 0 ? "Request opened" : "Conversation update"}</Text><Text style={styles.body}>{message.body}</Text>{message.attachments.map((file) => <SavedAttachmentRow busy={openingAttachment === file.id} disabled={Boolean(openingAttachment)} file={file} key={file.id} open={() => void openAttachment(file)} />)}<Text style={styles.date}>{new Date(message.createdAt).toLocaleString("en-BD")}</Text></View>)}</View>
    {attachmentError ? <Text accessibilityRole="alert" style={styles.error}>{attachmentError}</Text> : null}
    {ticket.status !== "closed" ? <View style={styles.composer}><TextInput multiline onChangeText={setBody} placeholder="Write a reply" placeholderTextColor={colors.muted} style={styles.input} value={body} /><View style={styles.attachRow}><Pressable disabled={uploading || files.length >= 5} onPress={() => void addFile()} style={styles.attach}>{uploading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.attachText}>Attach image or PDF ({files.length}/5)</Text>}</Pressable></View>{files.map((file) => <AttachmentRow file={file} key={file.storageKey} remove={() => setFiles((current) => current.filter((item) => item.storageKey !== file.storageKey))} />)}<Pressable disabled={reply.isPending || !body.trim()} onPress={() => reply.mutate()} style={[styles.primary, (reply.isPending || !body.trim()) && styles.disabled]}>{reply.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send reply</Text>}</Pressable></View> : <Text style={styles.closed}>This ticket is closed. Create a new ticket if you need more help.</Text>}
    {reply.error ? <Text style={styles.error}>{reply.error.message}</Text> : null}
  </Screen>;
}

function AttachmentRow({ file, remove }: { file: Attachment; remove?: () => void }) { return <View style={styles.attachment}><Ionicons color={colors.primary} name="document-attach-outline" size={17} /><Text numberOfLines={1} style={styles.attachmentText}>{file.name}</Text>{remove ? <Pressable onPress={remove}><Ionicons color={colors.danger} name="close-circle" size={19} /></Pressable> : null}</View>; }
function SavedAttachmentRow({ busy, disabled, file, open }: { busy: boolean; disabled: boolean; file: SavedAttachment; open: () => void }) { return <Pressable accessibilityLabel={`Open attachment ${file.name}`} accessibilityRole="link" disabled={disabled} onPress={open} style={[styles.attachment, disabled && !busy && styles.disabled]}><Ionicons color={colors.primary} name="document-attach-outline" size={17} /><Text numberOfLines={1} style={styles.attachmentText}>{file.name}</Text>{busy ? <ActivityIndicator color={colors.primary} size="small" /> : <Ionicons color={colors.primary} name="open-outline" size={17} />}</Pressable>; }

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, back: { alignItems: "center", flexDirection: "row", gap: 6 }, backText: { color: colors.primary, fontWeight: "700" }, status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  context: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between", padding: spacing.md }, contextCopy: { flex: 1, minWidth: 150 }, contextTitle: { color: colors.text, fontSize: 13, fontWeight: "700" }, contextActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, contextButton: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md }, contextButtonText: { color: colors.primary, fontWeight: "700" },
  thread: { gap: spacing.md }, message: { alignSelf: "flex-end", backgroundColor: colors.primarySoft, borderRadius: radius.lg, gap: 6, maxWidth: 720, padding: spacing.md, width: "88%" }, opening: { alignSelf: "flex-start", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }, sender: { color: colors.primary, fontSize: 9, fontWeight: "700" }, body: { color: colors.text, lineHeight: 21 }, date: { color: colors.muted, fontSize: 9 },
  composer: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 100, padding: spacing.md, textAlignVertical: "top" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 46, justifyContent: "center", paddingHorizontal: spacing.lg }, primaryText: { color: "#fff", fontWeight: "700" }, disabled: { opacity: .5 }, closed: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.muted, padding: spacing.md }, error: { color: colors.danger },
  attachment: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, attachmentText: { color: colors.text, flex: 1, fontSize: 12, fontWeight: "600" }, attachRow: { flexDirection: "row" }, attach: { borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.md }, attachText: { color: colors.primary, fontWeight: "700" }
});
