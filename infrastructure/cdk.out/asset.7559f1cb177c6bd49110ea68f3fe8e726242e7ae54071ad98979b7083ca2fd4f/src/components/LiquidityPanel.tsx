'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { TokenInput } from './TokenInput';
import { toast } from 'react-hot-toast';

export function LiquidityPanel() {
  const { isConnected } = useAccount();
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(true);
  const [token0Amount, setToken0Amount] = useState('');
  const [token1Amount, setToken1Amount] = useState('');
  const [token0, setToken0] = useState('ETH');
  const [token1, setToken1] = useState('USDC');
  const [isLoading, setIsLoading] = useState(false);

  const handleLiquidityAction = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!token0Amount || !token1Amount) {
      toast.error('Please enter amounts for both tokens');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual liquidity logic with smart contracts
      if (isAddingLiquidity) {
        toast.success('Add liquidity functionality will be implemented');
      } else {
        toast.success('Remove liquidity functionality will be implemented');
      }

      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(isAddingLiquidity ? 'Adding' : 'Removing', 'liquidity:', token0Amount, token0, token1Amount, token1);
    } catch (error) {
      console.error('Liquidity action error:', error);
      toast.error('Transaction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToken0Change = (value: string) => {
    setToken0Amount(value);
    // TODO: Calculate token1 amount based on pool ratio
    if (value && parseFloat(value) > 0) {
      const estimatedToken1 = parseFloat(value) * 1800; // Mock calculation
      setToken1Amount(estimatedToken1.toFixed(2));
    } else {
      setToken1Amount('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setIsAddingLiquidity(true)}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            isAddingLiquidity 
              ? 'bg-miniswap-accent text-white' 
              : 'bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setIsAddingLiquidity(false)}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            !isAddingLiquidity 
              ? 'bg-miniswap-accent text-white' 
              : 'bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          Remove Liquidity
        </button>
      </div>

      <TokenInput
        label="Token 1"
        token={token0}
        amount={token0Amount}
        onChange={handleToken0Change}
        onTokenSelect={setToken0}
        balance="0.00"
      />

      <div className="flex justify-center">
        <div className="text-2xl text-white/40">+</div>
      </div>

      <TokenInput
        label="Token 2"
        token={token1}
        amount={token1Amount}
        onChange={setToken1Amount}
        onTokenSelect={setToken1}
        balance="0.00"
      />

      <div className="bg-white/5 rounded-lg p-3 space-y-2 text-sm">
        <div className="flex justify-between text-white/70">
          <span>Pool Share</span>
          <span>0.00%</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>{token0} Deposited</span>
          <span>{token0Amount || '0'}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>{token1} Deposited</span>
          <span>{token1Amount || '0'}</span>
        </div>
        {isAddingLiquidity && (
          <div className="flex justify-between text-white/70">
            <span>LP Tokens Received</span>
            <span>0.00</span>
          </div>
        )}
      </div>

      <button
        onClick={handleLiquidityAction}
        disabled={!isConnected || isLoading || !token0Amount || !token1Amount}
        className={`w-full btn-secondary ${
          (!isConnected || isLoading || !token0Amount || !token1Amount) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : !isConnected ? 'Connect Wallet' : isAddingLiquidity ? 'Add Liquidity' : 'Remove Liquidity'}
      </button>
    </div>
  );
}