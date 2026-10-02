import { Input } from "@/components/ui/input";

/** Rupiah input shown with thousand separators, stored as a plain number. */
export function MoneyInput({
  value,
  onChange,
  id,
  placeholder = "0",
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
      <Input
        id={id}
        inputMode="numeric"
        className="pl-9"
        placeholder={placeholder}
        disabled={disabled}
        value={value ? new Intl.NumberFormat("id-ID").format(value) : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits ? parseInt(digits, 10) : 0);
        }}
      />
    </div>
  );
}
