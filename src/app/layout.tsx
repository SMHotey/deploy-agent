import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Deploy Agent - Modern Deployment Automation',
  description: 'One-click deployment from git repositories to Vercel, Netlify, Cloudflare Pages, and more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-6 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
              <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                Built by Deploy Agent. The source code is available on{' '}
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-4"
                >
                  GitHub
                </a>
                .
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}