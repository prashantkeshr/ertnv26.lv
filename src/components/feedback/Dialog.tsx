import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/components/common/primitives';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel?: string;
  /** "sheet" docks to the inline-end edge at full height (mobile navigation). */
  variant?: 'modal' | 'sheet';
}

/**
 * Accessible modal built on the native <dialog>: the browser provides the focus trap,
 * Escape handling, inert background and focus return. Clicking the backdrop closes it.
 */
export function Dialog({ open, onClose, title, children, closeLabel = 'Close', variant = 'modal' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.showModal !== 'function') return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        'bg-surface p-0 text-ink shadow-menu',
        variant === 'modal' && 'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg',
        variant === 'sheet' && 'ms-auto me-0 h-dvh max-h-none w-[min(22rem,100vw)] max-w-none',
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 id={titleId} className="text-base font-bold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label={closeLabel} className="-me-2 rounded-md p-2.5 text-muted hover:bg-soft hover:text-heading">
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      )}
    </dialog>
  );
}
