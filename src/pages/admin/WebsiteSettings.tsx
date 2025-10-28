import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const WebsiteSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    site_name: "Musafar Tour",
    site_tagline: "",
    phone_number: "081917403797",
    whatsapp_number: "6281917403797",
    email: "info@musafartour.com",
    address: "",
    google_maps_url: "",
    instagram_url: "",
    facebook_url: "",
    youtube_url: "",
    google_review_url: "",
    office_hours: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("website_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (settings.id) {
        const { error } = await (supabase as any)
          .from("website_settings")
          .update({
            site_name: settings.site_name,
            site_tagline: settings.site_tagline,
            phone_number: settings.phone_number,
            whatsapp_number: settings.whatsapp_number,
            email: settings.email,
            address: settings.address,
            google_maps_url: settings.google_maps_url,
            instagram_url: settings.instagram_url,
            facebook_url: settings.facebook_url,
            youtube_url: settings.youtube_url,
            google_review_url: settings.google_review_url,
            office_hours: settings.office_hours,
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("website_settings")
          .insert(settings);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
      
      fetchSettings();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Website Settings</h1>
        <p className="text-muted-foreground">Configure website settings and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>Basic website information and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_tagline">Site Tagline</Label>
              <Input
                id="site_tagline"
                value={settings.site_tagline || ""}
                onChange={(e) => setSettings({ ...settings, site_tagline: e.target.value })}
                placeholder="e.g., Travel Umroh & Haji Terpercaya"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Contact details for customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={settings.phone_number}
                onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                placeholder="081917403797"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_number">WhatsApp Number (with country code)</Label>
              <Input
                id="whatsapp_number"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                placeholder="6281917403797"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={settings.address || ""}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="office_hours">Office Hours</Label>
            <Input
              id="office_hours"
              value={settings.office_hours || ""}
              onChange={(e) => setSettings({ ...settings, office_hours: e.target.value })}
              placeholder="e.g., Mon-Fri: 9AM-5PM"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Media & Links</CardTitle>
          <CardDescription>Social media profiles and external links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google_maps_url">Google Maps URL</Label>
            <Input
              id="google_maps_url"
              value={settings.google_maps_url || ""}
              onChange={(e) => setSettings({ ...settings, google_maps_url: e.target.value })}
              placeholder="https://maps.google.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="google_review_url">Google Review URL</Label>
            <Input
              id="google_review_url"
              value={settings.google_review_url || ""}
              onChange={(e) => setSettings({ ...settings, google_review_url: e.target.value })}
              placeholder="https://share.google/..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram_url">Instagram URL</Label>
              <Input
                id="instagram_url"
                value={settings.instagram_url || ""}
                onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook_url">Facebook URL</Label>
              <Input
                id="facebook_url"
                value={settings.facebook_url || ""}
                onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                placeholder="https://facebook.com/..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube_url">YouTube URL</Label>
            <Input
              id="youtube_url"
              value={settings.youtube_url || ""}
              onChange={(e) => setSettings({ ...settings, youtube_url: e.target.value })}
              placeholder="https://youtube.com/..."
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save All Settings
          </>
        )}
      </Button>
    </div>
  );
};

export default WebsiteSettings;
