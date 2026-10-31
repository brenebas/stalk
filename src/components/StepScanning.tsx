import React, { useState, useEffect, useRef } from 'react';
import { ScanMetrics, InstagramProfile } from '../types';
import { AvatarIllustration } from './AvatarIllustration';
import { 
  ArrowRight, 
  Eye, 
  Bookmark, 
  Share2, 
  UserMinus, 
  Ghost, 
  CheckCircle2, 
  Radar, 
  Clock,
  Lock,
  Gem
} from 'lucide-react';
import { soundFX } from '../utils/audio';

interface StepScanningProps {
  profile: InstagramProfile;
  metrics: ScanMetrics;
  onFinishScan: () => void;
}

// Points around the radar: each moment ONE photo appears at a different position
const RADAR_TRACKER_POINTS = [
  { id: 'p1', name: 'Perfil 1', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80', top: '12%', left: '68%' },
  { id: 'p2', name: 'Perfil 2', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', top: '68%', left: '18%' },
  { id: 'p3', name: 'Perfil 3', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80', top: '16%', left: '16%' },
  { id: 'p4', name: 'Perfil 4', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80', top: '66%', left: '68%' },
  { id: 'p5', name: 'Perfil 5', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80', top: '10%', left: '42%' },
  { id: 'p6', name: 'Perfil 6', photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80', top: '72%', left: '44%' },
  { id: 'p7', name: 'Perfil 7', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80', top: '42%', left: '74%' },
  { id: 'p8', name: 'Perfil 8', photo: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=120&q=80', top: '42%', left: '12%' },
];

// Helper to calculate stepped numbers with pauses/delays between batch jumps (e.g. 1 -> 7 -> 12 -> 16 -> 20)
function getSteppedDisplayCount(progress: number, finalValue: number): number {
  if (progress >= 95) return finalValue;
  if (finalValue <= 2) return Math.min(1, finalValue);

  // Stepped batch jumps with realistic pauses in between
  if (progress < 15) {
    return Math.max(1, Math.min(2, Math.floor(finalValue * 0.05)));
  } else if (progress < 34) {
    return Math.max(2, Math.round(finalValue * 0.28));
  } else if (progress < 54) {
    return Math.max(3, Math.round(finalValue * 0.48));
  } else if (progress < 76) {
    return Math.max(4, Math.round(finalValue * 0.68));
  } else if (progress < 90) {
    return Math.max(5, Math.round(finalValue * 0.86));
  } else {
    return Math.max(finalValue - 1, Math.round(finalValue * 0.95));
  }
}

export const StepScanning: React.FC<StepScanningProps> = ({
  profile,
  metrics,
  onFinishScan,
}) => {
  // Index of the item currently being analyzed (0 to 4; 5 = all completed)
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  // Progress of the active item (0% to 100%)
  const [activeItemProgress, setActiveItemProgress] = useState(0);
  const playedCompleteSound = useRef(false);

  // Single active target detected on radar (one at a time in changing positions)
  const [activeTargetIndex, setActiveTargetIndex] = useState<number | null>(0);

  useEffect(() => {
    // Ao bater 100% de carregamento, todos os perfis somem imediatamente
    if (activeItemIndex >= 5) {
      setActiveTargetIndex(null);
      return;
    }

    const timer = setInterval(() => {
      setActiveTargetIndex((prev) => 
        prev === null ? 0 : (prev + 1) % RADAR_TRACKER_POINTS.length
      );
    }, 2400); // 2.4s por detecção (1 perfil por vez em posição alternada)

    return () => clearInterval(timer);
  }, [activeItemIndex]);

  // List of detection items analyzed strictly ONE BY ONE (5 items)
  const scanItems = [
    {
      id: 'visitors',
      label: 'Pessoas que visitaram seu perfil nos últimos 7 dias',
      sub: 'Veja quem anda te monitorando',
      phrase: 'Rastreando acessos · Veja quem anda te monitorando...',
      icon: Eye,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
      border: 'border-rose-200',
      finalValue: metrics.visitorsToday,
      format: (val: number) => `${val} visitas`,
    },
    {
      id: 'saved',
      label: 'Pessoas que salvaram seu post',
      sub: 'Armazenado em pastas secretas particulares',
      phrase: 'Cruzando registros de salvamentos em coleções privadas...',
      icon: Bookmark,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      border: 'border-amber-200',
      finalValue: metrics.savedPostsCount,
      format: (val: number) => `${val} salvamentos`,
    },
    {
      id: 'forwarded',
      label: 'Pessoas que encaminharam sua foto',
      sub: 'Compartilhamento em conversas no Direct',
      phrase: 'Mapeando encaminhamentos de fotos e publicações no Direct...',
      icon: Share2,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      border: 'border-blue-200',
      finalValue: metrics.forwardedDirectCount,
      format: (val: number) => `${val} envios`,
    },
    {
      id: 'unfollowed',
      label: 'Deixou de te seguir e frequenta seu perfil',
      sub: 'Ex-seguidores que continuam te monitorando',
      phrase: 'Identificando ex-seguidores que continuam abrindo seu perfil...',
      icon: UserMinus,
      color: 'text-red-600',
      bg: 'bg-red-100',
      border: 'border-red-200',
      finalValue: metrics.unfollowedVisitingCount,
      format: (val: number) => `${val} perfis`,
    },
    {
      id: 'ghost',
      label: 'Pessoas que não interagem com seu perfil',
      sub: 'Seguidores fantasmas que olham tudo sem engajar',
      phrase: 'Compilando lista final de contas fantasmas e espectadores ocultos...',
      icon: Ghost,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      border: 'border-purple-200',
      finalValue: metrics.ghostFollowersPercent,
      format: (val: number) => `${val}% da base`,
    },
  ];

  // Duração otimizada e dinâmica: 5s no 1º item + 2.5s nos 4 itens seguintes = 15s total (ritmo perfeito para engajamento)
  const currentItemDurationMs = activeItemIndex === 0 ? 5000 : 2500;
  const tickIntervalMs = 60;
  const progressStepPerTick = 100 / (currentItemDurationMs / tickIntervalMs);

  useEffect(() => {
    if (activeItemIndex >= scanItems.length) {
      if (!playedCompleteSound.current) {
        playedCompleteSound.current = true;
        soundFX.playComplete();
      }
      return;
    }

    const timer = setInterval(() => {
      setActiveItemProgress((prev) => {
        const next = prev + progressStepPerTick;
        
        // Random radar beep during scan
        if (Math.random() < 0.04) {
          soundFX.playRadarPing();
        }

        if (next >= 100) {
          // Current item completed! Play tick and advance strictly to next item
          soundFX.playTick();
          setActiveItemIndex((curr) => curr + 1);
          return 0; // Reset progress for the next item
        }

        return next;
      });
    }, tickIntervalMs);

    return () => clearInterval(timer);
  }, [activeItemIndex, scanItems.length, progressStepPerTick]);

  const isAllCompleted = activeItemIndex >= scanItems.length;

  // Auto-avanço de segurança: se o usuário não clicar em 3s após 100%, avança automaticamente
  useEffect(() => {
    if (isAllCompleted) {
      const autoTimer = setTimeout(() => {
        if (typeof onFinishScan === 'function') {
          onFinishScan();
        }
      }, 3000);
      return () => clearTimeout(autoTimer);
    }
  }, [isAllCompleted, onFinishScan]);

  // Global Progress Bar: proporcional ao tempo total (15s total)
  let elapsedSeconds = 0;
  if (isAllCompleted) {
    elapsedSeconds = 15;
  } else {
    const completedSeconds = activeItemIndex === 0 ? 0 : 5 + (activeItemIndex - 1) * 2.5;
    const currentItemSeconds = ((activeItemProgress / 100) * currentItemDurationMs) / 1000;
    elapsedSeconds = completedSeconds + currentItemSeconds;
  }

  const globalProgress = isAllCompleted
    ? 100
    : Math.min(99, Math.floor((elapsedSeconds / 15) * 100));

  const currentPhrase = isAllCompleted
    ? 'Varredura 100% concluída com sucesso!'
    : scanItems[activeItemIndex]?.phrase || 'Processando metadados CDN...';

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Unified Compact Card with Radar and Step-by-Step List (White Theme) */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-neutral-200/40 relative overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Compact Profile Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <AvatarIllustration
              seed={profile.handle}
              name={profile.name}
              avatarUrl={profile.avatarUrl}
              size="sm"
              hasStoryRing={true}
            />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                @{profile.handle}
              </p>
              <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Varredura profunda individual</span>
              </p>
            </div>
          </div>

          <div className="text-right flex items-center justify-end">
            <div className="p-2 rounded-xl bg-neutral-100/90 border border-neutral-200/90 text-neutral-700 flex items-center justify-center shadow-2xs" aria-label="Privado">
              <Lock className="w-4 h-4 text-neutral-700" />
            </div>
          </div>
        </div>

        {/* Compact Radar Section */}
        <div className="pt-4 pb-2 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full border border-rose-200 bg-neutral-50 flex items-center justify-center shadow-inner overflow-hidden">
            {/* Concentric rings */}
            <div className="absolute inset-2.5 rounded-full border border-rose-200" />
            <div className="absolute inset-7 rounded-full border border-rose-200" />
            <div className="absolute inset-12 rounded-full border border-rose-100" />

            {/* Crosshairs */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-rose-200/80" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-rose-200/80" />

            {/* Rotating radar sweep */}
            <div
              className="absolute inset-0 origin-center animate-[spin_2.5s_linear_infinite]"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(244, 63, 94, 0.35) 360deg)',
              }}
            />

            {/* Center Instagram target icon */}
            <div className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-md shadow-pink-500/25 border-2 border-white ring-2 ring-rose-400/40 flex items-center justify-center bg-white">
              <img
                src="/assets/aistudio/image_7c3a7ff0.png"
                alt="Instagram"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Exactly ONE profile photo detected at a time in a changing position (Disappears on 100%) */}
            {activeItemIndex < 5 && activeTargetIndex !== null && (() => {
              const target = RADAR_TRACKER_POINTS[activeTargetIndex];
              if (!target) return null;
              return (
                <div
                  key={`radar-point-${activeTargetIndex}`}
                  className="absolute z-20 pointer-events-none animate-in zoom-in-75 fade-in duration-300"
                  style={{
                    top: target.top,
                    left: target.left,
                  }}
                >
                  <div className="relative group">
                    {/* Radar ping ring wave on detection */}
                    <span className="absolute -inset-1.5 rounded-full bg-rose-500/50 animate-ping -z-10" />

                    {/* Small profile photo */}
                    <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full border-2 border-white shadow-lg shadow-rose-950/25 overflow-hidden ring-1 ring-rose-500 bg-neutral-200">
                      <img
                        src={target.photo}
                        alt={target.name}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>

                    {/* Green detection beacon dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white ring-1 ring-emerald-300" />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Current Dynamic Phase Header */}
          <div className="text-center mt-3 px-2 min-h-[32px] flex flex-col justify-center">
            <p className="text-xs sm:text-sm font-bold text-neutral-900 transition-all">
              {currentPhrase}
            </p>
          </div>
        </div>

        {/* Global Progress Bar (Metade do tamanho, verde com % caminhando junto e borda quadrada) */}
        <div className="w-1/2 min-w-[200px] max-w-xs mx-auto my-3">
          <div className="w-full h-5 sm:h-5.5 bg-neutral-200/80 rounded-none overflow-hidden p-0.5 shadow-inner relative border border-neutral-300">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 rounded-none transition-all duration-200 ease-out shadow-xs relative flex items-center justify-end pr-2 overflow-hidden"
              style={{ width: `${Math.max(16, globalProgress)}%` }}
            >
              <span className="font-mono text-[10px] sm:text-xs font-black text-white whitespace-nowrap drop-shadow-xs tabular-nums leading-none">
                {globalProgress}%
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Sequential List - Strictly one by one */}
        <div className="mt-3.5 pt-3 border-t border-neutral-100 space-y-2">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Análise dos Últimos 7 Dias
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-bold">
              {Math.min(scanItems.length, activeItemIndex)}/{scanItems.length} Concluídos
            </span>
          </div>

          {scanItems.map((item, idx) => {
            const isDone = idx < activeItemIndex;
            const isCurrentlyAnalyzing = idx === activeItemIndex;
            const isPremiumLocked = item.id !== 'visitors';
            const Icon = item.icon;

            // Rolling number calculation with stepped delays between batches
            let displayCount = 0;
            if (isDone) {
              displayCount = item.finalValue;
            } else if (isCurrentlyAnalyzing) {
              displayCount = getSteppedDisplayCount(activeItemProgress, item.finalValue);
            }

            return (
              <div
                key={item.id}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                  isCurrentlyAnalyzing
                    ? 'bg-rose-50/40 border-rose-400 ring-1 ring-rose-400/30 text-neutral-900 shadow-xs'
                    : isDone
                    ? isPremiumLocked
                      ? 'bg-neutral-50/90 border-cyan-400 ring-1 ring-cyan-400/30 text-neutral-900 shadow-xs'
                      : 'bg-neutral-50/80 border-neutral-200 text-neutral-900 shadow-xs'
                    : isPremiumLocked
                    ? 'bg-neutral-50/30 border-cyan-300/60 text-neutral-400 opacity-60'
                    : 'bg-neutral-50/30 border-neutral-100 text-neutral-400 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  {/* Left: Icon, Full Title & Full Subtitle */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`p-1.5 sm:p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                        isDone
                          ? `${item.bg} ${item.color}`
                          : isCurrentlyAnalyzing
                          ? 'bg-rose-100 text-rose-600 animate-pulse'
                          : 'bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs sm:text-sm font-bold leading-tight break-words ${isDone || isCurrentlyAnalyzing ? 'text-neutral-900' : 'text-neutral-500'}`}>
                          {item.label}
                        </span>
                        
                        {isDone && !isPremiumLocked && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 inline" />
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-500 leading-snug mt-1 break-words">
                        {isDone 
                          ? item.sub 
                          : isCurrentlyAnalyzing 
                          ? (item.id === 'visitors' ? 'Veja quem anda te monitorando...' : 'Cruzando registros e horários...') 
                          : (item.id === 'visitors' ? 'Veja quem anda te monitorando' : 'Aguardando item anterior...')}
                      </p>
                    </div>
                  </div>

                  {/* Right: State indicator & counter */}
                  <div className="shrink-0 text-right flex flex-col items-end pl-1 pt-0.5">
                    {isDone ? (
                      isPremiumLocked ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs sm:text-base font-black text-neutral-800 tabular-nums whitespace-nowrap blur-[6px] select-none opacity-60">
                              {item.format(displayCount)}
                            </span>
                            <Lock className="w-3 h-3 text-neutral-500 shrink-0" />
                          </div>
                          <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider whitespace-nowrap mt-0.5 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-neutral-400" /> Privado VIP
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-xs sm:text-base font-black text-neutral-900 tabular-nums whitespace-nowrap">
                            {item.format(displayCount)}
                          </span>
                          <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider whitespace-nowrap mt-0.5">
                            ✓ Concluído
                          </span>
                        </>
                      )
                    ) : isCurrentlyAnalyzing ? (
                      isPremiumLocked ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs sm:text-base font-black text-rose-600 tabular-nums whitespace-nowrap blur-[6px] select-none opacity-60">
                            {item.format(displayCount)}
                          </span>
                          <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                        </div>
                      ) : (
                        <span className="font-mono text-xs sm:text-base font-black text-rose-600 tabular-nums whitespace-nowrap">
                          {item.format(displayCount)}
                        </span>
                      )
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono pt-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="whitespace-nowrap">Pendente</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Final CTA Button when 100% */}
        {isAllCompleted && (
          <div className="mt-4 pt-3 border-t border-neutral-100 animate-in fade-in zoom-in-95 duration-300 relative z-30">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  soundFX.playComplete();
                } catch {}
                if (typeof onFinishScan === 'function') {
                  onFinishScan();
                }
              }}
              className="w-full py-3.5 px-5 rounded-2xl font-bold text-white text-sm sm:text-base bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 shadow-xl shadow-rose-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer select-none"
            >
              <span>VER RESULTADO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
