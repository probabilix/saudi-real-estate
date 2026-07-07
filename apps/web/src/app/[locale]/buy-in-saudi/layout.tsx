import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Buy in Saudi Arabia — Eligibility & Next Steps',
  description: 'Find your path to property ownership in Saudi Arabia. Answer 3 quick questions and get a personalised roadmap with official government links — including Nafath, Absher, and the REGA Saudi Properties portal.',
};

export default function BuyInSaudiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
