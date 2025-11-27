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
        title: "Success",
        description: "Marketing settings saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message}`,
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
        <h1 className="text-3xl font-bold">Marketing Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage tracking pixels and analytics for your website
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Meta Pixel Section */}
          <Card>
            <CardHeader>
              <CardTitle>Meta (Facebook) Pixel</CardTitle>
              <CardDescription>
                Track visitor behavior and optimize Facebook ad campaigns
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
                      Find your Pixel ID in Meta Events Manager
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
                      <FormLabel className="text-base">Enable Meta Pixel</FormLabel>
                      <FormDescription>
                        Activate Meta Pixel tracking on your website
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
                {saveMutation.isPending ? "Saving..." : "Save Meta Pixel Settings"}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* TikTok Pixel Section */}
          <Card>
            <CardHeader>
              <CardTitle>TikTok Pixel</CardTitle>
              <CardDescription>
                Track conversions and optimize TikTok ad campaigns
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
                      Find your Pixel ID in TikTok Events Manager
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
                      <FormLabel className="text-base">Enable TikTok Pixel</FormLabel>
                      <FormDescription>
                        Activate TikTok Pixel tracking on your website
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
                {saveMutation.isPending ? "Saving..." : "Save TikTok Pixel Settings"}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Google Analytics Section */}
          <Card>
            <CardHeader>
              <CardTitle>Google Analytics</CardTitle>
              <CardDescription>
                Track website traffic and user behavior with GA4
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
                      Find your Measurement ID in Google Analytics property settings
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
                      <FormLabel className="text-base">Enable Google Analytics</FormLabel>
                      <FormDescription>
                        Activate GA4 tracking on your website
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
                {saveMutation.isPending ? "Saving..." : "Save Google Analytics Settings"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};

export default MarketingSettings;
