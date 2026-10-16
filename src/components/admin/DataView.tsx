import type { LucideIcon } from "lucide-react";
import { ChevronRight, Inbox, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { AgentEmpty } from "@/components/agent/AgentPage";
import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right";
}

/** How one row reads on a phone: a title, up to two quiet lines, a status pill and an optional picture at the left. */
export interface DataCard<T> {
  title: (row: T) => ReactNode;
  subtitle?: (row: T) => ReactNode;
  meta?: (row: T) => ReactNode;
  status?: (row: T) => ReactNode;
  leading?: (row: T) => ReactNode;
}

export interface RowAction<T> {
  label: string;
  icon?: LucideIcon;
  onSelect: (row: T) => void;
  destructive?: boolean;
  hidden?: (row: T) => boolean;
}

/**
 * One list for the admin panel. A table on a desktop (dense, with the columns you give), a list of rows on a phone
 * (built from `card`). Both come from the same data, the same actions and the same open handler, so a page describes
 * its list once. States are built in: loading, error with retry, and empty.
 */
export function DataView<T>({
  rows,
  rowKey,
  columns,
  card,
  onOpen,
  actions,
  inlineActions,
  loading,
  error,
  onRetry,
  retrying,
  what = "Data",
  empty = { icon: Inbox, text: "Belum ada data" },
}: {
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  columns: DataColumn<T>[];
  card: DataCard<T>;
  onOpen?: (row: T) => void;
  actions?: RowAction<T>[];
  /** Buttons shown inline in the last column on a desktop (the phone opens the row instead). */
  inlineActions?: (row: T) => ReactNode;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  what?: string;
  empty?: { icon: LucideIcon; text: string; action?: ReactNode };
}) {
  const phone = useIsMobile();

  if (error) return <LoadError what={what} error={error} onRetry={onRetry ?? (() => undefined)} retrying={retrying} />;
  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Memuat">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-[18px]" />)}
      </div>
    );
  }
  if (!rows || rows.length === 0) return <AgentEmpty icon={empty.icon} text={empty.text} action={empty.action} />;

  const menu = (row: T) => {
    const list = (actions ?? []).filter((a) => !a.hidden?.(row));
    if (list.length === 0) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Aksi" className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {list.map((a) => (
            <DropdownMenuItem key={a.label} onSelect={() => a.onSelect(row)} className={cn("gap-3", a.destructive && "text-pkg-red-deep")}>
              {a.icon && <a.icon className="h-4 w-4" aria-hidden />} {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (phone) {
    return (
      <ul>
        {rows.map((row) => {
          const body = (
            <>
              {card.leading?.(row)}
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[17px] leading-tight text-pkg-fg">{card.title(row)}</span>
                {card.subtitle && <span className="mt-0.5 block truncate text-[14px] text-pkg-fg-3">{card.subtitle(row)}</span>}
                {card.meta && <span className="mt-0.5 block truncate text-[13px] text-pkg-fg-3">{card.meta(row)}</span>}
              </span>
              {card.status && <span className="shrink-0">{card.status(row)}</span>}
            </>
          );
          return (
            <li key={rowKey(row)} className="flex items-center gap-2 border-b border-pkg-hair last:border-0">
              {onOpen ? (
                <button type="button" data-plain onClick={() => onOpen(row)} className="pkg-press flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
                  {body}
                  {!actions && <ChevronRight className="h-5 w-5 shrink-0 text-pkg-fg-3" aria-hidden />}
                </button>
              ) : (
                <div className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3">{body}</div>
              )}
              {menu(row)}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((c) => (
            <TableHead key={c.key} className={cn("h-11 text-[13px] font-medium text-pkg-fg-3", c.align === "right" && "text-right", c.className)}>{c.header}</TableHead>
          ))}
          {(actions || inlineActions) && <TableHead className="w-12 text-right"><span className="sr-only">Aksi</span></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={rowKey(row)}
            onClick={onOpen ? () => onOpen(row) : undefined}
            className={cn("h-14 border-pkg-hair", onOpen && "cursor-pointer hover:bg-pkg-cream-2/60")}
          >
            {columns.map((c) => (
              <TableCell key={c.key} className={cn("py-2 text-[15px] text-pkg-fg", c.align === "right" && "text-right tabular-nums", c.className)}>{c.cell(row)}</TableCell>
            ))}
            {(actions || inlineActions) && (
              <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">{inlineActions?.(row)}{menu(row)}</div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
