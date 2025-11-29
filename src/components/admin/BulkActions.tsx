import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Trash2, Eye, EyeOff, Download } from "lucide-react";

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
  confirmMessage?: string;
}

interface BulkActionsProps {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: (selected: boolean) => void;
  allSelected: boolean;
  actions: BulkAction[];
  onAction: (actionId: string, selectedIds: string[]) => Promise<void>;
  isLoading?: boolean;
}

export const BulkActions = ({
  selectedIds,
  totalCount,
  onSelectAll,
  allSelected,
  actions,
  onAction,
  isLoading = false,
}: BulkActionsProps) => {
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action: BulkAction) => {
    if (action.confirmMessage) {
      setConfirmAction(action);
    } else {
      await executeAction(action);
    }
  };

  const executeAction = async (action: BulkAction) => {
    setActionLoading(true);
    try {
      await onAction(action.id, selectedIds);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const hasSelection = selectedIds.length > 0;

  return (
    <>
      <div className="flex items-center gap-4 py-2 px-1 bg-muted/50 rounded-md mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onSelectAll(!!checked)}
            aria-label="Select all"
          />
          <span className="text-sm text-muted-foreground">
            {hasSelection ? (
              <span className="font-medium text-foreground">
                {selectedIds.length} dari {totalCount} dipilih
              </span>
            ) : (
              "Pilih semua"
            )}
          </span>
        </div>

        {hasSelection && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading || actionLoading}>
                Bulk Actions
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {actions.map((action, index) => (
                <div key={action.id}>
                  {index > 0 && action.variant === "destructive" && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    onClick={() => handleAction(action)}
                    className={action.variant === "destructive" ? "text-destructive focus:text-destructive" : ""}
                  >
                    {action.icon}
                    <span className="ml-2">{action.label}</span>
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmMessage?.replace("{count}", selectedIds.length.toString())}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && executeAction(confirmAction)}
              disabled={actionLoading}
              className={confirmAction?.variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {actionLoading ? "Loading..." : "Ya, Lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Helper hook for managing selection state
export const useBulkSelection = <T extends { id: string }>(items: T[]) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = (selected: boolean) => {
    setSelectedIds(selected ? items.map((item) => item.id) : []);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: string) => selectedIds.includes(id);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
    allSelected,
  };
};

// Common bulk action definitions
export const commonBulkActions = {
  delete: {
    id: "delete",
    label: "Hapus Semua",
    icon: <Trash2 className="h-4 w-4" />,
    variant: "destructive" as const,
    confirmMessage: "Apakah Anda yakin ingin menghapus {count} item? Tindakan ini tidak dapat dibatalkan.",
  },
  publish: {
    id: "publish",
    label: "Publish Semua",
    icon: <Eye className="h-4 w-4" />,
    confirmMessage: "Publish {count} item yang dipilih?",
  },
  unpublish: {
    id: "unpublish",
    label: "Unpublish Semua",
    icon: <EyeOff className="h-4 w-4" />,
    confirmMessage: "Unpublish {count} item yang dipilih?",
  },
  activate: {
    id: "activate",
    label: "Aktifkan Semua",
    icon: <Eye className="h-4 w-4" />,
    confirmMessage: "Aktifkan {count} item yang dipilih?",
  },
  deactivate: {
    id: "deactivate",
    label: "Nonaktifkan Semua",
    icon: <EyeOff className="h-4 w-4" />,
    confirmMessage: "Nonaktifkan {count} item yang dipilih?",
  },
  export: {
    id: "export",
    label: "Export CSV",
    icon: <Download className="h-4 w-4" />,
  },
};
