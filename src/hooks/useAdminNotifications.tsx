import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { readMeta, type NotificationMetaData } from "@/lib/notificationActor";

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
  /** Who/what/where, from the notification_meta migration. Null on older rows. */
  meta: NotificationMetaData | null;
  archived_at: string | null;
}

/** The archive column only exists once the notification_meta migration has run. */
const archiveError = (error: { message?: string } | null) =>
  /archived_at/.test(error?.message ?? "")
    ? "Fitur arsip belum aktif. Jalankan migration notifikasi di Supabase dulu."
    : "Gagal memperbarui notifikasi";

export const useAdminNotifications = () => {
  const queryClient = useQueryClient();
  const { muted, toggleMuted } = useNotificationPrefs();
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Fetch notifications
  const { data: all = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error("Error fetching notifications:", error.message, error);
        return [];
      }
      return (data ?? []).map(row => ({
        ...row,
        meta: readMeta(row.meta),
        archived_at: row.archived_at ?? null,
      })) as AdminNotification[];
    },
    // Refetch every minute as fallback
    refetchInterval: 60000,
  });

  // Muted types are hidden everywhere in the bell, and don't count toward the badge.
  const notifications = useMemo(() => all.filter(n => !n.archived_at && !muted.has(n.type)), [all, muted]);
  const archived = useMemo(() => all.filter(n => n.archived_at && !muted.has(n.type)), [all, muted]);

  // Setup realtime subscription
  useEffect(() => {
    // A burst of inserts (bulk registration, import) lands as many events within moments.
    // Collect them and show one toast instead of one per row.
    let pending: AdminNotification[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      const batch = pending.filter(n => !mutedRef.current.has(n.type));
      pending = [];
      timer = undefined;
      if (batch.length === 0) return;
      if (batch.length === 1) {
        const n = batch[0];
        toast(n.title, {
          description: n.message,
          action: n.action_url ? { label: "Lihat", onClick: () => (window.location.href = n.action_url!) } : undefined,
        });
        return;
      }
      toast(`${batch.length} notifikasi baru`, {
        description: batch.slice(0, 2).map(n => n.title).join(", ") + (batch.length > 2 ? ` +${batch.length - 2} lainnya` : ""),
      });
    };

    const channel = supabase
      .channel('admin-notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          // When a change happens, invalidate the query to refetch
          queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });

          if (payload.eventType === 'INSERT') {
            pending.push(payload.new as AdminNotification);
            if (!timer) timer = setTimeout(flush, 1500);
          }
        }
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });

  // Mark one or many as read (a single row, a whole group, or everything unread)
  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from('admin_notifications').update({ is_read: true }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (error) => {
      console.error("Error marking as read:", error);
      toast.error("Gagal menandai notifikasi");
    }
  });

  // Archive moves rows out of the main list without deleting them
  const setArchived = useMutation({
    mutationFn: async ({ ids, archive }: { ids: string[]; archive: boolean }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('admin_notifications')
        // Archiving also counts as handled: no unread badge left behind in the archive.
        .update(archive ? { archived_at: new Date().toISOString(), is_read: true } : { archived_at: null })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (error) => {
      console.error("Error archiving:", error);
      toast.error(archiveError(error as { message?: string }));
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const unreadIds = () => notifications.filter(n => !n.is_read).map(n => n.id);

  return {
    notifications,
    archived,
    unreadCount,
    isLoading,
    muted,
    toggleMuted,
    markAsRead: (id: string) => markRead.mutate([id]),
    markManyAsRead: (ids: string[]) => markRead.mutate(ids),
    markAllAsRead: () => {
      markRead.mutate(unreadIds(), { onSuccess: () => toast.success("Semua notifikasi telah dibaca") });
    },
    archive: (ids: string[]) => setArchived.mutate({ ids, archive: true }),
    unarchive: (ids: string[]) => setArchived.mutate({ ids, archive: false }),
    isMarkingRead: markRead.isPending || setArchived.isPending,
  };
};
