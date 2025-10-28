import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PaketHaji = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paket Haji</h1>
        <p className="text-muted-foreground">Manage Haji packages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Haji package management will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature is under development. You'll be able to create and manage 
            Haji packages similar to Umroh packages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaketHaji;
