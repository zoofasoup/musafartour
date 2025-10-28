import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HeroSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hero Section</h1>
        <p className="text-muted-foreground">Manage homepage hero content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Hero section management will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature is under development. You'll be able to edit hero images, 
            headlines, and call-to-action buttons.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroSection;
