import { Bell } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export const AdminHeader = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full flex justify-start items-center gap-2 text-slate-500 hover:text-slate-700 hover:bg-transparent">
          <div className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center p-0 text-[10px] rounded-full"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          <span className="font-medium">Notifikasi</span>
        </Button>
      </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2">
            <DropdownMenuLabel className="p-0 text-base font-semibold">Notifikasi</DropdownMenuLabel>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} className="h-8 text-xs text-primary">
                Tandai semua dibaca
              </Button>
            )}
          </div>
          <DropdownMenuSeparator />
          
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Belum ada notifikasi
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-1">
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className={`flex flex-col gap-1 p-3 rounded-md cursor-pointer transition-colors ${notif.is_read ? 'hover:bg-slate-100/50' : 'bg-primary/5 hover:bg-primary/10'}`}
                  onClick={() => {
                    if (!notif.is_read) markAsRead(notif.id);
                    if (notif.action_url) navigate(notif.action_url);
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-sm">{notif.title}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: localeID })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notif.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
  );
};
