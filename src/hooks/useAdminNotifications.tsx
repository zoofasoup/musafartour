import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export const useAdminNotifications = () => {
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
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
      return data as AdminNotification[];
    },
    // Refetch every minute as fallback
    refetchInterval: 60000, 
  });

  // Setup realtime subscription
  useEffect(() => {
    // A burst of inserts (bulk registration, import) lands as many events within moments.
    // Collect them and show one toast instead of one per row.
    let pending: AdminNotification[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      const batch = pending;
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

  // Mark single as read
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (error) => {
      console.error("Error marking as read:", error);
    }
  });

  // Mark a set of notifications (a whole group) as read
  const markManyAsRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (error) => {
      console.error("Error marking group as read:", error);
    }
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success("Semua notifikasi telah dibaca");
    },
    onError: (error) => {
      console.error("Error marking all as read:", error);
      toast.error("Gagal menandai notifikasi");
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: (id: string) => markAsRead.mutate(id),
    markManyAsRead: (ids: string[]) => markManyAsRead.mutate(ids),
    markAllAsRead: () => markAllAsRead.mutate(),
    isMarkingRead: markAsRead.isPending || markManyAsRead.isPending || markAllAsRead.isPending
  };
};
