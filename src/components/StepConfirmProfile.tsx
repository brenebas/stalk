import React, { useState } from 'react';
import { InstagramProfile } from '../types';
import { AvatarIllustration } from './AvatarIllustration';
import { Check, ArrowLeft, Bell, MoreHorizontal, Link2, Lock, ShieldCheck, X, Loader2 } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface StepConfirmProfileProps {
  profile: InstagramProfile;
  onConfirm: () => void;
  onBack: () => void;
}

// Scalloped official Instagram blue verified badge
export const InstagramVerifiedBadge: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 40 40" className={`${className} shrink-0`} fill="none" aria-label="Verificado">
    <path
      d="M19.998 3.333c1.378 0 2.68.563 3.633 1.554l1.493 1.554 2.146-.234c1.365-.148 2.685.452 3.535 1.606.85 1.154 1.037 2.628.5 3.948l-.844 2.074 1.348 1.681c.86 1.073 1.107 2.518.662 3.871-.446 1.353-1.517 2.37-2.871 2.723l-2.122.553.234 2.146c.148 1.365-.452 2.685-1.606 3.535-1.154.85-2.628 1.037-3.948.5l-2.074-.844-1.681 1.348c-1.073.86-2.518 1.107-3.871.662-1.353-.446-2.37-1.517-2.723-2.871l-.553-2.122-2.146.234c-1.365.148-2.685-.452-3.535-1.606-.85-1.154-1.037-2.628-.5-3.948l.844-2.074-1.348-1.681c-.86-1.073-1.107-2.518-.662-3.871.446-1.353 1.517-2.37 2.871-2.723l2.122-.553-.234-2.146c-.148-1.365.452-2.685 1.606-3.535 1.154-.85 2.628-1.037 3.948-.5l2.074.844 1.681-1.348c.953-.991 2.255-1.554 3.633-1.554z"
      fill="#0095f6"
    />
    <path
      d="M17.414 24.586l-4.586-4.586 1.414-1.414 3.172 3.172 8.172-8.172 1.414 1.414-9.586 9.586z"
      fill="#ffffff"
    />
  </svg>
);

export const StepConfirmProfile: React.FC<StepConfirmProfileProps> = ({
  profile,
  onConfirm,
  onBack,
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStep, setConnectStep] = useState(0);

  const handleStartConnect = () => {
    setIsConnecting(true);
    setConnectStep(0);
    soundFX.playTick();

    // Etapa 1: Estabelecendo handshake (1.1s)
    setTimeout(() => {
      setConnectStep(1);
      soundFX.playTick();
    }, 1100);

    // Etapa 2: Validando túnel criptografado (2.2s)
    setTimeout(() => {
      setConnectStep(2);
      soundFX.playTick();
    }, 2200);

    // Etapa 3: Concluído e início da varredura (3.3s)
    setTimeout(() => {
      setConnectStep(3);
      soundFX.playComplete();
      setTimeout(() => {
        setShowAuthModal(false);
        setIsConnecting(false);
        onConfirm();
      }, 650);
    }, 3300);
  };
  // Format numbers in Portuguese matching Instagram standards (e.g. 79, 10,3 mi, 910)
  const formatInstagramCount = (num: number) => {
    if (num >= 1000000) {
      const val = (num / 1000000).toFixed(1).replace('.', ',');
      return `${val.endsWith(',0') ? val.slice(0, -2) : val} mi`;
    }
    if (num >= 10000) {
      const val = (num / 1000).toFixed(1).replace('.', ',');
      return `${val.endsWith(',0') ? val.slice(0, -2) : val} mil`;
    }
    return num.toLocaleString('pt-BR');
  };

  const safeProfile = profile || {
    handle: 'usuario',
    name: 'Usuário',
    bio: '',
    avatarUrl: '',
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    isVerified: false,
    isPrivate: false,
    category: 'Conta Privada',
    isRealData: false,
  };

  const categoryName = safeProfile.category || (safeProfile.isPrivate ? 'Conta Privada' : 'Figura pública');

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Top Header Confirmation Prompt */}
      <div className="text-center px-2">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Essa conta é sua?
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Confirme os dados da sua conta para iniciar a varredura dos últimos 7 dias.
        </p>
      </div>

      {/* Official Instagram Profile Mockup Card (Pristine White) */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl shadow-xl shadow-neutral-200/40 overflow-hidden font-sans text-neutral-900 select-none">
        {/* Instagram Header Bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-1 -ml-1 text-neutral-900 hover:text-neutral-600 transition-colors cursor-pointer"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-900" />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              {safeProfile.isPrivate && (
                <Lock className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              )}
              <span className="font-bold text-base sm:text-lg text-neutral-900 truncate tracking-tight">
                {safeProfile.handle}
              </span>
              {safeProfile.isVerified && (
                <InstagramVerifiedBadge className="w-4 h-4 ml-0.5" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-neutral-900 shrink-0">
            <Bell className="w-5 h-5 hover:text-neutral-600 cursor-pointer transition-colors" />
            <MoreHorizontal className="w-5 h-5 hover:text-neutral-600 cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Avatar + Stats Row (Directly matching Instagram layout) */}
          <div className="flex items-center justify-between gap-4 sm:gap-6">
            {/* Story ring Avatar */}
            <div className="shrink-0">
              <AvatarIllustration
                seed={safeProfile.handle}
                name={safeProfile.name}
                avatarUrl={safeProfile.avatarUrl}
                gender={safeProfile.handle.includes('a') || safeProfile.name.toLowerCase().endsWith('a') ? 'female' : 'male'}
                size="lg"
                hasStoryRing={true}
              />
            </div>

            {/* 3 Stats Columns */}
            <div className="flex-1 flex items-center justify-around text-center">
              <div>
                <span className="block font-bold text-base sm:text-lg text-neutral-900 tabular-nums leading-tight">
                  {formatInstagramCount(safeProfile.postsCount)}
                </span>
                <span className="text-xs text-neutral-600 font-normal">posts</span>
              </div>
              <div>
                <span className="block font-bold text-base sm:text-lg text-neutral-900 tabular-nums leading-tight">
                  {formatInstagramCount(safeProfile.followersCount)}
                </span>
                <span className="text-xs text-neutral-600 font-normal">seguidores</span>
              </div>
              <div>
                <span className="block font-bold text-base sm:text-lg text-neutral-900 tabular-nums leading-tight">
                  {formatInstagramCount(safeProfile.followingCount)}
                </span>
                <span className="text-xs text-neutral-600 font-normal">seguindo</span>
              </div>
            </div>
          </div>

          {/* Name, Category, Biography & Link */}
          <div className="space-y-1 pt-1 text-left">
            <p className="font-bold text-sm text-neutral-900 leading-tight">
              {safeProfile.name}
            </p>

            {categoryName && (
              <p className="text-xs text-neutral-500 font-normal">
                {categoryName}
              </p>
            )}

            {safeProfile.bio && (
              <p className="text-xs sm:text-sm text-neutral-800 whitespace-pre-line leading-snug pt-0.5">
                {safeProfile.bio}
              </p>
            )}

            {safeProfile.externalUrl && (
              <div className="pt-1 flex items-center gap-1.5 text-xs text-[#00376b] font-medium hover:underline cursor-pointer truncate">
                <Link2 className="w-3.5 h-3.5 shrink-0 text-[#00376b]" />
                <span className="truncate">{safeProfile.externalUrl.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={() => setShowAuthModal(true)}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 shadow-md shadow-rose-500/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Sim, Continuar</span>
        </button>

        <button
          onClick={onBack}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Não é meu perfil, quero alterar o @</span>
        </button>
      </div>

      {/* Authorization Pop-up Modal (Compact & Summarized) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white text-neutral-900 w-full max-w-xs sm:max-w-sm rounded-2xl p-4 sm:p-5 shadow-2xl border border-neutral-100 relative animate-in zoom-in-95 duration-150">
            {/* Close button (only when not connecting) */}
            {!isConnecting && (
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-3 right-3 p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {isConnecting ? (
              /* Connecting Transition View */
              <div className="py-3 px-1 text-center space-y-3.5 animate-in fade-in duration-200">
                <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[3px] border-neutral-200 border-t-rose-500 animate-spin" />
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                    Conectando com @{profile.handle}...
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Estabelecendo túnel de varredura seguro
                  </p>
                </div>

                {/* Connecting steps progress */}
                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/80 text-left space-y-2 text-xs">
                  <div className={`flex items-center gap-2 transition-all ${connectStep >= 0 ? 'text-neutral-800' : 'text-neutral-400'}`}>
                    {connectStep > 0 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin shrink-0" />
                    )}
                    <span className={connectStep === 0 ? 'font-semibold text-rose-600' : ''}>
                      Conectando aos servidores de CDN...
                    </span>
                  </div>

                  <div className={`flex items-center gap-2 transition-all ${connectStep >= 1 ? 'text-neutral-800' : 'text-neutral-400 opacity-50'}`}>
                    {connectStep > 1 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    ) : connectStep === 1 ? (
                      <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0" />
                    )}
                    <span className={connectStep === 1 ? 'font-semibold text-rose-600' : ''}>
                      Autenticando sessão criptografada...
                    </span>
                  </div>

                  <div className={`flex items-center gap-2 transition-all ${connectStep >= 2 ? 'text-neutral-800' : 'text-neutral-400 opacity-50'}`}>
                    {connectStep >= 3 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    ) : connectStep === 2 ? (
                      <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0" />
                    )}
                    <span className={connectStep >= 2 ? 'font-semibold text-emerald-600' : ''}>
                      {connectStep >= 3 ? 'Conexão autorizada com sucesso!' : 'Liberando canais de telemetria...'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Authorization Content */
              <>
                {/* Header */}
                <div className="text-center pt-1 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-md shadow-pink-500/20 mx-auto mb-2.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                    Autorizar Conexão
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-snug">
                    Conectar com <span className="font-bold text-neutral-800">@{profile.handle}</span> para liberar o relatório de atividades.
                  </p>
                </div>

                {/* Concise Summary */}
                <div className="bg-neutral-50 rounded-xl p-3 space-y-1.5 border border-neutral-200/70 mb-3 text-left">
                  <div className="flex items-center gap-2 text-xs text-neutral-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    <span>Rastrear visitantes dos últimos 7 dias</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    <span>Identificar posts salvos e encaminhamentos</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    <span>Localizar stalkers noturnos e ex-seguidores</span>
                  </div>
                </div>

                {/* Short Security Tag */}
                <p className="text-[11px] text-neutral-500 text-center mb-3.5 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>100% anônimo • Sem senha • Sem notificações</span>
                </p>

                {/* Action Buttons */}
                <div className="space-y-1.5">
                  <button
                    onClick={handleStartConnect}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-white text-xs sm:text-sm bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Autorizar e Continuar</span>
                  </button>

                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="w-full py-1.5 px-4 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
