import { useMemo, useState } from "react";
import { Bell, CheckCheck, ChevronDown, Inbox } from "lucide-react";
import { useAdminNotifications, type AdminNotification } from "@/hooks/useAdminNotifications";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { bucketGroups, groupNotifications, groupPreview, type DayBucket, type NotificationGroup } from "@/lib/notificationGroups";
import { TONE_CLASS, typeMeta } from "./notificationMeta";

type Tab = "all" | "unread";

const BUCKET_LABEL: Record<DayBucket, string> = { today: "Hari ini", yesterday: "Kemarin", earlier: "Sebelumnya" };

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeID });

const IconChip = ({ type }: { type: string }) => {
  const meta = typeMeta(type);
  const Icon = meta.icon;
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[meta.tone]}`}>
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
};

const UnreadDot = ({ show }: { show: boolean }) =>
  show ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" /> : <span className="w-2 shrink-0" />;

export const AdminHeader = () => {
  const { notifications, unreadCount, markAsRead, markManyAsRead, markAllAsRead } = useAdminNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notifications) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
    return [...counts.entries()];
  }, [notifications]);

  const visible = useMemo(
    () => notifications.filter(n => (tab === "all" || !n.is_read) && (!category || n.type === category)),
    [notifications, tab, category],
  );
  const buckets = useMemo(() => bucketGroups(groupNotifications(visible)), [visible]);

  const go = (url: string | null) => {
    if (!url) return;
    setOpen(false);
    navigate(url);
  };

  const openItem = (n: AdminNotification) => {
    if (!n.is_read) markAsRead(n.id);
    go(n.action_url);
  };

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderItem = (n: AdminNotification, nested = false) => {
    const meta = typeMeta(n.type);
    const title = nested && meta.titlePrefix ? n.title.replace(meta.titlePrefix, "").trim() : n.title;
    return (
      <button
        key={n.id}
        type="button"
        onClick={() => openItem(n)}
        className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-100 ${!n.is_read && !nested ? "bg-primary/5" : ""}`}
      >
        <UnreadDot show={!n.is_read} />
        {!nested && <IconChip type={n.type} />}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-sm ${n.is_read ? "font-medium text-slate-700" : "font-semibold text-slate-900"}`}>{title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{ago(n.created_at)}</span>
          </span>
          <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
          {!nested && <span className="mt-0.5 block text-xs text-slate-400">{meta.label}</span>}
        </span>
      </button>
    );
  };

  const renderGroup = (g: NotificationGroup<AdminNotification>) => {
    if (g.items.length === 1) return renderItem(g.items[0]);
    const meta = typeMeta(g.type);
    const isOpen = expanded.has(g.key);
    const ids = g.items.filter(i => !i.is_read).map(i => i.id);
    return (
      <div key={g.key} className={`rounded-lg ${g.unread > 0 ? "bg-primary/5" : ""}`}>
        <div className="flex items-start gap-3 p-3">
          <UnreadDot show={g.unread > 0} />
          <IconChip type={g.type} />
          <button type="button" onClick={() => toggle(g.key)} aria-expanded={isOpen} className="min-w-0 flex-1 text-left">
            <span className="flex items-baseline justify-between gap-2">
              <span className={`text-sm ${g.unread > 0 ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                {meta.groupTitle(g.items.length)}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{ago(g.latest)}</span>
            </span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{groupPreview(g.items, meta.titlePrefix)}</span>
            <span className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className="whitespace-nowrap text-slate-400">
                {meta.label}
                {g.unread > 0 && <span className="text-primary"> · {g.unread} baru</span>}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap font-medium text-slate-500">
                {isOpen ? "Tutup" : "Lihat semua"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
              </span>
            </span>
          </button>
        </div>
        {isOpen && (
          <div className="ml-[3.25rem] border-l border-slate-200 pb-2 pl-1">
            {g.items.map(i => renderItem(i, true))}
            <div className="flex flex-wrap gap-2 px-3 pt-1">
              {g.actionUrl && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8"
                  onClick={() => {
                    markManyAsRead(ids);
                    go(g.actionUrl);
                  }}
                >
                  Buka daftar
                </Button>
              )}
              {ids.length > 0 && (
                <Button size="sm" variant="ghost" className="h-8" onClick={() => markManyAsRead(ids)}>
                  <CheckCheck className="mr-1 h-4 w-4" aria-hidden /> Tandai dibaca
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const emptyText = tab === "unread" ? "Semua sudah dibaca" : "Belum ada notifikasi";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton
          tooltip="Notifikasi"
          className="text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 rounded-lg transition-all duration-300 ease-in-out relative"
        >
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute left-5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="font-medium">Notifikasi</span>
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={12} className="flex max-h-[80vh] w-[min(26rem,calc(100vw-2rem))] flex-col gap-3 p-0">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-base font-semibold">Notifikasi</h2>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} className="h-8 gap-1 text-primary">
              <CheckCheck className="h-4 w-4" aria-hidden /> Tandai semua dibaca
            </Button>
          )}
        </div>

        <div className="px-4">
          <div role="tablist" className="inline-flex w-full rounded-lg bg-slate-100 p-1">
            {([["all", `Semua ${notifications.length}`], ["unread", `Belum dibaca ${unreadCount}`]] as const).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`h-8 flex-1 rounded-md text-sm font-medium transition-colors ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 px-4">
            {[[null, "Semua jenis"] as const, ...categories.map(([t]) => [t, typeMeta(t).label] as const)].map(([t, label]) => {
              const Icon = t ? typeMeta(t).icon : null;
              const on = category === t;
              return (
                <button
                  key={t ?? "all"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategory(t)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${on ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <Inbox className="h-6 w-6" aria-hidden />
              {emptyText}
            </div>
          ) : (
            (["today", "yesterday", "earlier"] as const).map(b =>
              buckets[b].length === 0 ? null : (
                <section key={b} className="mb-1">
                  <h3 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{BUCKET_LABEL[b]}</h3>
                  <div className="flex flex-col gap-0.5">{buckets[b].map(renderGroup)}</div>
                </section>
              ),
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
