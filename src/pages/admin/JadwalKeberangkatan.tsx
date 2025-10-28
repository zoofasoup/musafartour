import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const JadwalKeberangkatan = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Jadwal Keberangkatan</h1>
        <p className="text-muted-foreground">Manage departure schedules</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Schedule management will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature is under development. You'll be able to manage departure 
            schedules for Umroh and Haji packages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default JadwalKeberangkatan;
