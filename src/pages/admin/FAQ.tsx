import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FAQ = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">FAQ Management</h1>
        <p className="text-muted-foreground">Manage frequently asked questions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            FAQ management will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature is under development. You'll be able to create and manage 
            frequently asked questions displayed on your website.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FAQ;
