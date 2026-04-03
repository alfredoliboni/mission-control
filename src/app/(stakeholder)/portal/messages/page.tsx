"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useStakeholders } from "@/hooks/useStakeholders";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Loader2,
  Users,
} from "lucide-react";

interface Message {
  id: string;
  family_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
}

function useMessages(familyId: string) {
  return useQuery({
    queryKey: ["messages", familyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Message[];
    },
    enabled: !!familyId,
    refetchInterval: 10_000,
  });
}

function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      familyId,
      content,
      senderRole,
    }: {
      familyId: string;
      content: string;
      senderRole: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from("messages").insert({
        family_id: familyId,
        content,
        sender_role: senderRole,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.familyId],
      });
    },
  });
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {!isOwn && (
          <p className="text-[10px] font-medium mb-0.5 opacity-70">
            {message.sender_role}
          </p>
        )}
        <p className="text-sm">{message.content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export default function PortalMessagesPage() {
  const searchParams = useSearchParams();
  const preselectedFamily = searchParams.get("family") ?? "";
  const { user, role, loading: authLoading } = useAuth();
  const { data: stakeholders } = useStakeholders();
  const [familyId, setFamilyId] = useState(preselectedFamily);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: messagesLoading } = useMessages(familyId);
  const sendMessage = useSendMessage();

  const families = stakeholders?.filter((s) => s.status === "active") ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !familyId) return;
    await sendMessage.mutateAsync({
      familyId,
      content: newMessage.trim(),
      senderRole: role ?? "provider",
    });
    setNewMessage("");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please sign in to view messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Messages
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Communicate with linked families securely.
        </p>
      </div>

      {/* Family selector */}
      {!preselectedFamily && (
        <div className="max-w-xs">
          <select
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a family…</option>
            {families.map((f) => (
              <option key={f.id} value={f.family_id}>
                Family {f.family_id.slice(0, 8)}…
              </option>
            ))}
          </select>
        </div>
      )}

      {!familyId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a family to view messages
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Conversation
              <Badge variant="secondary" className="text-xs ml-auto">
                Family {familyId.slice(0, 8)}…
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Messages area */}
            <div className="border border-border rounded-lg bg-muted/20 p-4 h-80 overflow-y-auto space-y-3 mb-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages && messages.length > 0 ? (
                <>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.sender_id === user.id}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            {/* Send message */}
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message…"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMessage.isPending}
                size="sm"
                className="h-9 px-3"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
