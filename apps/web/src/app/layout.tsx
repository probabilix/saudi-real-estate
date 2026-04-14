import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Saudi Real Estate | AI-Powered Property Marketplace',
    template: '%s | Saudi Real Estate',
  },
  description:
    'Find your perfect property in Saudi Arabia. AI-powered search, qualified leads for brokers, personalized experience for buyers.',
  keywords: ['Saudi Arabia', 'real estate', 'property', 'Riyadh', 'Jeddah', 'villa', 'apartment', 'AI'],
  robots: 'index, follow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
