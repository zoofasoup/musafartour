import { useState, useEffect } from "react";
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
        .limit(50);
        
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
          
          // Show toast for new notifications
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as AdminNotification;
            toast(newNotif.title, {
              description: newNotif.message,
              action: newNotif.action_url ? {
                label: "Lihat",
                onClick: () => window.location.href = newNotif.action_url!
              } : undefined
            });
          }
        }
      )
      .subscribe();

    return () => {
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
    markAllAsRead: () => markAllAsRead.mutate(),
    isMarkingRead: markAsRead.isPending || markAllAsRead.isPending
  };
};
