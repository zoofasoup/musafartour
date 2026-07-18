import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export const MediaContentTab = ({
  form,
  loading,
  bannerPreview, handleBannerFiles, removeBanner,
  katalogPreview, setKatalogFile, setKatalogPreview,
  itineraryPreview, setItineraryFile, setItineraryPreview,
  galleryPreviews, handleGalleryFiles, removeGalleryImage,
  dbStandardItems, dbOptionalItems, dbExcludeItems,
  ImageDropZone, DocDropZone, AddItemInput
}: any) => {
  return (
    <div className="space-y-8 mt-6">
      {/* Flyer, Katalog & Itinerary - Uniform layout */}
      <Card>
        <CardHeader>
          <CardTitle>Flyer, Katalog & Itinerary</CardTitle>
          <CardDescription>Upload file dan/atau masukkan link drive</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Flyer */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Flyer</p>
              <ImageDropZone
                label=""
                description="Gambar flyer, maks 5MB"
                previews={bannerPreview ? [bannerPreview] : []}
                onFiles={handleBannerFiles}
                onRemove={removeBanner}
                disabled={loading}
              />
            </div>

            {/* Katalog */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Katalog</p>
              <DocDropZone
                preview={katalogPreview}
                onFile={(f: any) => { setKatalogFile(f); setKatalogPreview(f.name); }}
                onRemove={() => { setKatalogFile(null); setKatalogPreview(""); }}
              />
            </div>

            {/* Itinerary */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Itinerary</p>
              <DocDropZone
                preview={itineraryPreview}
                onFile={(f: any) => { setItineraryFile(f); setItineraryPreview(f.name); }}
                onRemove={() => { setItineraryFile(null); setItineraryPreview(""); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Images */}
      <Card>
        <CardHeader>
          <CardTitle>Gallery Images</CardTitle>
          <CardDescription>Upload gambar galeri (maksimal 10 gambar)</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageDropZone
            label="Upload Gallery Images"
            description="Maks 10 gambar, 5MB each. Drag & drop atau Ctrl+V."
            multiple
            maxFiles={10}
            previews={galleryPreviews}
            onFiles={handleGalleryFiles}
            onRemove={removeGalleryImage}
            disabled={loading || galleryPreviews.length >= 10}
          />
        </CardContent>
      </Card>

      {/* Fasilitas */}
      <Card data-form-section>
        <CardHeader>
          <CardTitle>Fasilitas Paket</CardTitle>
          <CardDescription>Fasilitas dikelola di halaman <a href="/admin/package-items" className="text-primary underline" target="_blank">Fasilitas Paket</a></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <FormLabel className="text-base font-semibold">Termasuk (Standard)</FormLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/50">
              {dbStandardItems?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-sm">✓ {item.name}</span>
                </div>
              ))}
              {dbStandardItems?.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">Belum ada item standard. Tambah di halaman Fasilitas Paket.</p>
              )}
            </div>
          </div>

          <FormField
            control={form.control}
            name="optional_items"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-3">
                  <FormLabel className="text-base font-semibold">Termasuk (Opsional)</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 rounded-lg border">
                    {dbOptionalItems?.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={field.value?.includes(item.name)}
                          onCheckedChange={(checked) => {
                            if (checked) field.onChange([...(field.value || []), item.name]);
                            else field.onChange(field.value?.filter((v: string) => v !== item.name));
                          }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                    ))}
                    {(form.watch("custom_optional_items") || []).map((item: string, idx: number) => (
                      <div key={`custom-${idx}`} className="flex items-center gap-2 group">
                        <Checkbox
                          checked={field.value?.includes(item)}
                          onCheckedChange={(checked) => {
                            if (checked) field.onChange([...(field.value || []), item]);
                            else field.onChange(field.value?.filter((v: string) => v !== item));
                          }}
                        />
                        <span className="text-sm flex-1">{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const customs = form.getValues("custom_optional_items") || [];
                            form.setValue("custom_optional_items", customs.filter((_: any, i: number) => i !== idx));
                            field.onChange(field.value?.filter((v: string) => v !== item));
                          }}
                        >
                          <X className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <AddItemInput onAdd={(name: string) => {
                    const customs = form.getValues("custom_optional_items") || [];
                    form.setValue("custom_optional_items", [...customs, name]);
                  }} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <FormLabel className="text-base font-semibold">Tidak Termasuk</FormLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/50">
              {dbExcludeItems?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
              {dbExcludeItems?.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">Belum ada item. Tambah di halaman Fasilitas Paket.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
