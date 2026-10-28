import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { Button } from './button.tsx';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  side?: 'right' | 'left';
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  side = 'right',
  children,
  className,
}: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'fixed inset-y-0 z-50 flex max-w-full',
          side === 'right' ? 'right-0' : 'left-0',
        )}
      >
        <div
          className={cn(
            'w-screen max-w-lg border-border bg-card p-6 flex flex-col shadow-none',
            side === 'right' ? 'border-l' : 'border-r',
            className,
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close sheet"
            >
              <X className="h-4 w-4 stroke-[1.5]" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
