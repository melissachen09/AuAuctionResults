'use client';

import Link from 'next/link';
import { Home, BarChart3, Info, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <BarChart3 className="h-6 w-6" />
              <span>AU Auction Results</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6 ml-6">
              <NavLink href="/" icon={<Home className="h-4 w-4" />}>
                首页
              </NavLink>
              <NavLink href="/dashboard" icon={<BarChart3 className="h-4 w-4" />}>
                数据仪表板
              </NavLink>
              <NavLink href="/about" icon={<Info className="h-4 w-4" />}>
                关于
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 hover:bg-accent"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
        'text-muted-foreground'
      )}
    >
      {icon}
      {children}
    </Link>
  );
}