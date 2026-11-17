import { AtSign, BookCheck, Handshake, Landmark } from 'lucide-react';
import { COMPANY } from '@/app/company';
import { Reveal } from '@/components/common/motion';
import { OwnershipNote } from '@/components/common/OwnershipNote';
import { Kicker } from '@/components/common/primitives';
import { ContactForm } from './ContactForm';

const REASONS = [
  { icon: BookCheck, text: 'Report an error or an out-of-date source' },
  { icon: Landmark, text: 'Suggest an official authority or data source' },
  { icon: Handshake, text: 'Partnerships and data collaboration' },
];

/** Contact block used on the home page (dark band) and the /contact page. */
export function ContactSection({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const Heading = headingLevel;
  return (
    <section aria-labelledby="contact-heading" id="contact" className="hero-bg relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-70" />
      <div className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <Reveal>
          <Kicker inverse>Contact</Kicker>
          <Heading id="contact-heading" className="text-3xl font-bold text-white sm:text-4xl">
            Talk to the eport team
          </Heading>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
            Found something wrong, know a better official source, or want to work with us? Write to us — accuracy improves because people tell us where it falls short.
          </p>

          <a
            href={`mailto:${COMPANY.supportEmail}`}
            className="glass group mt-8 flex max-w-md items-center gap-4 rounded-xl p-4 transition-colors hover:border-white/40"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-aurora/20 text-sky">
              <AtSign aria-hidden="true" className="size-5" />
            </span>
            <span>
              <span className="block text-xs font-medium text-white/70">Email</span>
              <span className="block font-display text-lg font-bold text-white group-hover:underline">{COMPANY.supportEmail}</span>
            </span>
          </a>

          <ul className="mt-8 space-y-3">
            {REASONS.map((r) => (
              <li key={r.text} className="flex items-center gap-3 text-sm text-white/85">
                <r.icon aria-hidden="true" className="size-4 shrink-0 text-sky" />
                {r.text}
              </li>
            ))}
          </ul>

          <div className="mt-10 border-t border-white/15 pt-6 text-sm leading-relaxed text-white/75 [&_a]:text-sky">
            <OwnershipNote />
            <p className="mt-2">eport is independent of any government, customs, port or regulatory body and cannot give legal or customs advice or check on a specific shipment.</p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-2xl bg-white p-6 text-ink shadow-[0_30px_70px_-30px_rgb(0_0_0/0.7)] sm:p-8">
            <h3 className="font-display text-xl font-bold text-navy">Send us a message</h3>
            <p className="mt-1 mb-6 text-sm text-muted">All fields except organisation are required.</p>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
