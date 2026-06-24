import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Tamleeq | AI-Powered Property Marketplace',
    template: '%s | Tamleeq',
  },
  description:
    'Find your perfect property in Saudi Arabia. AI-powered search, qualified leads for brokers, personalized experience for buyers.',
  keywords: ['Saudi Arabia', 'real estate', 'property', 'Riyadh', 'Jeddah', 'villa', 'apartment', 'AI'],
  robots: 'index, follow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
