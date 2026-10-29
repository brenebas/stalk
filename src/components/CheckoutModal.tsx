import React, { useState } from 'react';
import { X, Check, QrCode, CreditCard, Sparkles, Copy, ArrowRight, Shield } from 'lucide-react';
import { InstagramProfile } from '../types';
import { soundFX } from '../utils/audio';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: InstagramProfile;
  onSuccessUnlock: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSuccessUnlock,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const mockPixCode = '00020126580014br.gov.bcb.pix0136stalkradar-vip-instant-2026520400005303986540519.905802BR5916STALKRADAR APP6009SAO PAULO62070503***6304D1B9';

  const handleCopyPix = () => {
    soundFX.playTick();
    navigator.clipboard?.writeText(mockPixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleConfirmPayment = () => {
    soundFX.playTick();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      soundFX.playComplete();
      onSuccessUnlock();
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-neutral-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Close Button */}
        <button
          onClick={() => {
            soundFX.playTick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="text-center pt-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center mx-auto text-white shadow-lg shadow-pink-500/25 mb-3">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900">
              Desbloquear StalkRadar VIP
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Acesso total ao dossiê de @{profile.handle}
            </p>
          </div>

          {/* Plan Summary Box */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-200">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">Licença VIP Vitalícia</span>
                <span className="text-[11px] text-neutral-500">Acesso ilimitado ao app</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-neutral-900 font-mono">R$ 19,90</span>
                <span className="text-[10px] text-emerald-600 block font-medium">taxa única</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-neutral-700">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Desbloqueia os 16 perfis ocultos com fotos e @s</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Horários exatos de visualização e stalkers de madrugada</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Libera módulos: Quem deu unfollow e Salvamentos</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.playTick();
                  setPaymentMethod('pix');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'pix'
                    ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-xs'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>PIX</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.playTick();
                  setPaymentMethod('card');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-xs'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cartão</span>
              </button>
            </div>
          </div>

          {/* Payment Details Container */}
          {paymentMethod === 'pix' ? (
            <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 space-y-2.5">
              <div className="flex items-center justify-center py-1">
                <div className="p-2.5 bg-white rounded-xl shadow-xs border border-neutral-200">
                  <svg viewBox="0 0 100 100" className="w-24 h-24" fill="#000000">
                    <rect x="0" y="0" width="30" height="30" />
                    <rect x="5" y="5" width="20" height="20" fill="#ffffff" />
                    <rect x="10" y="10" width="10" height="10" />
                    <rect x="70" y="0" width="30" height="30" />
                    <rect x="75" y="5" width="20" height="20" fill="#ffffff" />
                    <rect x="80" y="10" width="10" height="10" />
                    <rect x="0" y="70" width="30" height="30" />
                    <rect x="5" y="75" width="20" height="20" fill="#ffffff" />
                    <rect x="10" y="80" width="10" height="10" />
                    <rect x="40" y="15" width="8" height="8" />
                    <rect x="50" y="25" width="12" height="6" />
                    <rect x="35" y="45" width="25" height="10" />
                    <rect x="45" y="70" width="15" height="15" />
                    <rect x="75" y="50" width="18" height="8" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={mockPixCode}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-neutral-600 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">Número do Cartão</label>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  defaultValue="4532 8910 2341 9901"
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">Validade</label>
                  <input
                    type="text"
                    defaultValue="10/29"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">CVV</label>
                  <input
                    type="text"
                    defaultValue="894"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleConfirmPayment}
            disabled={isProcessing}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Liberando Acesso VIP...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>Confirmar & Desbloquear Imediatamente</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>

          <div className="text-center pt-1">
            <span className="text-[11px] text-neutral-500 flex items-center justify-center gap-1">
              <Shield className="w-3.5 h-3.5 text-neutral-400" />
              <span>Transação criptografada de ponta a ponta</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
