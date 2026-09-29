import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export const PricingTab = ({
  form,
  hasHemat,
  hasNyaman,
  hasFiveStar,
  hasPelataranHemat,
  renderTierSection
}: any) => {
  return (
    <div className="space-y-8">
      

      {/* Tier Sections */}
      {hasHemat && renderTierSection("Hemat", "hemat_makkah", "hemat_madinah", "hemat_price", "hemat_transport")}
      {hasNyaman && renderTierSection("Nyaman", "makkah", "madinah", "price", "best_seller_transport")}
      {hasFiveStar && renderTierSection("Five Star", "five_star_makkah", "five_star_madinah", "five_star_price", "five_star_transport")}
      {hasPelataranHemat && renderTierSection("Pelataran Hemat", "pelataran_makkah", "pelataran_madinah", "pelataran_price", "pelataran_transport")}
    </div>
  );
};
