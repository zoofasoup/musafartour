import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="space-y-8">
      {/* Flyer, Katalog & Itinerary - Uniform layout */}
      <Card className="shadow-md border-slate-200 overflow-hidden mb-6">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
          <CardTitle>Flyer, Katalog & Itinerary</CardTitle>
          <CardDescription>Upload file dan/atau masukkan link drive</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
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
      <Card className="shadow-md border-slate-200 overflow-hidden mb-6">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
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


    </div>
  );
};
