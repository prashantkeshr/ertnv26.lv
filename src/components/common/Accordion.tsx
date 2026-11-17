import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from './primitives';

export interface AccordionItem {
  id: string;
  question: string;
  answer: ReactNode;
}

/** Accessible disclosure list: buttons with aria-expanded, panels that animate open and are inert when closed. */
export function Accordion({ items }: { items: AccordionItem[] }) {
  const base = useId();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map((item) => {
        const isOpen = open === item.id;
        const panelId = `${base}-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                id={`${panelId}-btn`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : item.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-base font-semibold text-heading transition-colors hover:bg-soft sm:px-6"
              >
                {item.question}
                <ChevronDown aria-hidden="true" className={cn('size-5 shrink-0 text-link transition-transform duration-300', isOpen && 'rotate-180')} />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={`${panelId}-btn`} inert={!isOpen} className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
              <div className="overflow-hidden">
                <div className="px-5 pb-5 text-sm leading-relaxed text-ink sm:px-6">{item.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
