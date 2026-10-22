import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { X, CreditCard, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export function CreditModal() {
  const { user, isCreditModalOpen, setIsCreditModalOpen, refreshUser } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number>(20);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isCreditModalOpen) return null;

  const presets = [5, 10, 20, 50];

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed) && parsed >= 5) {
      setSelectedAmount(parsed);
    }
  };

  const amountToCharge = customAmount && parseFloat(customAmount) >= 5 ? parseFloat(customAmount) : selectedAmount;

  const handleTopup = async () => {
    if (amountToCharge < 5) {
      setErrorMsg('Minimum top-up is $5.00');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.topupCredits(amountToCharge);
      setSuccessMsg(`Successfully credited $${amountToCharge.toFixed(2)} to your balance! (Tx: ${res.transaction_id.slice(0, 8)})`);
      await refreshUser();
      setTimeout(() => {
        setIsCreditModalOpen(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-6 bg-white border border-[#E8E8E6] rounded-xl shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={() => setIsCreditModalOpen(false)}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#F8F8F7] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFF4EB] border border-[#F97316]/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-[#F97316]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#171717]">Top Up Credits</h3>
            <p className="text-xs text-[#737373]">1 Credit = $1.00 USD • Instantly unlocked for MCP execution</p>
          </div>
        </div>

        {/* Current Balance Display */}
        <div className="p-4 rounded-lg bg-[#F8F8F7] border border-[#E8E8E6] flex items-center justify-between">
          <span className="text-xs font-medium text-[#737373]">Current Available Balance</span>
          <span className="text-base font-bold text-[#171717] font-mono">
            ${user?.credit_balance.toFixed(2) || '0.00'}
          </span>
        </div>

        {/* Admin Unlimited Badge */}
        {user?.is_unlimited_credit_user === 1 && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-[#15803D]" />
            <span>Admin Mode Active: Unlimited test acquisition enabled without credit debit.</span>
          </div>
        )}

        {/* Preset Amount Chips */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#171717]">Select Preset Amount</label>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handlePresetClick(amt)}
                className={`py-2 text-xs font-mono font-medium rounded-lg border transition-all ${
                  selectedAmount === amt && !customAmount
                    ? 'bg-[#171717] text-white border-[#171717]'
                    : 'bg-white border-[#E8E8E6] text-[#171717] hover:bg-[#F8F8F7]'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#171717]">Or Enter Custom Amount ($)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#737373]">$</span>
            <input
              type="number"
              min="5"
              step="1"
              placeholder="e.g. 75"
              value={customAmount}
              onChange={handleCustomChange}
              className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717] transition-colors font-mono"
            />
          </div>
        </div>

        {/* Notifications / Errors */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleTopup}
          disabled={loading}
          className="w-full h-10 bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-sm rounded-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Processing Payment...</span>
          ) : (
            <span>Add ${amountToCharge.toFixed(2)} Credits</span>
          )}
        </button>

        <p className="text-[11px] text-center text-[#A3A3A3]">
          Mocked test payment gateway via Stripe sandbox • 100% testnet secure
        </p>
      </div>
    </div>
  );
}
