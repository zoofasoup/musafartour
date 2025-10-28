import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const GalleryManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gallery Management</h1>
        <p className="text-muted-foreground">Manage photo galleries</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Gallery management will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature is under development. You'll be able to upload and organize 
            gallery images from the admin panel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GalleryManagement;
