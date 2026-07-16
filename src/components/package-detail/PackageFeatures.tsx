import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, CheckCircle2, Package, XCircle, Route } from "lucide-react";
import type { PublishedPackage } from "@/hooks/usePackages";
import { parseListItems } from "@/lib/utils";

interface PackageFeaturesProps {
  packageData: PublishedPackage;
  sellingPoints: string[];
  includedItems: string[];
  excludedItems: string[];
  equipmentItems: string[];
}

export function PackageFeatures({
  packageData,
  sellingPoints,
  includedItems,
  excludedItems,
  equipmentItems,
}: PackageFeaturesProps) {
  return (
    <div className="mt-8">
      <Accordion type="single" collapsible className="w-full space-y-4" defaultValue="item-1">
        {/* Selling Points */}
        {sellingPoints.length > 0 && (
          <AccordionItem value="item-1" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> Keunggulan Paket
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sellingPoints.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Included & Excluded */}
        {(includedItems.length > 0 || excludedItems.length > 0) && (
          <AccordionItem value="item-2" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Termasuk & Tidak Termasuk
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {includedItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-emerald-600 uppercase mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Termasuk
                    </h4>
                    <ul className="space-y-2">
                      {includedItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {excludedItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-destructive uppercase mb-3 flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5" /> Tidak Termasuk
                    </h4>
                    <ul className="space-y-2">
                      {excludedItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-destructive shrink-0 font-bold mt-0.5">✕</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Equipment */}
        {equipmentItems.length > 0 && (
          <AccordionItem value="item-3" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Perlengkapan
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid grid-cols-2 gap-3">
                {equipmentItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm py-1">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Itinerary */}
        {packageData.itinerary && packageData.itinerary !== "-" && (
          <AccordionItem value="item-4" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" /> Itinerary Perjalanan
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="relative pl-5 space-y-4 mt-2">
                {parseListItems(packageData.itinerary).map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm" />
                    {idx < parseListItems(packageData.itinerary).length - 1 && (
                      <div className="absolute -left-[15px] top-4 w-0.5 h-[calc(100%+16px)] bg-border" />
                    )}
                    <p className="text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
