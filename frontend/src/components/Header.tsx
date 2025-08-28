'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export function Header() {
  return (
    <header className="w-full py-4 px-6 border-b border-white/10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-miniswap-primary to-miniswap-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-xl font-bold text-white">MiniSwap</span>
          </Link>
          
          <nav className="hidden md:flex space-x-6">
            <Link href="/" className="text-white/70 hover:text-white transition-colors">
              Trade
            </Link>
            <Link href="/pools" className="text-white/70 hover:text-white transition-colors">
              Pools
            </Link>
            <Link href="/analytics" className="text-white/70 hover:text-white transition-colors">
              Analytics
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}