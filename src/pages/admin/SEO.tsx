import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, FileText, Link as LinkIcon, Settings, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { checkSEO } from "@/lib/seoScoreChecker";

const SEO = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Fetch global SEO settings
  const { data: globalSettings, isLoading: loadingGlobal } = useQuery({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_settings")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch page SEO settings
  const { data: pageSettings, isLoading: loadingPages } = useQuery({
    queryKey: ["page-seo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_seo")
        .select("*")
        .order("page_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch redirects
  const { data: redirects, isLoading: loadingRedirects } = useQuery({
    queryKey: ["redirects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redirects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Save global settings mutation
  const saveGlobalMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("seo_settings")
        .update(data)
        .eq("id", globalSettings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
      toast({
        title: "Saved",
        description: "Global SEO settings updated successfully.",
      });
    },
  });

  // Save page SEO mutation
  const savePageMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const { error } = await supabase
        .from("page_seo")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-seo"] });
      toast({
        title: "Saved",
        description: "Page SEO updated successfully.",
      });
    },
  });

  // Add/update redirect mutation
  const saveRedirectMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        const { error } = await supabase
          .from("redirects")
          .update(data)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("redirects").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redirects"] });
      toast({
        title: "Saved",
        description: "Redirect rule saved successfully.",
      });
    },
  });

  if (!user || !isAdmin) {
    navigate("/auth");
    return null;
  }

  if (loadingGlobal || loadingPages || loadingRedirects) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">SEO Management</h1>
        <p className="text-muted-foreground">
          Manage your website's search engine optimization settings
        </p>
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="global">
            <Globe className="w-4 h-4 mr-2" />
            Global Settings
          </TabsTrigger>
          <TabsTrigger value="pages">
            <FileText className="w-4 h-4 mr-2" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="redirects">
            <LinkIcon className="w-4 h-4 mr-2" />
            Redirects
          </TabsTrigger>
          <TabsTrigger value="robots">
            <Settings className="w-4 h-4 mr-2" />
            Robots.txt
          </TabsTrigger>
          <TabsTrigger value="sitemap">
            <ExternalLink className="w-4 h-4 mr-2" />
            Sitemap
          </TabsTrigger>
        </TabsList>

        {/* Global Settings Tab */}
        <TabsContent value="global">
          <Card>
            <CardHeader>
              <CardTitle>Default SEO Settings</CardTitle>
              <CardDescription>
                These settings will be used as defaults across your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site_title">Site Title</Label>
                <Input
                  id="site_title"
                  defaultValue={globalSettings?.site_title}
                  onChange={(e) =>
                    saveGlobalMutation.mutate({ site_title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_description">Default Meta Description</Label>
                <Textarea
                  id="site_description"
                  rows={3}
                  defaultValue={globalSettings?.site_description}
                  onChange={(e) =>
                    saveGlobalMutation.mutate({ site_description: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  {globalSettings?.site_description?.length || 0} characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_keywords">Default Keywords</Label>
                <Input
                  id="default_keywords"
                  placeholder="Comma-separated keywords"
                  defaultValue={globalSettings?.default_keywords}
                  onChange={(e) =>
                    saveGlobalMutation.mutate({ default_keywords: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_og_image">Default Social Sharing Image (URL)</Label>
                <Input
                  id="default_og_image"
                  placeholder="https://..."
                  defaultValue={globalSettings?.default_og_image}
                  onChange={(e) =>
                    saveGlobalMutation.mutate({ default_og_image: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_site">Twitter Handle</Label>
                <Input
                  id="twitter_site"
                  placeholder="@musafartour"
                  defaultValue={globalSettings?.twitter_site}
                  onChange={(e) =>
                    saveGlobalMutation.mutate({ twitter_site: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Page-Level SEO</CardTitle>
              <CardDescription>
                Configure SEO settings for individual pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Meta Title</TableHead>
                    <TableHead>Meta Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageSettings?.map((page: any) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.page_name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {page.meta_title || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {page.meta_description || "-"}
                        {page.meta_description && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({page.meta_description.length} chars)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={page.robots_meta?.includes("noindex") ? "destructive" : "default"}>
                          {page.robots_meta || "index, follow"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redirects Tab */}
        <TabsContent value="redirects">
          <Card>
            <CardHeader>
              <CardTitle>301 Redirects</CardTitle>
              <CardDescription>
                Manage URL redirects to prevent broken links
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Add New Redirect
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redirects?.map((redirect: any) => (
                    <TableRow key={redirect.id}>
                      <TableCell className="font-mono text-sm">
                        {redirect.from_path}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {redirect.to_path}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{redirect.redirect_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={redirect.is_active ? "default" : "secondary"}>
                          {redirect.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {redirects?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No redirects configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Robots.txt Tab */}
        <TabsContent value="robots">
          <Card>
            <CardHeader>
              <CardTitle>Robots.txt Editor</CardTitle>
              <CardDescription>
                Control which pages search engines can crawl
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                rows={12}
                className="font-mono text-sm"
                defaultValue={globalSettings?.robots_txt}
                onChange={(e) =>
                  saveGlobalMutation.mutate({ robots_txt: e.target.value })
                }
              />
              <Button onClick={() => toast({ title: "Saved", description: "Robots.txt updated" })}>
                <Save className="w-4 h-4 mr-2" />
                Save Robots.txt
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sitemap Tab */}
        <TabsContent value="sitemap">
          <Card>
            <CardHeader>
              <CardTitle>XML Sitemap</CardTitle>
              <CardDescription>
                Your sitemap is automatically generated and updated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-mono mb-2">
                  https://musafartour.com/sitemap.xml
                </p>
                <Button variant="outline" asChild>
                  <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Sitemap
                  </a>
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Included Pages:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>All published static pages</li>
                  <li>All published articles</li>
                  <li>All published packages</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Excluded Pages:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Admin dashboard pages</li>
                  <li>Authentication pages</li>
                  <li>Draft content</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SEO;
