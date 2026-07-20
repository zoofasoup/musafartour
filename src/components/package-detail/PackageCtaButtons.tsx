import { Button } from "@/components/ui/button";
import { User, Users, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageCtaButtonsProps {
  onSoloWhatsApp: () => void;
  calculatorExpanded: boolean;
  onToggleCalculator: () => void;
}

function CtaButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
  variant = "outline",
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
  onClick: () => void;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      className={cn(
        "w-full h-auto py-3 px-4 justify-start gap-3 text-left",
        variant === "default" && "bg-emerald-600 hover:bg-emerald-700 text-white"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex flex-col items-start">
        <span className="text-sm font-bold">{title}</span>
        <span className={cn("text-xs font-normal", variant === "default" ? "text-white/80" : "text-muted-foreground")}>
          {subtitle}
        </span>
      </span>
    </Button>
  );
}

/**
 * Two entry points below the flyer, replacing the calculator's old
 * self-contained collapsed preview - going solo skips the calculator
 * entirely (straight to WhatsApp), going as a group opens/closes it.
 */
export function PackageCtaButtons({ onSoloWhatsApp, calculatorExpanded, onToggleCalculator }: PackageCtaButtonsProps) {
  return (
    <div className="space-y-2">
      <CtaButton icon={User} title="Berangkat Sendiri" subtitle="Tanya langsung via WhatsApp" onClick={onSoloWhatsApp} />
      <CtaButton
        icon={calculatorExpanded ? ChevronUp : Users}
        title={calculatorExpanded ? "Tutup Kalkulator" : "Hitung Ramai-ramai"}
        subtitle={calculatorExpanded ? "Sembunyikan kalkulator" : "Untuk rombongan/keluarga"}
        onClick={onToggleCalculator}
        variant="default"
      />
    </div>
  );
}
