import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface BaseEmailProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseEmail({ preview, children }: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto max-w-[560px] bg-white p-8">
            <Section>
              <Text className="m-0 text-2xl font-bold text-[#0F2557]">DAVKAWT</Text>
              <Text className="m-0 text-xs uppercase tracking-wider text-slate-500">
                Alumni Portal
              </Text>
            </Section>
            <Hr className="my-6 border-slate-200" />
            {children}
            <Hr className="my-6 border-slate-200" />
            <Text className="m-0 text-xs text-slate-500">
              DAV Khagaul Alumni Welfare Trust · Khagaul, Bihar, India
            </Text>
            <Text className="m-0 text-xs text-slate-400">
              You received this because you registered on the DAVKAWT Alumni Portal.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
