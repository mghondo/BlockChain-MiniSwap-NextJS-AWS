'use client';

import { SwapInterface } from '@/components/SwapInterface';
import { LiquidityPanel } from '@/components/LiquidityPanel';
import { PoolStats } from '@/components/PoolStats';
import { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity'>('swap');

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-lg">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-miniswap-primary to-miniswap-secondary bg-clip-text text-transparent">
          MiniSwap DEX
        </h1>
        
        <div className="card">
          <div className="flex mb-6 border-b border-white/20">
            <button
              className={`flex-1 pb-3 font-semibold transition-colors ${
                activeTab === 'swap' 
                  ? 'text-miniswap-accent border-b-2 border-miniswap-accent' 
                  : 'text-white/60 hover:text-white'
              }`}
              onClick={() => setActiveTab('swap')}
            >
              Swap
            </button>
            <button
              className={`flex-1 pb-3 font-semibold transition-colors ${
                activeTab === 'liquidity' 
                  ? 'text-miniswap-accent border-b-2 border-miniswap-accent' 
                  : 'text-white/60 hover:text-white'
              }`}
              onClick={() => setActiveTab('liquidity')}
            >
              Liquidity
            </button>
          </div>

          {activeTab === 'swap' ? <SwapInterface /> : <LiquidityPanel />}
        </div>

        <div className="mt-8">
          <PoolStats />
        </div>
      </div>
    </div>
  );
}