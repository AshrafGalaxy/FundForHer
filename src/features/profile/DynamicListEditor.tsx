'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface DynamicListEditorProps<T extends { id: string }> {
  items: T[];
  onAdd: (item: T) => void;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  renderSummary: (item: T) => React.ReactNode;
  renderForm: (item: T | null, onChange: (item: T) => void) => React.ReactNode;
  createEmpty: () => T;
  title: string;
  addLabel?: string;
  emptyMessage?: string;
  maxItems?: number;
}

export function DynamicListEditor<T extends { id: string }>({
  items,
  onAdd,
  onEdit,
  onDelete,
  renderSummary,
  renderForm,
  createEmpty,
  title,
  addLabel = 'Add Entry',
  emptyMessage = 'No entries yet.',
  maxItems = 20,
}: DynamicListEditorProps<T>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    const empty = createEmpty();
    setEditing(null);
    setDraft(empty);
    setOpen(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setDraft({ ...item });
    setOpen(true);
  };

  const handleSave = () => {
    if (!draft) return;
    if (editing) {
      onEdit(draft);
    } else {
      onAdd(draft);
    }
    setOpen(false);
    setDraft(null);
    setEditing(null);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-6 text-center text-sm text-muted-foreground bg-secondary/20">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-secondary/30 hover:bg-secondary/50 border rounded-xl px-4 py-3 transition-colors group">
              <div className="flex-1 min-w-0">
                {renderSummary(item)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length < maxItems && (
        <Button type="button" variant="outline" size="sm" className="gap-2 w-full border-dashed" onClick={openAdd}>
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      )}

      {/* Edit / Add Drawer */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setDraft(null); setEditing(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline">{editing ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {draft && renderForm(editing, (updated) => setDraft(updated))}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} className="bg-theme-600 hover:bg-theme-700 text-white">
              {editing ? 'Save Changes' : `Add ${title}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove this entry from your profile.</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
