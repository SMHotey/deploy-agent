'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Projects', href: '/projects' },
    { name: 'Deployments', href: '/deployments' },
    { name: 'Settings', href: '/settings' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <span className="font-semibold text-primary-foreground">D</span>
            </div>
            <span className="text-lg font-semibold">Deploy Agent</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 ml-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.name}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            Documentation
          </Button>
          <Button size="sm">New Deployment</Button>
          
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

        {mobileMenuOpen && (
        <div id="mobile-navigation" className="md:hidden border-t">
          <div className="container mx-auto px-4 py-3 space-y-3">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <div className="pt-3 space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                Documentation
              </Button>
              <Button size="sm" className="w-full">
                New Deployment
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
