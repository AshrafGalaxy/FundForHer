'use client';

import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EditableInfoFieldProps {
    icon: React.ReactNode;
    label: string;
    value: string | Date | number | null | undefined;
    placeholder: string;
    fieldKey: string;
    type?: 'text' | 'date' | 'number';
    onSave: (key: string, value: any) => Promise<void>;
    disabled?: boolean;
}

export function EditableInfoField({
    icon,
    label,
    value,
    placeholder,
    fieldKey,
    type = 'text',
    onSave,
    disabled = false
}: EditableInfoFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Format the initial display value
    let initialValue = '';
    if (value instanceof Date) {
        initialValue = format(value, 'yyyy-MM-dd');
    } else if (value && (value as any).toDate) {
        initialValue = format((value as any).toDate(), 'yyyy-MM-dd');
    } else if (value !== null && value !== undefined) {
        initialValue = String(value);
    }

    const [editValue, setEditValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (editValue === initialValue) {
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        try {
            let finalValue: any = editValue;
            if (type === 'date') {
                finalValue = editValue ? new Date(editValue) : null;
            } else if (type === 'number') {
                finalValue = editValue ? Number(editValue) : null;
            }

            await onSave(fieldKey, finalValue);
            setIsEditing(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Update failed',
                description: error.message || 'Could not save changes.'
            });
            setEditValue(initialValue); // reset on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(initialValue);
        }
    };

    // Human readable display values
    let displayValue = value;
    if (type === 'date' && value) {
        displayValue = format(value instanceof Date ? value : ((value as any).toDate ? (value as any).toDate() : new Date((value as unknown) as string | number)), 'PPP');
    }

    return (
        <div className="group flex items-start gap-3 p-2 -mx-2 rounded-lg transition-colors hover:bg-muted/50">
            <div className="text-theme-600 dark:text-theme-400 mt-1 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{label}</p>

                {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                        <Input
                            ref={inputRef}
                            type={type}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-8 max-w-[250px]"
                            disabled={isLoading}
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30" onClick={handleSave} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => { setIsEditing(false); setEditValue(initialValue); }} disabled={isLoading}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className={cn("font-semibold text-foreground truncate", !displayValue && "text-muted-foreground italic")}>
                            {String(displayValue) || placeholder}
                        </p>
                        {!disabled && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-theme-600 dark:hover:text-theme-400"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
