import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/components/common/primitives';
import { useToast } from '@/components/feedback/Toast';
import { nextTheme, THEME_LABEL, useTheme, type ThemeChoice } from '@/hooks/useTheme';

const ICON: Record<ThemeChoice, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

/** Cycles Automatic → Light → Dark. The label states the current theme and what a click does. */
export function ThemeToggle({ className }: { className?: string }) {
  const { choice, cycle } = useTheme();
  const notify = useToast();
  const Icon = ICON[choice];
  return (
    <button
      type="button"
      data-theme-toggle={choice}
      aria-label={`Colour theme: ${THEME_LABEL[choice]}. Switch to ${THEME_LABEL[nextTheme(choice)]}.`}
      title={`Theme: ${THEME_LABEL[choice]}`}
      onClick={() => {
        cycle();
        notify(`Theme: ${THEME_LABEL[nextTheme(choice)]}`);
      }}
      className={cn('rounded-md p-2.5 text-white/85 transition-colors hover:bg-white/10 hover:text-white', className)}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
