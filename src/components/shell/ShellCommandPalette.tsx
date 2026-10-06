import { useNavigate } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ShellNavGroup } from "./types";

interface Props {
  groups: ShellNavGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Type to jump to any page the person is allowed to open. Fed by the same menu as the sidebar, so roles stay respected. */
export const ShellCommandPalette = ({ groups, open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Cari halaman</DialogTitle>
        <DialogDescription className="sr-only">Ketik nama halaman lalu tekan Enter untuk membukanya.</DialogDescription>
        {/* Plain substring match: with a menu this size, cmdk's fuzzy match lets "agen" find "Laporan Keuangan". */}
        <Command
          filter={(value, search) => (value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-12"
        >
          <CommandInput placeholder="Cari halaman, misalnya Data Jamaah" />
          <CommandList>
            <CommandEmpty>Halaman tidak ditemukan.</CommandEmpty>
            {groups.map((group, idx) => (
              <CommandGroup key={group.label ?? idx} heading={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.url}
                      value={item.title}
                      onSelect={() => {
                        onOpenChange(false);
                        navigate(item.url);
                      }}
                      className="h-10 gap-2"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {item.title}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
