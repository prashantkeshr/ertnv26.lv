import { describe, expect, it } from 'vitest';
import { COMPANY, OWNERSHIP_TEXT } from '@/app/company';
import { composeEmail } from '@/features/contact/ContactForm';

describe('company facts', () => {
  it('states ownership and the support address in one place', () => {
    expect(COMPANY.supportEmail).toBe('support@dhurta.org');
    expect(OWNERSHIP_TEXT).toBe('eport is a subsidiary of Dhurta.org and is managed by Dhurta Group.');
  });
});

describe('composeEmail', () => {
  const values = { name: 'Asha Verma', email: 'asha@example.com', organisation: 'Verma Exports', topic: 'partnership', message: 'We would like to discuss data collaboration & sources.' } as const;

  it('addresses support@dhurta.org with an encoded subject and body', () => {
    const { href, subject, body } = composeEmail(values);
    expect(href.startsWith('mailto:support@dhurta.org?subject=')).toBe(true);
    const params = new URL(href).searchParams;
    expect(params.get('subject')).toBe(subject);
    expect(params.get('body')).toBe(body);
    expect(subject).toContain('Partnership or data collaboration');
  });

  it('keeps special characters intact and includes the sender details', () => {
    const { body } = composeEmail(values);
    expect(body).toContain('data collaboration & sources.');
    expect(body).toContain('Email: asha@example.com');
    expect(body).toContain('Organisation: Verma Exports');
  });

  it('omits an empty organisation line', () => {
    expect(composeEmail({ ...values, organisation: '' }).body).not.toContain('Organisation:');
  });
});
