import React, { useState } from 'react';
import { CheckCircle2, Shield, CreditCard, Smartphone, X, ArrowRight, Loader2, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../i18n/LanguageContext';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickupCode: string;
  amount: number;
  isPayout: boolean;
  residentName: string;
  residentUpi: string;
  onSuccess: (paymentDetails: { txnId: string; method: string }) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  pickupCode,
  amount,
  isPayout,
  residentName,
  residentUpi,
  onSuccess
}) => {
  const { t } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [txnId, setTxnId] = useState('');

  if (!isOpen) return null;

  const handlePayOrDisburse = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const generatedTxn = isPayout 
        ? `UPI-${Math.floor(100000000000 + Math.random() * 900000000000)}`
        : `pay_sandbox_${Math.random().toString(36).substring(2, 11)}`;
      
      setTxnId(generatedTxn);
      setIsProcessing(false);
      setIsCompleted(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        onSuccess({ txnId: generatedTxn, method: selectedMethod });
      }, 1800);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-white animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs">
              RZP
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300">
                {isPayout ? t('razorpayModal.buybackSettlement', 'EcoCollect Buyback Instant Settlement') : t('razorpayModal.sandboxCheckout', 'Razorpay Sandbox Checkout')}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">{t('razorpayModal.reference', 'Reference:')} {pickupCode}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!isCompleted ? (
            <>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-400 font-medium">
                    {isPayout ? t('razorpayModal.buybackCashback', 'Buyback Cashback (Disbursement to Resident)') : t('razorpayModal.processingChargeDue', 'Municipal Processing Charge Due')}
                  </span>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">
                    ₹{amount.toFixed(2)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-400 block">{t('razorpayModal.beneficiaryPayer', 'Beneficiary / Payer')}</span>
                  <span className="text-xs font-bold text-slate-200">{residentName}</span>
                </div>
              </div>

              {isPayout ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Smartphone className="w-4 h-4" />
                    <span>{t('razorpayModal.directNpci', 'Direct NPCI / UPI Auto-Credit')}</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {t('razorpayModal.targetVpa', 'Target VPA:')} <span className="font-mono text-emerald-300 font-bold">{residentUpi}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t('razorpayModal.immediateSettlement', 'Immediate fund settlement with zero gateway deductions for segregated recyclables.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400">{t('razorpayModal.choosePaymentMethod', 'Choose Payment Method')}</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedMethod('upi')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                        selectedMethod === 'upi'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>{t('razorpayModal.upiQr', 'UPI / QR')}</span>
                    </button>
                    <button
                      onClick={() => setSelectedMethod('card')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                        selectedMethod === 'card'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{t('razorpayModal.card', 'Card')}</span>
                    </button>
                    <button
                      onClick={() => setSelectedMethod('netbanking')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                        selectedMethod === 'netbanking'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>{t('razorpayModal.netbanking', 'NetBanking')}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('razorpayModal.encryptedSecurity', '256-bit Encrypted • Sandbox Gateway • Instant Webhook Verification')}</span>
              </div>

              <button
                id="btn-confirm-sandbox-payment"
                onClick={handlePayOrDisburse}
                disabled={isProcessing}
                className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  isPayout
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('razorpayModal.processingSandbox', 'Processing Sandbox Transaction...')}</span>
                  </>
                ) : (
                  <>
                    <span>{isPayout ? `${t('razorpayModal.disburseToUpi', 'Disburse')} ₹${amount.toFixed(2)} ${t('razorpayModal.toUpiVpa', 'to UPI VPA')}` : `${t('razorpayModal.authorizePaymentOf', 'Authorize Payment of')} ₹${amount.toFixed(2)}`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">
                {isPayout ? t('razorpayModal.payoutSuccessful', 'UPI Payout Successful!') : t('razorpayModal.paymentCaptured', 'Payment Captured Successfully!')}
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                {t('razorpayModal.txnReference', 'Txn Reference:')} <span className="text-emerald-400 font-bold">{txnId}</span>
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {t('razorpayModal.receiptGenerated', 'Receipt generated and status synchronized with EcoCollect Cloud Backend.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
