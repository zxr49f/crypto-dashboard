'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, Wallet, BarChart3, Bell } from 'lucide-react';
import { clsx } from 'clsx';

const NAV = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/transactions', label: 'Txns', icon: ArrowLeftRight },
  { href: '/wallets', label: 'Wallets', icon: Wallet },
  { href: '/analytics', label: 'Stats', icon: BarChart3 },
  { href: '/notifications', label: 'Alerts', icon: Bell },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-vault-950/95 backdrop-blur border-t border-vault-800 flex justify-around py-2 px-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium',
              active ? 'text-brass-400' : 'text-vault-400'
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
