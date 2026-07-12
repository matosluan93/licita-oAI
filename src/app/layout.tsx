import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LicitAI | Busca LinkedIn',
  description: 'Sourcing interno com analise de editais e RPA LinkedIn.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
