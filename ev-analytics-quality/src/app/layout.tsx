import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'EV Analytics Quality · Ravity', description: 'Connected-vehicle quality analytics for an EV maker: early warning, AI root cause, predictive failure, warranty, supplier and plant quality, and risk-based recall. Demo build on generated data.' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" />
        <link rel="icon" href="/ravity-logo.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
