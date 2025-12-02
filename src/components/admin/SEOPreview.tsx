import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Share2 } from "lucide-react";

interface SEOPreviewProps {
  title: string;
  description: string;
  url: string;
  ogImage?: string;
}

export const SEOPreview = ({ title, description, url, ogImage }: SEOPreviewProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="w-5 h-5" />
          SEO Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="google">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            <TabsTrigger value="twitter">Twitter</TabsTrigger>
          </TabsList>

          {/* Google Search Preview */}
          <TabsContent value="google" className="space-y-4">
            <div className="border rounded-lg p-4 bg-white dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">musafartour.com</span>
                  </div>
                  <h3 className="text-xl text-blue-600 hover:underline cursor-pointer mb-1">
                    {title || "Page Title"}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {description || "Page description will appear here"}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Title: {title.length}/60 characters</p>
              <p>Description: {description.length}/160 characters</p>
            </div>
          </TabsContent>

          {/* Facebook Preview */}
          <TabsContent value="facebook" className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
              {ogImage && (
                <div className="aspect-video bg-gray-200 relative">
                  <img 
                    src={ogImage} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3 border-t">
                <p className="text-xs text-gray-500 uppercase mb-1">MUSAFARTOUR.COM</p>
                <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                  {title || "Page Title"}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {description || "Page description"}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Twitter Preview */}
          <TabsContent value="twitter" className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
              {ogImage && (
                <div className="aspect-video bg-gray-200 relative">
                  <img 
                    src={ogImage} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3 border-t">
                <h3 className="font-semibold text-base mb-1 line-clamp-1">
                  {title || "Page Title"}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {description || "Page description"}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  musafartour.com
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
