/**
 * Contact form. eport has no server, so submitting composes an email and opens the visitor's
 * own mail application addressed to support@dhurta.org. Nothing is transmitted by eport,
 * and the interface says exactly that — it never claims a message was "sent".
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Mail, MailOpen } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { COMPANY } from '@/app/company';
import { Button, cn, inputClass } from '@/components/common/primitives';
import { useToast } from '@/components/feedback/Toast';

const TOPICS = {
  general: 'General enquiry',
  correction: 'Report an error or outdated information',
  source: 'Suggest an official source or authority',
  partnership: 'Partnership or data collaboration',
  press: 'Press and media',
} as const;

const Schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  email: z.string().trim().min(1, 'Enter your email address.').pipe(z.email('Enter a valid email address, such as name@company.com.')),
  organisation: z.string().trim().max(120),
  topic: z.enum(Object.keys(TOPICS) as [keyof typeof TOPICS, ...Array<keyof typeof TOPICS>]),
  message: z.string().trim().min(10, 'Write at least 10 characters so we can understand your request.').max(1500, 'Keep the message under 1,500 characters.'),
});
type Values = z.infer<typeof Schema>;

declare global {
  interface Window {
    /** Test seam: when an array is present, composed mailto links are collected instead of opening a mail client. */
    __eportMailtoSink?: string[];
  }
}

function openMailApp(href: string) {
  if (window.__eportMailtoSink) window.__eportMailtoSink.push(href);
  else window.location.href = href;
}

export function composeEmail(v: Values): { subject: string; body: string; href: string } {
  const subject = `[eport] ${TOPICS[v.topic]} — ${v.name}`;
  const body = [`${v.message}`, '', '—', `Name: ${v.name}`, `Email: ${v.email}`, v.organisation ? `Organisation: ${v.organisation}` : '', `Topic: ${TOPICS[v.topic]}`, 'Sent from: eport.live contact form']
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n');
  return { subject, body, href: `mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-navy">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactForm() {
  const uid = useId();
  const notify = useToast();
  const [composed, setComposed] = useState<ReturnType<typeof composeEmail> | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(Schema), defaultValues: { name: '', email: '', organisation: '', topic: 'general', message: '' }, mode: 'onTouched' });
  const length = watch('message').length;
  const id = (name: string) => `${uid}-${name}`;
  const field = (name: keyof Values) => ({
    id: id(name),
    'aria-invalid': errors[name] ? (true as const) : undefined,
    'aria-describedby': errors[name] ? `${id(name)}-error` : undefined,
    className: cn(inputClass, errors[name] && 'border-bad'),
  });

  function onSubmit(values: Values) {
    const email = composeEmail(values);
    setComposed(email);
    openMailApp(email.href);
  }

  async function copy() {
    if (!composed) return;
    try {
      await navigator.clipboard.writeText(`To: ${COMPANY.supportEmail}\nSubject: ${composed.subject}\n\n${composed.body}`);
      notify('Message copied to the clipboard.');
    } catch {
      notify('Copying was blocked by your browser. Select the text and copy it manually.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Contact eport" className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id('name')} label="Your name" error={errors.name?.message}>
          <input type="text" autoComplete="name" {...register('name')} {...field('name')} />
        </Field>
        <Field id={id('email')} label="Email address" error={errors.email?.message}>
          <input type="email" autoComplete="email" inputMode="email" {...register('email')} {...field('email')} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id('organisation')} label="Organisation (optional)" error={errors.organisation?.message}>
          <input type="text" autoComplete="organization" {...register('organisation')} {...field('organisation')} />
        </Field>
        <Field id={id('topic')} label="Topic" error={errors.topic?.message}>
          <select {...register('topic')} {...field('topic')}>
            {Object.entries(TOPICS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id={id('message')} label="Message" error={errors.message?.message} hint="Please include the page address and the official source if you are reporting an error.">
        <textarea rows={6} {...register('message')} {...field('message')} className={cn(field('message').className, 'min-h-36 py-2.5')} aria-describedby={errors.message ? `${id('message')}-error` : `${id('message')}-hint`} />
        <p className={cn('tabular mt-1 text-end text-xs', length > 1500 ? 'text-bad' : 'text-muted')} aria-live="off">
          {length} / 1,500
        </p>
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          <Mail aria-hidden="true" className="size-4" />
          Compose email to {COMPANY.supportEmail}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        eport has no server. This opens <strong className="font-semibold text-navy">your own email app</strong> with the message ready to send; nothing is sent until you press send there, and eport
        does not keep a copy.
      </p>

      {composed && (
        <div role="status" className="rounded-lg border border-ok/30 bg-ok-soft p-4 text-sm text-ink">
          <p className="flex items-center gap-2 font-semibold text-ok">
            <MailOpen aria-hidden="true" className="size-4" />
            Your email app should now be open
          </p>
          <p className="mt-1.5 leading-relaxed">
            Review the message and press send. If nothing opened (for example, no email app is set up), copy the message or write to{' '}
            <a className="link font-medium" href={`mailto:${COMPANY.supportEmail}`}>
              {COMPANY.supportEmail}
            </a>{' '}
            directly.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={copy}>
            <Copy aria-hidden="true" className="size-4" />
            Copy message
          </Button>
        </div>
      )}
    </form>
  );
}
