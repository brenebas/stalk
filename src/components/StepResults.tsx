import React, { useState } from 'react';
import { StalkerVisitor, InstagramProfile, ScanMetrics } from '../types';
import { AvatarIllustration } from './AvatarIllustration';
import { InstagramVerifiedBadge } from './StepConfirmProfile';
import { 
  Lock, 
  Unlock, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Share2, 
  AlertCircle, 
  ShieldCheck, 
  RefreshCw, 
  Layers 
} from 'lucide-react';
import { soundFX } from '../utils/audio';

interface StepResultsProps {
  profile: InstagramProfile;
  metrics: ScanMetrics;
  stalkers: StalkerVisitor[];
  isUnlocked: boolean;
  onOpenCheckout: () => void;
  onToggleSimulateUnlock: () => void;
  onReset: () => void;
}

export const StepResults: React.FC<StepResultsProps> = ({
  profile,
  stalkers,
  isUnlocked,
  onOpenCheckout,
  onToggleSimulateUnlock,
  onReset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  const categories = [
    { id: 'all', label: `Todos (${stalkers.length})` },
    { id: 'Muito Alta', label: 'Mais Frequentes' },
    { id: 'Stalker Noturno', label: 'Madrugada' },
    { id: 'Ex-Seguidor', label: 'Ex-Seguidores' },
    { id: 'Crush Secreto', label: 'Crushes' },
  ];

  const filteredStalkers = stalkers.filter((s) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'Muito Alta') return s.frequency === 'Muito Alta';
    return s.relationshipCategory === selectedCategory;
  });

  const handleShare = () => {
    soundFX.playTick();
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* App Dossier Card (White Theme) */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl p-5 sm:p-7 shadow-xl shadow-neutral-200/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <AvatarIllustration
              seed={profile.handle}
              name={profile.name}
              avatarUrl={profile.avatarUrl}
              size="md"
              hasStoryRing={true}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                  @{profile.handle}
                </h1>
                {profile.isVerified && (
                  <InstagramVerifiedBadge className="w-4 h-4" />
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Dossiê compilado · <span className="text-emerald-600 font-semibold">{stalkers.length} perfis detectados</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-200"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <button
              onClick={() => {
                soundFX.playTick();
                onReset();
              }}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Nova Varredura</span>
            </button>
          </div>
        </div>

        {/* Dashboard Status Strips */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 text-center">
            <span className="text-[11px] text-neutral-500 block font-medium">Detectados</span>
            <span className="text-xl sm:text-2xl font-black text-neutral-900 font-mono mt-0.5 block tabular-nums">
              {stalkers.length}
            </span>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 text-center">
            <span className="text-[11px] text-emerald-600 block font-medium">Amostra Grátis</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-0.5 block tabular-nums">
              2 Perfis
            </span>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 text-center">
            <span className="text-[11px] text-amber-600 block font-medium">Bloqueados VIP</span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono mt-0.5 block tabular-nums">
              {isUnlocked ? '0' : Math.max(0, stalkers.length - 2)}
            </span>
          </div>
        </div>
      </div>

      {/* App Upgrade / Simulation Bar */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isUnlocked ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              {isUnlocked ? `Modo VIP Ativo: Todos os ${stalkers.length} perfis desbloqueados` : `${Math.max(0, stalkers.length - 2)} perfis ocultos com filtro de desfoque ativo`}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isUnlocked 
                ? 'Visualização irrestrita de nomes, horários e interações secretas'
                : 'Os 2 primeiros perfis estão liberados como prévia funcional'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            onClick={() => {
              soundFX.playTick();
              onToggleSimulateUnlock();
            }}
            className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl text-xs font-bold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
            title="Alternar entre visualização de demonstração e bloqueio"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{isUnlocked ? 'Voltar ao Modo Grátis' : 'Simular Desbloqueio'}</span>
          </button>

          {!isUnlocked && (
            <button
              onClick={() => {
                soundFX.playTick();
                onOpenCheckout();
              }}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 shadow-md shadow-rose-500/20 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Desbloquear VIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex items-center gap-1 p-1 bg-neutral-100 border border-neutral-200 rounded-xl overflow-x-auto max-w-full">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundFX.playTick();
                setSelectedCategory(cat.id);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isUnlocked && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Relatório Completo Desbloqueado
          </span>
        )}
      </div>

      {/* Stalker Cards List (Clean, Interactive & Modern) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredStalkers.map((stalker) => {
          const isRevealed = stalker.isRevealed || isUnlocked;

          return (
            <div
              key={stalker.id}
              onClick={() => {
                if (!isRevealed) {
                  soundFX.playTick();
                  onOpenCheckout();
                }
              }}
              className={`group relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 ${
                isRevealed
                  ? 'bg-white border-neutral-200 shadow-xs hover:shadow-md hover:border-neutral-300'
                  : 'bg-white border-neutral-200/90 shadow-xs hover:shadow-md hover:border-rose-300 hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]'
              }`}
            >
              {/* Header row with tags & time */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200/60">
                    {stalker.relationshipCategory}
                  </span>

                  {isRevealed ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                      Amostra Grátis
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-neutral-400" /> Bloqueado VIP
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-neutral-800 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200/70 tabular-nums" title="Índice de certeza e precisão da telemetria">
                    {stalker.suspicionScore}% precisão
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-neutral-400 font-mono">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>{stalker.lastVisitAgo}</span>
                  </span>
                </div>
              </div>

              {/* Profile Item Row */}
              <div className="flex items-start gap-3.5">
                <div className="relative shrink-0">
                  <AvatarIllustration
                    seed={stalker.avatarSeed}
                    name={stalker.name}
                    gender={stalker.gender}
                    gradientClass={stalker.avatarColor}
                    size="md"
                    isBlurred={!isRevealed}
                    hasStoryRing={isRevealed}
                  />
                  {!isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/15 rounded-full backdrop-blur-[1px]">
                      <div className="w-6 h-6 rounded-full bg-white/95 shadow-xs flex items-center justify-center">
                        <Lock className="w-3 h-3 text-neutral-700" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className={`text-sm sm:text-base font-bold truncate leading-snug ${
                      isRevealed ? 'text-neutral-900' : 'text-neutral-800 filter blur-[4px] select-none group-hover:blur-[2px] transition-all'
                    }`}>
                      {stalker.name}
                    </h3>
                  </div>

                  <p className={`text-xs font-mono mt-0.5 ${
                    isRevealed ? 'text-neutral-500' : 'text-neutral-400 filter blur-[4px] select-none group-hover:blur-[2px] transition-all'
                  }`}>
                    @{isRevealed ? stalker.handle : stalker.maskedHandle}
                  </p>

                  <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-500 flex-wrap">
                    <span>
                      Visitas (7 dias): <strong className="text-neutral-900 font-semibold">{stalker.visitsToday}x</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Frequência: <strong className="text-neutral-900 font-semibold">{stalker.frequency}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Curiosity Hint Box - Clean editorial accent */}
              <div className="mt-3.5 p-3 rounded-xl bg-neutral-50/90 border-l-2 border-l-rose-500 border border-neutral-200/60 text-xs leading-relaxed text-neutral-700">
                <span className="font-bold text-neutral-900">Comportamento detectado: </span>
                <span>{stalker.curiosityHint}</span>
              </div>

              {/* Blurred click teaser action overlay */}
              {!isRevealed ? (
                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 text-[11px]">
                    {stalker.commonFriendsCount} amigos em comum
                  </span>
                  <span className="text-xs font-bold text-rose-600 group-hover:text-rose-700 flex items-center gap-1 transition-colors">
                    <span>Toque para desbloquear</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                  <span className="text-[11px]">{stalker.commonFriendsCount} amigos em comum</span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    ✓ Perfil Liberado
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
