import { Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PAY_STATE_CLASS, PAY_STATE_LABEL, STATUS_BADGE, rupiah, type PayState } from "@/lib/jamaah";

/** What a phone card needs about one jamaah. Both Data Jamaah views map their rows to this. */
export interface CardItem {
  id: string;
  name: string;
  groupId: string | null;
  cancelled: boolean;
  room: string;
  agreed: number;
  discount: number;
  paid: number;
  pending: number;
  outstanding: number;
  state: PayState;
  phone?: string | null;
  /** "Bekasi · Agen Serang", whatever is worth a second line */
  meta?: string;
  /** Only in the all-jamaah view: which package this person is on */
  packageLabel?: string;
  equipmentTaken?: boolean;
  docs?: { done: number; total: number };
}

/** The whole family's money and status, for the card header (computed over every member, not just the visible ones). */
export interface FamilySummary {
  name: string;
  count: number;
  paid: number;
  pending: number;
  outstanding: number;
  state: PayState;
}

interface Props {
  items: CardItem[];
  family: (groupId: string) => FamilySummary | undefined;
  loading?: boolean;
  emptyText: string;
  onOpen: (id: string) => void;
  onPay?: (id: string) => void;
  onEquipment?: (id: string, taken: boolean) => void;
}

type Block = { kind: "single"; item: CardItem } | { kind: "family"; groupId: string; items: CardItem[] };

/** Same rule as the table's merged cells: 2 or more neighbours of one group, none of them cancelled. */
function toBlocks(items: CardItem[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < items.length) {
    const g = items[i].cancelled ? null : items[i].groupId;
    let j = i + 1;
    while (g && j < items.length && !items[j].cancelled && items[j].groupId === g) j++;
    if (g && j - i >= 2) blocks.push({ kind: "family", groupId: g, items: items.slice(i, j) });
    else for (let k = i; k < j; k++) blocks.push({ kind: "single", item: items[k] });
    i = j;
  }
  return blocks;
}

const StatusBadge = ({ item }: { item: CardItem }) =>
  item.cancelled ? (
    <Badge variant="outline" className={STATUS_BADGE.bad}>Batal</Badge>
  ) : (
    <Badge variant="outline" className={PAY_STATE_CLASS[item.state]}>{PAY_STATE_LABEL[item.state]}</Badge>
  );

function Money({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold">{rupiah(value)}</dd>
      {note && <dd className="text-[13px] text-status-warn-text">{note}</dd>}
    </div>
  );
}

/** Name opens the detail. A real button, so it works with a keyboard and a thumb. */
function NameButton({ item, onOpen }: { item: CardItem; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      aria-haspopup="dialog"
      className="-my-2.5 rounded-sm py-2.5 text-left text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {item.name}
    </button>
  );
}

/** The two things done most on a phone: tick the equipment, record a payment. Both are 44px targets. */
function Actions({ item, onPay, onEquipment }: { item: CardItem; onPay?: Props["onPay"]; onEquipment?: Props["onEquipment"] }) {
  if (item.cancelled || (!onPay && !onEquipment)) return null;
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      {onEquipment && item.equipmentTaken !== undefined ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <Checkbox
            checked={item.equipmentTaken}
            onCheckedChange={(c) => onEquipment(item.id, !!c)}
            aria-label={`Perlengkapan ${item.name} sudah diambil`}
          />
          Perlengkapan diambil
        </label>
      ) : (
        <span />
      )}
      {onPay && (
        <Button type="button" variant="outline" className="h-11 px-5" onClick={() => onPay(item.id)}>
          Bayar
        </Button>
      )}
    </div>
  );
}

function SingleCard({ item, onOpen, onPay, onEquipment }: { item: CardItem } & Pick<Props, "onOpen" | "onPay" | "onEquipment">) {
  return (
    <li className={`rounded-lg border bg-card p-4 ${item.cancelled ? "text-muted-foreground" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <NameButton item={item} onOpen={onOpen} />
          <p className="text-[13px] text-muted-foreground">
            {[item.room, `Tagihan ${rupiah(item.agreed)}`, item.discount > 0 ? `diskon ${rupiah(item.discount)}` : null].filter(Boolean).join(" · ")}
          </p>
          {item.packageLabel && <p className="text-[13px] text-muted-foreground">{item.packageLabel}</p>}
        </div>
        <StatusBadge item={item} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Money label="Masuk" value={item.paid} note={item.pending > 0 ? `+${rupiah(item.pending)} menunggu` : undefined} />
        <Money label="Sisa" value={Math.max(0, item.outstanding)} />
      </dl>
      {(item.meta || item.phone || item.docs) && (
        <p className="mt-3 text-[13px] text-muted-foreground">
          {[item.phone, item.meta, item.docs ? `Dokumen ${item.docs.done}/${item.docs.total}` : null].filter(Boolean).join(" · ")}
        </p>
      )}
      <Actions item={item} onPay={onPay} onEquipment={onEquipment} />
    </li>
  );
}

function FamilyCard({
  block,
  summary,
  onOpen,
  onPay,
  onEquipment,
}: { block: Extract<Block, { kind: "family" }>; summary?: FamilySummary } & Pick<Props, "onOpen" | "onPay" | "onEquipment">) {
  return (
    <li className="rounded-lg border bg-card">
      {summary && (
        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-base font-semibold">
              {summary.name} <span className="font-normal text-muted-foreground">· {summary.count} orang</span>
            </p>
            <Badge variant="outline" className={PAY_STATE_CLASS[summary.state]}>{PAY_STATE_LABEL[summary.state]}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <Money label="Masuk" value={summary.paid} note={summary.pending > 0 ? `+${rupiah(summary.pending)} menunggu` : undefined} />
            <Money label="Sisa" value={Math.max(0, summary.outstanding)} />
          </dl>
        </div>
      )}
      <ul className="divide-y">
        {block.items.map((item) => (
          <li key={item.id} className="p-4">
            <div className="min-w-0">
              <NameButton item={item} onOpen={onOpen} />
              <p className="text-[13px] text-muted-foreground">
                {[item.room, `Tagihan ${rupiah(item.agreed)}`, item.phone, item.docs ? `Dokumen ${item.docs.done}/${item.docs.total}` : null].filter(Boolean).join(" · ")}
              </p>
              {item.packageLabel && <p className="text-[13px] text-muted-foreground">{item.packageLabel}</p>}
            </div>
            <Actions item={item} onPay={onPay} onEquipment={onEquipment} />
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Phone layout (below 768px): one card per jamaah, one card per family. Tablets and up keep the table. */
export function JamaahCardList({ items, family, loading, emptyText, onOpen, onPay, onEquipment }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center rounded-lg border py-10 md:hidden" role="status" aria-label="Memuat">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border py-10 text-center text-sm text-muted-foreground md:hidden">
        <Users className="h-6 w-6" aria-hidden />
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="space-y-3 md:hidden" aria-label="Daftar jamaah">
      {toBlocks(items).map((block) =>
        block.kind === "family" ? (
          <FamilyCard key={block.items[0].id} block={block} summary={family(block.groupId)} onOpen={onOpen} onPay={onPay} onEquipment={onEquipment} />
        ) : (
          <SingleCard key={block.item.id} item={block.item} onOpen={onOpen} onPay={onPay} onEquipment={onEquipment} />
        )
      )}
    </ul>
  );
}
