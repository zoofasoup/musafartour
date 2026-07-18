import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const FasilitasTab = ({
  form,
  dbStandardItems,
  dbOptionalItems,
  dbExcludeItems,
  AddItemInput
}: any) => {
  return (
    <div className="space-y-8">
      {/* Fasilitas */}
      <Card data-form-section className="shadow-sm border-primary/10 overflow-hidden mb-10 rounded-lg">
        <CardHeader className="bg-primary/5 border-b border-primary/10 px-8 py-6">
          <CardTitle className="text-2xl text-primary font-bold tracking-tight">Fasilitas Paket</CardTitle>
          <CardDescription className="text-base mt-1">Fasilitas dikelola di halaman <a href="/admin/package-items" className="text-primary underline" target="_blank">Fasilitas Paket</a></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="space-y-3">
            <FormLabel className="text-base font-semibold">Termasuk (Standard)</FormLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/50">
              {Array.from(new Set(dbStandardItems?.map((i: any) => i.name) || [])).map((name: any) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-sm">✓ {name}</span>
                </div>
              ))}
              {(!dbStandardItems || dbStandardItems.length === 0) && (
                <p className="text-sm text-muted-foreground col-span-2">Belum ada item standard. Tambah di halaman Fasilitas Paket.</p>
              )}
            </div>
          </div>

          <FormField
            control={form.control}
            name="optional_items"
            render={({ field }) => {
              const uniqueOptionalNames = Array.from(new Set(dbOptionalItems?.map((i: any) => i.name) || [])) as string[];
              const customItems = form.watch("custom_optional_items") || [];
              const allCustomItems = customItems.filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

              return (
                <FormItem>
                  <div className="space-y-3">
                    <FormLabel className="text-base font-semibold">Termasuk (Opsional)</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/50">
                      {uniqueOptionalNames.map((name: string) => {
                        const isSelected = field.value?.includes(name);
                        return (
                          <div 
                            key={name} 
                            onClick={() => {
                              if (isSelected) field.onChange(field.value?.filter((item: string) => item !== name));
                              else field.onChange([...(field.value || []), name]);
                            }}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer transition-opacity",
                              isSelected ? "opacity-100 font-medium" : "opacity-50 hover:opacity-80"
                            )}
                          >
                            <span className="text-sm">✓ {name}</span>
                          </div>
                        );
                      })}
                      {allCustomItems.map((name: string) => {
                        const isSelected = field.value?.includes(name);
                        return (
                          <div 
                            key={`custom-${name}`} 
                            onClick={() => {
                              if (isSelected) {
                                field.onChange(field.value?.filter((item: string) => item !== name));
                                form.setValue("custom_optional_items", customItems.filter((i: string) => i !== name));
                              }
                            }}
                            className="flex items-center gap-2 cursor-pointer transition-opacity opacity-100 font-medium"
                          >
                            <span className="text-sm">✓ {name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2">
                      <AddItemInput onAdd={(name: string) => {
                        const customs = form.getValues("custom_optional_items") || [];
                        if (!customs.includes(name)) {
                          form.setValue("custom_optional_items", [...customs, name]);
                        }
                        if (!field.value?.includes(name)) {
                          field.onChange([...(field.value || []), name]);
                        }
                      }} />
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <div className="space-y-3">
            <FormLabel className="text-base font-semibold">Tidak Termasuk</FormLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/50">
              {Array.from(new Set(dbExcludeItems?.map((i: any) => i.name) || [])).map((name: any) => (
                <div key={name} className="flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-sm">{name}</span>
                </div>
              ))}
              {(!dbExcludeItems || dbExcludeItems.length === 0) && (
                <p className="text-sm text-muted-foreground col-span-2">Belum ada item. Tambah di halaman Fasilitas Paket.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
