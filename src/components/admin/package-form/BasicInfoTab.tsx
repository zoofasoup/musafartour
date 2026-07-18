import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const BasicInfoTab = ({ form }: { form: any }) => {
  return (
    <div className="space-y-8 mt-6">
      {/* 1. Informasi Dasar */}
      <Card data-form-section className="border-t-8 border-t-primary shadow-sm">
        <CardHeader>
          <CardTitle>Informasi Dasar</CardTitle>
          <CardDescription>Identitas utama paket umroh</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField control={form.control} name="package_name" render={({ field }) => (
            <FormItem><FormLabel>Nama Paket *</FormLabel><FormControl><Input {...field} placeholder="Umroh Hemat 9 Hari" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="timeframe" render={({ field }) => (
              <FormItem><FormLabel>Timeframe <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} placeholder="Bulan November" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="slots_total" render={({ field }) => (
              <FormItem><FormLabel>Seat (Kuota) <span className="text-destructive">*</span></FormLabel><FormControl>
                <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="40" />
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </CardContent>
      </Card>

      {/* 2. Jadwal & Penerbangan */}
      <Card data-form-section>
        <CardHeader>
          <CardTitle>Jadwal & Penerbangan</CardTitle>
          <CardDescription>Detail waktu dan rute penerbangan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="departure_date"
              render={({ field }) => {
                const selectedDate = field.value ? new Date(field.value) : undefined;
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Keberangkatan *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal h-10", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "dd MMMM yyyy", { locale: idLocale }) : <span>Pilih tanggal</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={selectedDate} defaultMonth={selectedDate || new Date()} onSelect={(date) => { if (date) field.onChange(format(date, "yyyy-MM-dd")); }} disabled={(date) => date < new Date("2024-01-01")} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField control={form.control} name="duration_days" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Durasi (Hari) *</FormLabel><FormControl>
                <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} className="h-10" placeholder="9" />
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="start_airport" render={({ field }) => (
              <FormItem><FormLabel>Start (Bandara) <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} placeholder="CGK" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="flight" render={({ field }) => (
              <FormItem>
                <FormLabel>Maskapai *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih maskapai" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Garuda Indonesia">Garuda Indonesia</SelectItem>
                    <SelectItem value="Saudia">Saudia</SelectItem>
                    <SelectItem value="Scoot Airlines">Scoot Airlines</SelectItem>
                    <SelectItem value="Oman Air">Oman Air</SelectItem>
                    <SelectItem value="Qatar Airways">Qatar Airways</SelectItem>
                    <SelectItem value="Lion Air">Lion Air</SelectItem>
                    <SelectItem value="Emirates">Emirates</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="flight_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipe Penerbangan *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="transit">Transit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="route" render={({ field }) => (
              <FormItem><FormLabel>Rute <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} placeholder="JED-MED" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={form.control} name="itinerary" render={({ field }) => (
            <FormItem><FormLabel>Itinerary <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} placeholder="Makkah - Madinah" /></FormControl><FormMessage /></FormItem>
          )} />
        </CardContent>
      </Card>

      {/* 3. Durasi Menginap */}
      <Card data-form-section>
        <CardHeader>
          <CardTitle>Durasi Menginap</CardTitle>
          <CardDescription>Lama menetap di setiap kota</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="nights_makkah" render={({ field }) => (
              <FormItem><FormLabel>Malam Makkah <span className="text-destructive">*</span></FormLabel><FormControl>
                <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="4" />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="nights_madinah" render={({ field }) => (
              <FormItem><FormLabel>Malam Madinah <span className="text-destructive">*</span></FormLabel><FormControl>
                <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="3" />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="nights_extra" render={({ field }) => (
              <FormItem><FormLabel>Malam Kota +</FormLabel><FormControl>
                <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="1" />
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
