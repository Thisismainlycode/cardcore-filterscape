import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://cardcore-filter-builder.joshuachoffm.chatgpt.site'),
  title: 'Cardcore Filter Builder',
  description: 'Turn your OSRS TCG collection into a personalized FilterScape filter.',
  openGraph: {
    title: 'Cardcore Filter Builder',
    description: 'Turn your OSRS TCG collection into a personalized FilterScape filter.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cardcore Filter Builder',
    description: 'Turn your OSRS TCG collection into a personalized FilterScape filter.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
