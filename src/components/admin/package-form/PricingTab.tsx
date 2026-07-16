import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="space-y-8 mt-6">
      {/* Tier Selection - clickable boxes */}
      <Card data-form-section>
        <CardHeader>
          <CardTitle>Tier Paket</CardTitle>
          <CardDescription>Pilih satu tier untuk paket ini</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="available_tiers"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    value={field.value?.[0] || ""}
                    onValueChange={(val) => field.onChange([val])}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3"
                  >
                    {[
                      { value: "hemat", label: "Hemat" },
                      { value: "nyaman", label: "Nyaman" },
                      { value: "five-star", label: "Five Star" },
                      { value: "pelataran-hemat", label: "Pelataran Hemat" },
                    ].map((tier) => (
                      <label
                        key={tier.value}
                        htmlFor={`tier-${tier.value}`}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors",
                          field.value?.[0] === tier.value
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <RadioGroupItem value={tier.value} id={`tier-${tier.value}`} />
                        <span className="font-medium text-sm">{tier.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Tier Sections */}
      {hasHemat && renderTierSection("Hemat", "hemat_makkah", "hemat_madinah", "hemat_price", "hemat_transport")}
      {hasNyaman && renderTierSection("Nyaman", "makkah", "madinah", "price", "best_seller_transport")}
      {hasFiveStar && renderTierSection("Five Star", "five_star_makkah", "five_star_madinah", "five_star_price", "five_star_transport")}
      {hasPelataranHemat && renderTierSection("Pelataran Hemat", "pelataran_makkah", "pelataran_madinah", "pelataran_price", "pelataran_transport")}

      {/* 4. Promosi & Penjualan */}
      <Card data-form-section>
        <CardHeader>
          <CardTitle>Promosi & Penjualan</CardTitle>
          <CardDescription>Fasilitas tambahan dan diskon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField control={form.control} name="selling_points" render={({ field }) => (
            <FormItem><FormLabel>Selling Points</FormLabel><FormControl>
              <Textarea {...field} placeholder="Thaif + Romansiah, Fotografer, Quba Night" rows={2} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="max_discount" render={({ field }) => (
            <FormItem><FormLabel>Maks Diskon (Rp) <span className="text-destructive">*</span></FormLabel><FormControl>
              <Input 
                type="text" 
                value={field.value ? `Rp ${new Intl.NumberFormat('id-ID').format(field.value)}` : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  field.onChange(raw ? parseInt(raw, 10) : 0);
                }} 
                placeholder="Rp 1.000.000" 
              />
            </FormControl><FormMessage /></FormItem>
          )} />
        </CardContent>
      </Card>
    </div>
  );
};
