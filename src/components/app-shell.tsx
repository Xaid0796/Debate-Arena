/**
 * Main application shell with navigation
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, MessageSquare, Trophy, Menu, X } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { href: '/', label: 'Debate', icon: MessageSquare },
        { href: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 safe-top">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-foreground">
                            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-accent-pro" />
                            <span className="truncate">AI Debate Arena</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-6">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive
                                            ? 'text-accent-pro'
                                            : 'text-muted hover:text-foreground'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <button
                            className="md:hidden p-2.5 rounded-lg text-muted hover:text-foreground hover:bg-card-border tap-target"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>

                    {mobileMenuOpen && (
                        <div className="md:hidden py-4 border-t border-card-border">
                            <nav className="flex flex-col gap-2">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors tap-target ${isActive
                                                ? 'bg-accent-pro/10 text-accent-pro'
                                                : 'text-muted hover:text-foreground hover:bg-card-border'
                                                }`}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Icon className="h-5 w-5" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {children}
            </main>

            <footer className="border-t border-card-border bg-card/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <p className="text-center text-sm text-muted">
                        AI Debate Arena — Structured debates with independent AI judging
                    </p>
                </div>
            </footer>
        </div>
    );
}