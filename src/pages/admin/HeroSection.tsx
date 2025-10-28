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

const HeroSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [heroData, setHeroData] = useState({
    id: "",
    title: "",
    subtitle: "",
    cta_text: "Konsultasi Gratis",
    cta_link: "https://wa.me/6281917403797",
    background_image: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchHeroData();
    }
  }, [isAdmin]);

  const fetchHeroData = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("hero_section")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setHeroData(data);
      }
    } catch (error: any) {
      console.error("Error fetching hero data:", error);
      toast({
        title: "Error",
        description: "Failed to load hero data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (heroData.id) {
        // Update existing
        const { error } = await (supabase as any)
          .from("hero_section")
          .update({
            title: heroData.title,
            subtitle: heroData.subtitle,
            cta_text: heroData.cta_text,
            cta_link: heroData.cta_link,
            background_image: heroData.background_image,
          })
          .eq("id", heroData.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await (supabase as any)
          .from("hero_section")
          .insert({
            title: heroData.title,
            subtitle: heroData.subtitle,
            cta_text: heroData.cta_text,
            cta_link: heroData.cta_link,
            background_image: heroData.background_image,
            is_active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Hero section updated successfully",
      });
      
      fetchHeroData();
    } catch (error: any) {
      console.error("Error saving hero:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save hero section",
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
        <h1 className="text-3xl font-bold">Hero Section</h1>
        <p className="text-muted-foreground">Manage homepage hero content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hero Content</CardTitle>
          <CardDescription>
            Update the main hero section on your homepage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={heroData.title}
              onChange={(e) => setHeroData({ ...heroData, title: e.target.value })}
              placeholder="e.g., Wujudkan Impian Umroh Anda"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Textarea
              id="subtitle"
              value={heroData.subtitle || ""}
              onChange={(e) => setHeroData({ ...heroData, subtitle: e.target.value })}
              placeholder="e.g., Paket umroh terpercaya dengan layanan terbaik"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta_text">Button Text</Label>
              <Input
                id="cta_text"
                value={heroData.cta_text}
                onChange={(e) => setHeroData({ ...heroData, cta_text: e.target.value })}
                placeholder="e.g., Konsultasi Gratis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_link">Button Link</Label>
              <Input
                id="cta_link"
                value={heroData.cta_link}
                onChange={(e) => setHeroData({ ...heroData, cta_link: e.target.value })}
                placeholder="e.g., https://wa.me/6281917403797"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background_image">Background Image URL</Label>
            <Input
              id="background_image"
              value={heroData.background_image || ""}
              onChange={(e) => setHeroData({ ...heroData, background_image: e.target.value })}
              placeholder="e.g., /images/hero-bg.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Upload image to storage and paste the URL here
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroSection;
