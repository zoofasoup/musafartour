import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const WebsiteSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Website Settings</h1>
        <p className="text-muted-foreground">Configure website settings and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Website settings will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature is under development. You'll be able to configure general 
            website settings, contact information, and other preferences.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebsiteSettings;
