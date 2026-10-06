import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CogsCalculator } from "@/components/admin/cogs/CogsCalculator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Copy, Edit2, CalendarDays } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { canEditPackages, packageStatusBadgeClass, packageStatusLabel } from "@/lib/packageStatus";

export default function ProductDevelopment() {
  const { userRole } = useAuth();
  const canEdit = canEditPackages(userRole);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('departure_date', { ascending: false });
      
    if (data) {
      setPackages(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleCopyCogs = async (sourcePkg: any) => {
    if (!sourcePkg.cogs_data) {
      toast.error("Paket ini belum memiliki data COGS untuk disalin.");
      return;
    }
    // Simple alert for now, can build a real modal to select target package later
    toast.info("Fitur salin COGS akan segera hadir! (Bisa pilih paket tujuan untuk di-paste)");
  };

  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const matchesSearch = pkg.package_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === "All" || (pkg.cogs_status || 'Draft') === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [packages, searchQuery, selectedStatus]);

  // Group by month for better readability
  const groupedPackages = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredPackages.forEach(pkg => {
      const monthYear = pkg.departure_date ? format(new Date(pkg.departure_date), 'MMMM yyyy') : 'Tanpa Tanggal';
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(pkg);
    });
    return groups;
  }, [filteredPackages]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Development</h1>
          <p className="text-muted-foreground mt-2">
            Kelola Costing (HPP), komponen harga mentah, dan profit per paket.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Cari nama paket..." 
            className="pl-10 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {['All', 'Draft', 'Saved'].map(status => (
            <Button 
              key={status}
              variant={selectedStatus === status ? "default" : "outline"}
              onClick={() => setSelectedStatus(status)}
              className="flex-1 sm:flex-none"
            >
              {status === 'All' ? 'Semua status' : status === 'Draft' ? 'Draf' : 'Tersimpan'}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-10 text-slate-500">Memuat data paket...</div>
        ) : Object.keys(groupedPackages).length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200">
            Tidak ada paket yang sesuai pencarian.
          </div>
        ) : (
          Object.keys(groupedPackages).map((monthGroup) => (
            <Card key={monthGroup} className="overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-slate-500" />
                <h3 className="font-semibold text-slate-700">{monthGroup}</h3>
                <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-600">
                  {groupedPackages[monthGroup].length} Paket
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white">
                    <TableHead className="w-[40%]">Nama Paket</TableHead>
                    <TableHead>Keberangkatan</TableHead>
                    <TableHead>Status Paket</TableHead>
                    <TableHead>Status COGS</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedPackages[monthGroup].map(pkg => (
                    <TableRow key={pkg.id} className="bg-white">
                      <TableCell className="font-medium text-slate-900">{pkg.package_name}</TableCell>
                      <TableCell className="text-slate-600">
                        {pkg.departure_date ? format(new Date(pkg.departure_date), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={packageStatusBadgeClass(pkg.status)}>
                          {packageStatusLabel(pkg.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pkg.cogs_status === 'Saved' ? 'default' : 'secondary'}
                               className={pkg.cogs_status === 'Saved' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-none'}>
                          {pkg.cogs_status === 'Saved' ? 'Tersimpan' : 'Draf'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="default" size="sm" className="shadow-none mr-2">
                              <Edit2 className="h-4 w-4 mr-1.5" />
                              {canEdit ? "Kelola COGS" : "Lihat COGS"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>COGS - {pkg.package_name}</DialogTitle>
                            </DialogHeader>
                            <CogsCalculator
                              packageId={pkg.id}
                              initialData={pkg.cogs_data}
                              packageData={pkg}
                              onSaved={fetchPackages}
                              readOnly={!canEdit}
                            />
                          </DialogContent>
                        </Dialog>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9">
                              <span className="sr-only">Buka menu</span>
                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyCogs(pkg)} className="cursor-pointer">
                              <Copy className="h-4 w-4 mr-2 text-slate-500" />
                              Salin Data COGS...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
