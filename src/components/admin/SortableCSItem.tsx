import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { CSNumber } from '@/lib/whatsappRotation';

interface SortableCSItemProps {
  cs: CSNumber;
  index: number;
  isNext: boolean;
  onToggleActive: (cs: CSNumber) => void;
  onEdit: (cs: CSNumber) => void;
  onDelete: (cs: CSNumber) => void;
}

const SortableCSItem = ({ 
  cs, 
  index, 
  isNext, 
  onToggleActive, 
  onEdit, 
  onDelete 
}: SortableCSItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cs.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 rounded-lg border ${
        cs.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
      } ${isDragging ? 'shadow-lg z-50' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>
        
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
          {index + 1}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{cs.name}</span>
            <Badge variant="outline" className="text-xs">
              ×{cs.weight || 1}
            </Badge>
            {!cs.is_active && (
              <Badge variant="secondary" className="text-xs">Nonaktif</Badge>
            )}
            {cs.is_active && isNext && (
              <Badge variant="default" className="text-xs">Next</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">+{cs.phone_number}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={cs.is_active}
          onCheckedChange={() => onToggleActive(cs)}
        />
        <Button variant="ghost" size="icon" onClick={() => onEdit(cs)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(cs)}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default SortableCSItem;
