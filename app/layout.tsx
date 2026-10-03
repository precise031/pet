import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DemoPet } from '@/components/dashboard/DemoPet';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bunny Panel',
  description: 'Panel w Next.js z maskotką, która chodzi po krawędziach elementów strony.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>
        {children}
        <DemoPet />
      </body>
    </html>
  );
}
