import { ExternalLink as ExternalIcon } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------- buttons ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'light';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'btn-arrow inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px';
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-ocean text-white shadow-[0_10px_24px_-10px_rgb(23_107_154/0.75)] hover:-translate-y-px hover:bg-ocean-dark hover:shadow-[0_14px_28px_-10px_rgb(23_107_154/0.85)]',
  secondary: 'border border-line bg-surface text-heading hover:border-ocean hover:text-link',
  ghost: 'text-link hover:bg-info-soft',
  inverse: 'border border-white/25 bg-white/5 text-white hover:border-white/50 hover:bg-white/15',
  light: 'bg-white text-navy shadow-[0_12px_30px_-12px_rgb(0_0_0/0.65)] hover:-translate-y-px hover:bg-sky',
};
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string): string {
  return cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}
export function Button({ variant, size, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}
export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* ---------- layout ---------- */

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-line bg-surface', className)} {...rest} />;
}

interface SectionProps extends HTMLAttributes<HTMLElement> {
  tone?: 'white' | 'soft' | 'navy';
}
export function Section({ tone = 'white', className, children, ...rest }: SectionProps) {
  return (
    <section
      className={cn(
        'py-14 sm:py-20',
        tone === 'soft' && 'border-y border-line bg-soft',
        tone === 'navy' && 'bg-navy text-white',
        className,
      )}
      {...rest}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  id?: string;
  kicker?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  inverse?: boolean;
  as?: 'h2' | 'h3';
}
export function SectionHeading({ id, kicker, title, description, action, inverse, as: Tag = 'h2' }: SectionHeadingProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {kicker && <Kicker inverse={inverse}>{kicker}</Kicker>}
        <Tag id={id} className={cn('text-2xl font-bold sm:text-3xl', inverse && 'text-white')}>
          {title}
        </Tag>
        {description && (
          <p className={cn('mt-3 text-base leading-relaxed', inverse ? 'text-white/80' : 'text-muted')}>{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Kicker({ children, inverse }: { children: ReactNode; inverse?: boolean }) {
  return (
    <p className={cn('mb-2 text-xs font-semibold tracking-[0.14em] uppercase', inverse ? 'text-sky' : 'text-link')}>
      {children}
    </p>
  );
}

/* ---------- links ---------- */

interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** Hide the trailing icon (the new-tab notice for screen readers stays). */
  bare?: boolean;
}
/** Every link that leaves eport goes through this: new tab, no referrer, and an announced destination. */
export function ExternalLink({ href, children, className, bare, ...rest }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn('link inline-flex items-baseline gap-1', className)} {...rest}>
      <span>{children}</span>
      {!bare && <ExternalIcon aria-hidden="true" className="size-3.5 shrink-0 translate-y-0.5" />}
      <span className="sr-only">(external site, opens in a new tab)</span>
    </a>
  );
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/* ---------- definition list used on profile pages ---------- */

export function FactList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className="text-right text-sm font-medium text-heading">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- form controls ---------- */

export const inputClass =
  'min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted hover:border-muted focus:border-ocean';
