'use client';

export function PoolStats() {
  // TODO: Fetch real pool data from smart contracts
  const mockStats = {
    tvl: '$1,234,567',
    volume24h: '$456,789',
    fees24h: '$1,370',
    poolCount: 42
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card text-center">
        <p className="text-sm text-white/60 mb-1">Total Value Locked</p>
        <p className="text-xl font-bold text-white">{mockStats.tvl}</p>
      </div>
      
      <div className="card text-center">
        <p className="text-sm text-white/60 mb-1">24h Volume</p>
        <p className="text-xl font-bold text-white">{mockStats.volume24h}</p>
      </div>
      
      <div className="card text-center">
        <p className="text-sm text-white/60 mb-1">24h Fees</p>
        <p className="text-xl font-bold text-white">{mockStats.fees24h}</p>
      </div>
      
      <div className="card text-center">
        <p className="text-sm text-white/60 mb-1">Active Pools</p>
        <p className="text-xl font-bold text-white">{mockStats.poolCount}</p>
      </div>
    </div>
  );
}