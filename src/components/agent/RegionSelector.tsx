import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Region {
  id: string;
  name: string;
}

interface RegionSelectorProps {
  type: "province" | "city";
  provinceId?: string;
  value: string;
  onChange: (value: string, id?: string) => void;
  placeholder?: string;
}

export function RegionSelector({
  type,
  provinceId,
  value,
  onChange,
  placeholder,
}: RegionSelectorProps) {
  const [open, setOpen] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchRegions = async () => {
      if (type === "city" && !provinceId) {
        setRegions([]);
        return;
      }

      setLoading(true);
      try {
        const url =
          type === "province"
            ? "https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json"
            : `https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch");
        
        const data = await response.json();
        if (isMounted) {
          setRegions(data);
        }
      } catch (error) {
        console.error("Error fetching regions:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRegions();

    return () => {
      isMounted = false;
    };
  }, [type, provinceId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={type === "city" && !provinceId}
        >
          {value || placeholder || `Pilih ${type === "province" ? "Provinsi" : "Kota/Kabupaten"}...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Cari ${type === "province" ? "provinsi" : "kota/kabupaten"}...`} />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                "Tidak ditemukan."
              )}
            </CommandEmpty>
            <CommandGroup>
              {regions.map((region) => (
                <CommandItem
                  key={region.id}
                  value={region.name}
                  onSelect={(currentValue) => {
                    onChange(currentValue, region.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.toLowerCase() === region.name.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {region.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
