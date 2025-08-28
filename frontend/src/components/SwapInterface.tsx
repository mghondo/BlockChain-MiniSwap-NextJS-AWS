'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { TokenInput } from './TokenInput';
import { toast } from 'react-hot-toast';

export function SwapInterface() {
  const { address, isConnected } = useAccount();
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [inputToken, setInputToken] = useState('ETH');
  const [outputToken, setOutputToken] = useState('USDC');
  const [isLoading, setIsLoading] = useState(false);

  const handleSwap = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: Implement actual swap logic with smart contracts
      toast.success('Swap functionality will be implemented');
      
      // Simulate swap
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Swapping', inputAmount, inputToken, 'for', outputAmount, outputToken);
    } catch (error) {
      console.error('Swap error:', error);
      toast.error('Swap failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInputAmount(value);
    // TODO: Calculate output amount based on AMM formula
    if (value && parseFloat(value) > 0) {
      const estimatedOutput = parseFloat(value) * 1800; // Mock calculation
      setOutputAmount(estimatedOutput.toFixed(2));
    } else {
      setOutputAmount('');
    }
  };

  const switchTokens = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  };

  return (
    <div className="space-y-4">
      <TokenInput
        label="From"
        token={inputToken}
        amount={inputAmount}
        onChange={handleInputChange}
        onTokenSelect={setInputToken}
        balance="0.00"
      />

      <div className="flex justify-center">
        <button
          onClick={switchTokens}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      <TokenInput
        label="To"
        token={outputToken}
        amount={outputAmount}
        onChange={setOutputAmount}
        onTokenSelect={setOutputToken}
        balance="0.00"
        readOnly
      />

      <div className="bg-white/5 rounded-lg p-3 space-y-2 text-sm">
        <div className="flex justify-between text-white/70">
          <span>Exchange Rate</span>
          <span>1 {inputToken} = 1800 {outputToken}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Price Impact</span>
          <span className="text-green-400">{'<'}0.01%</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Minimum Received</span>
          <span>{outputAmount ? (parseFloat(outputAmount) * 0.995).toFixed(2) : '0'} {outputToken}</span>
        </div>
      </div>

      <button
        onClick={handleSwap}
        disabled={!isConnected || isLoading || !inputAmount}
        className={`w-full btn-primary ${
          (!isConnected || isLoading || !inputAmount) ? 'opacity-50 cursor-not-allowed' : ''
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
        ) : !isConnected ? 'Connect Wallet' : 'Swap'}
      </button>
    </div>
  );
}