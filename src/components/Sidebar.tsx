'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, Wallet, BarChart3, Bell, Settings, Gem } from 'lucide-react';
import { clsx } from 'clsx';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/wallets', label: 'Wallets', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-vault-800 bg-vault-950/60 px-4 py-6">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-brass-500/15 border border-brass-500/30 flex items-center justify-center">
          <Gem className="w-4 h-4 text-brass-400" />
        </div>
        <div>
          <div className="font-display text-lg leading-none text-vault-100">Vault</div>
          <div className="text-[11px] text-vault-400 tracking-wide">payment monitor</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-vault-800/80 text-brass-400 border border-vault-700'
                  : 'text-vault-300 hover:text-vault-100 hover:bg-vault-800/40 border border-transparent'
              )}
            >
              <Icon className={clsx('w-4 h-4', active ? 'text-brass-400' : 'text-vault-400 group-hover:text-vault-200')} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 px-2">
        <div className="text-[11px] text-vault-500 leading-relaxed">
          Monitoring public addresses only.
          <br />
          No private keys are ever stored.
        </div>
      </div>
    </aside>
  );
}
