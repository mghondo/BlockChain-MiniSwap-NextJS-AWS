'use client';

interface TokenInputProps {
  label: string;
  token: string;
  amount: string;
  onChange: (value: string) => void;
  onTokenSelect: (token: string) => void;
  balance?: string;
  readOnly?: boolean;
}

export function TokenInput({
  label,
  token,
  amount,
  onChange,
  onTokenSelect,
  balance = '0.00',
  readOnly = false
}: TokenInputProps) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-white/60">{label}</span>
        <span className="text-sm text-white/60">Balance: {balance}</span>
      </div>
      
      <div className="flex space-x-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.0"
          readOnly={readOnly}
          className="flex-1 bg-transparent text-2xl text-white outline-none placeholder-white/30"
        />
        
        <button
          onClick={() => {
            // TODO: Implement token selector modal
            console.log('Open token selector');
          }}
          className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full" />
          <span className="text-white font-medium">{token}</span>
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}