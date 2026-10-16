import * as React from "react";

import { cn } from "@/lib/utils";

/** Copies each column's header text onto its cells (data-label), so the admin skin can stack a row as a card on a phone. */
function labelCells(table: HTMLTableElement) {
  const heads = Array.from(table.querySelectorAll("thead th")).map((th) => (th.textContent ?? "").trim());
  if (!heads.length) return;
  table.querySelectorAll("tbody tr").forEach((tr) => {
    Array.from(tr.children).forEach((td, i) => {
      if (td.tagName !== "TD" || (td as HTMLElement).hasAttribute("colspan")) return;
      const label = heads[i] ?? "";
      if (td.getAttribute("data-label") !== label) td.setAttribute("data-label", label);
      const long = (td.textContent ?? "").length > 48 && !td.querySelector("button, a, input");
      if (long !== td.hasAttribute("data-long")) td.toggleAttribute("data-long", long);
    });
  });
}

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const inner = React.useRef<HTMLTableElement | null>(null);
    React.useEffect(() => {
      const el = inner.current;
      if (!el || typeof MutationObserver === "undefined") return;
      let frame = 0;
      const run = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => labelCells(el));
      };
      run();
      const mo = new MutationObserver(run);
      mo.observe(el, { childList: true, subtree: true, characterData: true });
      return () => {
        mo.disconnect();
        cancelAnimationFrame(frame);
      };
    }, []);
    return (
      <div className="relative w-full overflow-auto">
        <table
          ref={(node) => {
            inner.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLTableElement | null>).current = node;
          }}
          data-stack=""
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-10 bg-muted px-4 text-left align-middle text-[13px] font-semibold text-muted-foreground first:rounded-tl-md last:rounded-tr-md [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("h-12 px-4 py-0 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
