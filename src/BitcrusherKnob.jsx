import { useEffect, useState } from 'react';

export default function BitcrusherKnob() {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    window.__DR202_BITCRUSHER__?.setAmount(amount);
  }, [amount]);

  const handleChange = (event) => {
    const nextAmount = Number(event.target.value);
    setAmount(nextAmount);
    window.__DR202_BITCRUSHER__?.setAmount(nextAmount);
  };

  const rotation = -135 + (amount / 100) * 270;

  return (
    <div className="fixed z-[9999] bottom-4 left-4 flex flex-col items-center select-none rounded-2xl border-2 border-zinc-700 bg-zinc-900/95 p-2.5 shadow-2xl backdrop-blur">
      <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
        Bitcrush
      </span>
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 shadow-[inset_0_2px_4px_rgba(255,255,255,0.12),0_5px_10px_rgba(0,0,0,0.6)]"
        title="0% bypass · 100% fully wet"
      >
        <input
          aria-label="Bitcrusher wet effect amount"
          className="absolute inset-0 cursor-ns-resize opacity-0"
          max="100"
          min="0"
          onChange={handleChange}
          type="range"
          value={amount}
        />
        <div
          className="flex h-11 w-11 items-start justify-center rounded-full border border-zinc-950 bg-zinc-700 pt-1 shadow-[0_3px_7px_rgba(0,0,0,0.7)]"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <span className="h-3 w-1 rounded-full bg-fuchsia-400 shadow-[0_0_6px_#e879f9]" />
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1 font-mono">
        <span className="text-[9px] font-bold text-zinc-500">WET</span>
        <span className="rounded bg-zinc-300 px-1 text-[9px] font-black text-zinc-900">
          {amount}%
        </span>
      </div>
    </div>
  );
}
