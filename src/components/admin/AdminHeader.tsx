import { Fragment, useMemo, useState } from "react";
import { Archive, ArchiveRestore, ArrowLeft, Bell, Check, CheckCheck, ChevronDown, Inbox, Settings, X } from "lucide-react";
import { useAdminNotifications, type AdminNotification } from "@/hooks/useAdminNotifications";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { differenceInDays, format, formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { bucketGroups, groupNotifications, type DayBucket, type NotificationGroup } from "@/lib/notificationGroups";
import { avatarColor, initials, previewFor, sentenceFor } from "@/lib/notificationActor";
import { NOTIFICATION_TYPES, TONE_CLASS, typeMeta } from "./notificationMeta";

type Tab = "all" | "unread" | "archived";

const BUCKET_LABEL: Record<DayBucket, string> = { today: "Hari ini", yesterday: "Kemarin", earlier: "Sebelumnya" };

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeID });
/** The exact moment, for when "3 hari yang lalu" is not enough: "Jumat 15.12" this week, a full date after that. */
const clock = (iso: string) =>
  differenceInDays(new Date(), new Date(iso)) < 6
    ? format(new Date(iso), "EEEE HH.mm", { locale: localeID })
    : format(new Date(iso), "d MMM yyyy, HH.mm", { locale: localeID });

/** One person's initials on a stable colour; the small badge says what kind of notification it is. */
const ActorAvatar = ({ n, size = "md" }: { n: AdminNotification; size?: "sm" | "md" }) => {
  const meta = typeMeta(n.type);
  const Icon = meta.icon;
  const name = n.meta?.actor?.name;
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  if (!name) {
    return (
      <span className={`flex shrink-0 items-center justify-center self-start rounded-full ${dim} ${TONE_CLASS[meta.tone]}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="relative shrink-0 self-start">
      <span className={`flex items-center justify-center rounded-full font-semibold ${dim} ${avatarColor(name)}`} aria-hidden>
        {initials(name)}
      </span>
      <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white ${TONE_CLASS[meta.tone]}`}>
        <Icon className="h-2.5 w-2.5" aria-hidden />
      </span>
    </span>
  );
};

/** Up to three different people overlapping, for a group; the type icon when nobody is named. */
const GroupAvatars = ({ items }: { items: AdminNotification[] }) => {
  const seen = new Set<string>();
  const people = items.filter(i => {
    const name = i.meta?.actor?.name;
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
  if (people.length === 0) return <ActorAvatar n={items[0]} />;
  return (
    <span className="flex shrink-0 -space-x-2 self-start">
      {people.slice(0, 3).map(p => (
        <span
          key={p.meta!.actor!.name}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white ${avatarColor(p.meta!.actor!.name)}`}
          aria-hidden
        >
          {initials(p.meta!.actor!.name)}
        </span>
      ))}
    </span>
  );
};

const RoundButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={e => {
      e.stopPropagation();
      onClick();
    }}
    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
  >
    {children}
  </button>
);

/** "Rina, Dewi +3 lainnya": who is inside a group. Falls back to titles for rows without meta. */
const groupPeople = (items: AdminNotification[], prefix?: string) => {
  const names: string[] = [];
  for (const i of items) {
    const label = i.meta?.actor?.name ?? i.title.replace(prefix ?? "", "").trim();
    if (!names.includes(label)) names.push(label);
  }
  const shown = names.slice(0, 2);
  const rest = names.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest} lainnya` : shown.join(", ");
};

export const AdminHeader = () => {
  const { notifications, archived, unreadCount, isLoading, muted, toggleMuted, markAsRead, markManyAsRead, markAllAsRead, archive, unarchive } =
    useAdminNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "settings">("list");
  const [tab, setTab] = useState<Tab>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const source = useMemo(
    () => (tab === "archived" ? archived : tab === "unread" ? notifications.filter(n => !n.is_read) : notifications),
    [tab, notifications, archived],
  );
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of source) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
    return [...counts.entries()];
  }, [source]);
  const visible = useMemo(() => (category ? source.filter(n => n.type === category) : source), [source, category]);
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

  const isArchive = tab === "archived";

  const renderItem = (n: AdminNotification, nested = false) => {
    const kind = typeMeta(n.type);
    const sentence = sentenceFor(n.type, n.meta);
    const preview = previewFor(n.type, n.meta);
    return (
      <div
        key={n.id}
        role="button"
        tabIndex={0}
        onClick={() => openItem(n)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openItem(n);
          }
        }}
        className={`group flex cursor-pointer gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 ${!n.is_read ? "bg-sky-50/60" : ""}`}
      >
        <ActorAvatar n={n} size={nested ? "sm" : "md"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={`text-sm leading-snug ${n.is_read ? "text-slate-600" : "text-slate-900"}`}>
              {sentence ? (
                sentence.map((s, i) => (
                  <Fragment key={i}>{s.bold ? <span className="font-semibold text-slate-900">{s.text}</span> : s.text}</Fragment>
                ))
              ) : (
                <span className={n.is_read ? "font-medium" : "font-semibold"}>{n.title}</span>
              )}
            </p>
            <span className="flex shrink-0 items-center gap-2 pt-0.5 text-xs text-muted-foreground">
              {!n.is_read && <span className="h-2 w-2 rounded-full bg-sky-500" aria-label="Belum dibaca" />}
              {ago(n.created_at)}
            </span>
          </div>

          {preview ? (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
              <span className="line-clamp-2 min-w-0">{preview[0]}</span>
              {n.action_url && !isArchive && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 shrink-0 bg-white px-3 text-xs"
                  onClick={e => {
                    e.stopPropagation();
                    openItem(n);
                  }}
                >
                  Periksa
                </Button>
              )}
            </div>
          ) : (
            !sentence && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
          )}

          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-slate-400">
              {kind.label} · {clock(n.created_at)}
            </span>
            {/* Always there on touch screens (no hover); on desktop they appear when the row is hovered or focused. */}
            <span className="flex shrink-0 items-center gap-1.5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              {isArchive ? (
                <RoundButton label="Kembalikan" onClick={() => unarchive([n.id])}>
                  <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                </RoundButton>
              ) : (
                <>
                  {!n.is_read && (
                    <RoundButton label="Tandai dibaca" onClick={() => markAsRead(n.id)}>
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </RoundButton>
                  )}
                  <RoundButton label="Arsipkan" onClick={() => archive([n.id])}>
                    <Archive className="h-3.5 w-3.5" aria-hidden />
                  </RoundButton>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderGroup = (g: NotificationGroup<AdminNotification>) => {
    if (g.items.length === 1) return renderItem(g.items[0]);
    const kind = typeMeta(g.type);
    const isOpen = expanded.has(g.key);
    const unreadIds = g.items.filter(i => !i.is_read).map(i => i.id);
    return (
      <div key={g.key} className={g.unread > 0 ? "bg-sky-50/60" : ""}>
        <button type="button" onClick={() => toggle(g.key)} aria-expanded={isOpen} className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50">
          <GroupAvatars items={g.items} />
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-3">
              <span className={`text-sm leading-snug ${g.unread > 0 ? "font-semibold text-slate-900" : "font-medium text-slate-600"}`}>
                {kind.groupTitle(g.items.length)}
              </span>
              <span className="flex shrink-0 items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                {g.unread > 0 && <span className="h-2 w-2 rounded-full bg-sky-500" aria-label="Belum dibaca" />}
                {ago(g.latest)}
              </span>
            </span>
            <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{groupPeople(g.items, kind.titlePrefix)}</span>
            <span className="mt-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="whitespace-nowrap text-slate-400">
                {kind.label}
                {g.unread > 0 && <span className="text-sky-600"> · {g.unread} baru</span>}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap font-medium text-slate-500">
                {isOpen ? "Tutup" : "Lihat semua"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
              </span>
            </span>
          </span>
        </button>
        {isOpen && (
          <div className="ml-[3.25rem] divide-y divide-slate-100 border-l border-slate-200 bg-white">
            {g.items.map(i => renderItem(i, true))}
            <div className="flex flex-wrap gap-2 px-4 py-2">
              {g.actionUrl && !isArchive && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8"
                  onClick={() => {
                    markManyAsRead(unreadIds);
                    go(g.actionUrl);
                  }}
                >
                  Buka daftar
                </Button>
              )}
              {isArchive ? (
                <Button size="sm" variant="ghost" className="h-8" onClick={() => unarchive(g.items.map(i => i.id))}>
                  <ArchiveRestore className="mr-1 h-4 w-4" aria-hidden /> Kembalikan semua
                </Button>
              ) : (
                <>
                  {unreadIds.length > 0 && (
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => markManyAsRead(unreadIds)}>
                      <CheckCheck className="mr-1 h-4 w-4" aria-hidden /> Tandai dibaca
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => archive(g.items.map(i => i.id))}>
                    <Archive className="mr-1 h-4 w-4" aria-hidden /> Arsipkan semua
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const emptyText = isArchive ? "Belum ada notifikasi yang diarsipkan" : tab === "unread" ? "Semua sudah dibaca" : "Belum ada notifikasi";
  const tabs: [Tab, string][] = [
    ["all", `Semua ${notifications.length}`],
    ["unread", `Belum dibaca ${unreadCount}`],
    ["archived", `Diarsipkan ${archived.length}`],
  ];

  return (
    <Popover
      open={open}
      onOpenChange={o => {
        setOpen(o);
        if (!o) setView("list");
      }}
    >
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
      <PopoverContent side="right" align="end" sideOffset={12} className="flex max-h-[85vh] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl p-0">
        {view === "settings" ? (
          <>
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <button type="button" aria-label="Kembali" onClick={() => setView("list")} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </button>
              <h2 className="text-base font-semibold">Pengaturan notifikasi</h2>
            </div>
            <div className="overflow-y-auto px-4 py-3">
              <p className="mb-3 text-xs text-muted-foreground">Jenis yang dimatikan tidak muncul di daftar maupun pop-up. Berlaku di perangkat ini saja.</p>
              <ul className="divide-y divide-slate-100">
                {Object.entries(NOTIFICATION_TYPES).map(([type, kind]) => {
                  const Icon = kind.icon;
                  return (
                    <li key={type} className="flex items-center gap-3 py-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[kind.tone]}`}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium">{kind.label}</span>
                      <Switch checked={!muted.has(type)} onCheckedChange={() => toggleMuted(type)} aria-label={`Tampilkan notifikasi ${kind.label}`} />
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <h2 className="text-base font-semibold">Notifikasi</h2>
              <button type="button" aria-label="Tutup" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div role="tablist" className="flex gap-1 border-b px-3">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => {
                    setTab(key);
                    setCategory(null);
                  }}
                  className={`-mb-px border-b-2 px-2 py-2 text-sm font-medium transition-colors ${tab === key ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3">
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

            <div className="min-h-[8rem] flex-1 overflow-y-auto pb-2">
              {isLoading ? (
                <div className="space-y-4 px-4 py-4" role="status" aria-label="Memuat">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
                  <Inbox className="h-6 w-6" aria-hidden />
                  {emptyText}
                </div>
              ) : (
                (["today", "yesterday", "earlier"] as const).map(b =>
                  buckets[b].length === 0 ? null : (
                    <section key={b}>
                      <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{BUCKET_LABEL[b]}</h3>
                      <div className="divide-y divide-slate-100">{buckets[b].map(renderGroup)}</div>
                    </section>
                  ),
                )
              )}
            </div>

            <div className="flex items-center justify-between border-t bg-slate-50 px-3 py-2">
              {isArchive ? (
                <span />
              ) : (
                <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} disabled={unreadCount === 0} className="h-8 gap-1.5 text-slate-600">
                  <CheckCheck className="h-4 w-4" aria-hidden /> Tandai semua dibaca
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setView("settings")} className="h-8 gap-1.5 text-slate-600">
                <Settings className="h-4 w-4" aria-hidden /> Pengaturan
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
