import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { successResponse, errorResponse, getUserId } from "@/lib/api-utils";
import type { ConversationPreview } from "@/lib/types/messages";

/**
 * GET /api/conversations
 *
 * List all conversations for the authenticated user, ordered by most
 * recent activity (updated_at DESC). Each entry includes the last
 * message preview and participant list.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParams = searchParams.get("limit");
    const limit = limitParams ? parseInt(limitParams, 10) : 50;
    // 1. Authenticate
    const userId = getUserId(request);
    if (!userId) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    // 2. Get conversation IDs the user participates in
    const { data: participations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (partError) {
      console.error("Failed to fetch participations:", partError);
      return errorResponse("Failed to load conversations.", 500, "INTERNAL_ERROR");
    }

    if (!participations || participations.length === 0) {
      return successResponse<ConversationPreview[]>([]);
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    // 3. Fetch conversations with metadata
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, created_at, updated_at")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (convError) {
      console.error("Failed to fetch conversations:", convError);
      return errorResponse("Failed to load conversations.", 500, "INTERNAL_ERROR");
    }

    // 4. Batch-load last messages, participants, unread counts, and user profiles
    const [
      { data: lastMessages, error: lastMessageError },
      { data: participants, error: participantError },
      { data: unreadRows, error: unreadError },
    ] = await Promise.all([
      supabase
        .from("conversation_last_messages")
        .select("conversation_id, content, sender_id, created_at")
        .in("conversation_id", conversationIds),
      supabase
        .from("conversation_participants")
        .select("id, user_id, conversation_id")
        .in("conversation_id", conversationIds),
      supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .neq("sender_id", userId)
        .is("read_at", null)
        .is("deleted_at", null),
    ]);

    if (lastMessageError) {
      console.error("Failed to fetch last messages:", lastMessageError);
      return errorResponse("Failed to load conversations.", 500, "INTERNAL_ERROR");
    }

    if (participantError) {
      console.error("Failed to fetch participants:", participantError);
      return errorResponse("Failed to load conversations.", 500, "INTERNAL_ERROR");
    }

    // Build unread count map (count per conversation_id)
    const unreadCountMap = new Map<string, number>();
    (unreadRows ?? []).forEach((row) => {
      unreadCountMap.set(row.conversation_id, (unreadCountMap.get(row.conversation_id) ?? 0) + 1);
    });

    const lastMessageMap = new Map(
      (lastMessages ?? []).map((message) => [
        message.conversation_id,
        {
          content: message.content,
          sender_id: message.sender_id,
          created_at: message.created_at,
        },
      ])
    );

    // Build participants map and collect other-user IDs for profile lookup
    const participantsMap = new Map<string, { id: string; user_id: string }[]>();
    const otherUserIds = new Set<string>();
    (participants ?? []).forEach((participant) => {
      const list = participantsMap.get(participant.conversation_id) ?? [];
      list.push({ id: participant.id, user_id: participant.user_id });
      participantsMap.set(participant.conversation_id, list);
      if (participant.user_id !== userId) {
        otherUserIds.add(participant.user_id);
      }
    });

    // Batch-load profiles for other participants
    const profileMap = new Map<string, { username: string; avatar_url: string }>();
    if (otherUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from("users")
        .select("id, username, avatar_url")
        .in("id", Array.from(otherUserIds));
      (profiles ?? []).forEach((p) => {
        profileMap.set(p.id, { username: p.username ?? "Unknown User", avatar_url: p.avatar_url ?? "" });
      });
    }

    const previews: ConversationPreview[] = (conversations ?? []).map((conv) => {
      const convParticipants = participantsMap.get(conv.id) ?? [];
      const otherParticipant = convParticipants.find((p) => p.user_id !== userId);
      const otherProfile = otherParticipant ? profileMap.get(otherParticipant.user_id) : undefined;

      return {
        id: conv.id,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        last_message: lastMessageMap.get(conv.id) ?? null,
        participants: convParticipants,
        unread_count: unreadCountMap.get(conv.id) ?? 0,
        other_user: otherProfile,
      };
    });

    return successResponse(previews);
  } catch (err) {
    console.error("GET /api/conversations error:", err);
    return errorResponse("Internal server error.", 500, "INTERNAL_ERROR");
  }
}
