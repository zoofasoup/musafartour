import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Route, MapPin } from "lucide-react";
import { parseListItems } from "@/lib/utils";

interface ItineraryDay {
  dayLabel: string;
  city: string;
  date: string;
  activities: { time: string | null; text: string }[];
}

function parseDayBlock(block: string): ItineraryDay | null {
  const [headerPart, ...bodyParts] = block.split("\n\n");
  const bodyText = bodyParts.join("\n\n");
  const [dayLine = "", date = ""] = headerPart.split("\n");
  const [dayLabel = "", city = ""] = dayLine.split(" • ");
  if (!dayLabel) return null;

  const activities = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sepIdx = line.indexOf(" — ");
      if (sepIdx === -1) return { time: null, text: line };
      return { time: line.slice(0, sepIdx), text: line.slice(sepIdx + 3) };
    });

  return { dayLabel, city, date, activities };
}

interface ItineraryDialogProps {
  packageName: string;
  itinerary: string | null | undefined;
  trigger?: React.ReactNode;
}

export function ItineraryDialog({ packageName, itinerary, trigger }: ItineraryDialogProps) {
  const [open, setOpen] = useState(false);

  const days = useMemo(() => {
    return parseListItems(itinerary)
      .map(parseDayBlock)
      .filter((d): d is ItineraryDay => d !== null);
  }, [itinerary]);

  if (days.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2 text-sm">
            <Route className="h-4 w-4" /> Lihat Itinerary
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        overlayClassName="backdrop-blur-sm z-[105]"
        className="z-[110] w-[calc(100%-3rem)] max-h-[calc(100%-3rem)] sm:max-w-xl sm:max-h-[85vh] overflow-y-auto rounded-3xl p-0"
      >
        <DialogHeader className="p-6 pb-2 sticky top-0 bg-background z-10 border-b">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" /> Itinerary Perjalanan
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{packageName}</p>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-3">
          {days.map((day, idx) => (
            <div key={idx} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {day.dayLabel}
                  </Badge>
                  {day.city && (
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> {day.city}
                    </span>
                  )}
                </div>
                {day.date && <span className="text-xs text-muted-foreground">{day.date}</span>}
              </div>

              <div className="relative pl-4 space-y-3">
                {day.activities.map((activity, aIdx) => (
                  <div key={aIdx} className="relative">
                    {aIdx < day.activities.length - 1 && (
                      <div className="absolute -left-4 top-2 w-px h-[calc(100%+8px)] bg-border" />
                    )}
                    <div className="absolute -left-[18px] top-1 w-2 h-2 rounded-full bg-primary" />
                    <div className="flex flex-col gap-0.5">
                      {activity.time && (
                        <span className="text-xs font-mono font-semibold text-primary">{activity.time}</span>
                      )}
                      <p className="text-sm leading-relaxed">{activity.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
