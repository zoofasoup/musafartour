import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const marketingSettingsSchema = z.object({
  meta_pixel_id: z.string().optional(),
  meta_pixel_enabled: z.boolean().default(false),
  tiktok_pixel_id: z.string().optional(),
  tiktok_pixel_enabled: z.boolean().default(false),
  ga4_id: z.string().optional(),
  ga4_enabled: z.boolean().default(false),
});

type MarketingSettingsForm = z.infer<typeof marketingSettingsSchema>;

const MarketingSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MarketingSettingsForm>({
    resolver: zodResolver(marketingSettingsSchema),
    defaultValues: {
      meta_pixel_id: "",
      meta_pixel_enabled: false,
      tiktok_pixel_id: "",
      tiktok_pixel_enabled: false,
      ga4_id: "",
      ga4_enabled: false,
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["marketing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: MarketingSettingsForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const settingsData = {
        ...values,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("marketing_settings")
          .update(settingsData)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketing_settings")
          .insert([settingsData]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-settings"] });
      toast({
        title: "Berhasil",
        description: "Pengaturan marketing disimpan.",
      });
    },
    onError: (error) => {
      toast({
        title: "Gagal",
        description: `Pengaturan gagal disimpan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        meta_pixel_id: settings.meta_pixel_id || "",
        meta_pixel_enabled: settings.meta_pixel_enabled,
        tiktok_pixel_id: settings.tiktok_pixel_id || "",
        tiktok_pixel_enabled: settings.tiktok_pixel_enabled,
        ga4_id: settings.ga4_id || "",
        ga4_enabled: settings.ga4_enabled,
      });
    }
  }, [settings, form]);

  const onSubmit = (values: MarketingSettingsForm) => {
    saveMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Pengaturan Marketing</h1>
        <p className="text-muted-foreground mt-2">
          Atur pixel pelacakan dan analitik untuk website
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Meta Pixel Section */}
          <Card>
            <CardHeader>
              <CardTitle>Meta (Facebook) Pixel</CardTitle>
              <CardDescription>
                Lacak perilaku pengunjung dan optimalkan iklan Facebook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="meta_pixel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Pixel ID</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789012345" {...field} />
                    </FormControl>
                    <FormDescription>
                      Cari Pixel ID di Meta Events Manager
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meta_pixel_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Aktifkan Meta Pixel</FormLabel>
                      <FormDescription>
                        Nyalakan pelacakan Meta Pixel di website
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan pengaturan Meta Pixel"}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* TikTok Pixel Section */}
          <Card>
            <CardHeader>
              <CardTitle>TikTok Pixel</CardTitle>
              <CardDescription>
                Lacak konversi dan optimalkan iklan TikTok
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="tiktok_pixel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok Pixel ID</FormLabel>
                    <FormControl>
                      <Input placeholder="ABCDEFGH12345678" {...field} />
                    </FormControl>
                    <FormDescription>
                      Cari Pixel ID di TikTok Events Manager
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tiktok_pixel_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Aktifkan TikTok Pixel</FormLabel>
                      <FormDescription>
                        Nyalakan pelacakan TikTok Pixel di website
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan pengaturan TikTok Pixel"}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Google Analytics Section */}
          <Card>
            <CardHeader>
              <CardTitle>Google Analytics</CardTitle>
              <CardDescription>
                Lacak lalu lintas dan perilaku pengunjung dengan GA4
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="ga4_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GA4 Measurement ID</FormLabel>
                    <FormControl>
                      <Input placeholder="G-XXXXXXXXXX" {...field} />
                    </FormControl>
                    <FormDescription>
                      Cari Measurement ID di pengaturan properti Google Analytics
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ga4_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Aktifkan Google Analytics</FormLabel>
                      <FormDescription>
                        Nyalakan pelacakan GA4 di website
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan pengaturan Google Analytics"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};

export default MarketingSettings;
