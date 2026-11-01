import React, { useState, useEffect, useRef } from 'react';
import { StalkerVisitor, InstagramProfile, ScanMetrics } from '../types';
import { AvatarIllustration } from './AvatarIllustration';
import { InstagramVerifiedBadge } from './StepConfirmProfile';
import { InstagramRealProfileCard } from './InstagramRealProfileCard';
import { 
  Lock, 
  Unlock, 
  Clock, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  Ghost, 
  Users, 
  UserCheck, 
  Eye, 
  Bookmark, 
  Share2, 
  UserMinus, 
  Globe,
  Sparkles,
  X 
} from 'lucide-react';
import { soundFX } from '../utils/audio';
import { detectGender } from '../utils/genderDetector';

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
  metrics,
  stalkers,
  isUnlocked,
  onOpenCheckout,
  onToggleSimulateUnlock,
  onReset,
}) => {
  // 5 Títulos das Opções de Análise (sincronizados com o escaneamento)
  const [selectedCategory, setSelectedCategory] = useState<string>('visitors');

  // Pop-up acionado quando a pessoa chega no último perfil
  const lastProfileRef = useRef<HTMLDivElement>(null);
  const [showEndOfListPopUp, setShowEndOfListPopUp] = useState(false);
  const hasTriggeredEndOfListRef = useRef(false);

  useEffect(() => {
    if (isUnlocked) {
      setShowEndOfListPopUp(false);
      return;
    }

    const triggerPopup = () => {
      if (hasTriggeredEndOfListRef.current) return;
      hasTriggeredEndOfListRef.current = true;
      setShowEndOfListPopUp(true);
      try {
        soundFX.playRadarPing();
      } catch {}
    };

    const handleScroll = () => {
      if (!lastProfileRef.current || hasTriggeredEndOfListRef.current) return;
      const rect = lastProfileRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      // Dispara quando o último perfil entra no campo de visão
      if (rect.top <= windowHeight * 0.95) {
        triggerPopup();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          triggerPopup();
        }
      },
      { threshold: 0.1 }
    );

    if (lastProfileRef.current) {
      observer.observe(lastProfileRef.current);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isUnlocked]);

  // Temporizador dinâmico de última atividade (inicia em 14 min e aumenta a cada minuto)
  const [minutesAgo, setMinutesAgo] = useState(14);

  useEffect(() => {
    const minuteInterval = setInterval(() => {
      setMinutesAgo((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(minuteInterval);
  }, []);

  // Pop-up "Stalkeando Agora" ao tentar sair da página (gatilho de curiosidade)
  const [showExitPopUp, setShowExitPopUp] = useState(false);
  const hasTriggeredExitRef = useRef(false);

  useEffect(() => {
    if (isUnlocked) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Detecta intenção de saída quando o mouse sobe em direção ao topo (fechar aba / trocar de url)
      if (e.clientY <= 20 && !hasTriggeredExitRef.current) {
        hasTriggeredExitRef.current = true;
        setShowExitPopUp(true);
        try {
          soundFX.playRadarPing();
        } catch {}
      }
    };

    // No mobile/navegador: se o usuário tentar voltar a página
    const handlePopState = () => {
      if (!hasTriggeredExitRef.current) {
        hasTriggeredExitRef.current = true;
        setShowExitPopUp(true);
        try {
          soundFX.playRadarPing();
        } catch {}
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isUnlocked]);

  const safeStalkers = Array.isArray(stalkers) ? stalkers : [];
  const safeProfile = profile || {
    handle: 'usuario',
    name: 'Usuário',
    bio: '',
    avatarUrl: '',
    followersCount: 500,
    followingCount: 300,
    postsCount: 50,
    isVerified: false,
    isPrivate: false,
    category: 'Conta Pessoal',
    isRealData: false,
  };

  const isFemaleUser = detectGender(safeProfile.name, safeProfile.bio, safeProfile.handle) === 'female';
  const totalDetectedProfiles = metrics?.visitorsToday || safeStalkers.length;

  const categories = isFemaleUser
    ? [
        { 
          id: 'visitors', 
          label: 'Visitaram seu perfil', 
          icon: Eye,
          count: totalDetectedProfiles.toLocaleString('pt-BR')
        },
        { 
          id: 'forwarded', 
          label: 'Encaminharam no Direct', 
          icon: Share2,
          count: (metrics?.forwardedDirectCount || Math.max(3, Math.round(totalDetectedProfiles * 0.18))).toLocaleString('pt-BR')
        },
        { 
          id: 'saved', 
          label: 'Tiraram Print / Salvaram', 
          icon: Bookmark,
          count: (metrics?.savedPostsCount || Math.max(3, Math.round(totalDetectedProfiles * 0.25))).toLocaleString('pt-BR')
        },
        { 
          id: 'unfollowed', 
          label: 'Deixou de te seguir', 
          icon: UserMinus,
          count: (metrics?.unfollowedVisitingCount || Math.max(2, Math.round(totalDetectedProfiles * 0.12))).toLocaleString('pt-BR')
        },
        { 
          id: 'ghost', 
          label: 'Vigiam em Anônimo', 
          icon: Ghost,
          count: metrics?.ghostFollowersPercent ? `${metrics.ghostFollowersPercent}%` : '38%'
        },
      ]
    : [
        { 
          id: 'visitors', 
          label: 'Mulheres que Visitaram', 
          icon: Eye,
          count: totalDetectedProfiles.toLocaleString('pt-BR')
        },
        { 
          id: 'saved', 
          label: 'Salvaram suas Fotos', 
          icon: Bookmark,
          count: (metrics?.savedPostsCount || Math.max(3, Math.round(totalDetectedProfiles * 0.25))).toLocaleString('pt-BR')
        },
        { 
          id: 'night', 
          label: 'Stalkers da Madrugada', 
          icon: Clock,
          count: Math.max(4, Math.round(totalDetectedProfiles * 0.18)).toLocaleString('pt-BR')
        },
        { 
          id: 'forwarded', 
          label: 'Abriram seu Direct', 
          icon: Share2,
          count: (metrics?.forwardedDirectCount || Math.max(2, Math.round(totalDetectedProfiles * 0.14))).toLocaleString('pt-BR')
        },
        { 
          id: 'unfollowed', 
          label: 'Deixou de te Seguir', 
          icon: UserMinus,
          count: (metrics?.unfollowedVisitingCount || Math.max(2, Math.round(totalDetectedProfiles * 0.12))).toLocaleString('pt-BR')
        },
      ];

  const filteredStalkers = safeStalkers.filter((s, idx) => {
    if (!s) return false;
    if (selectedCategory === 'visitors') return true;

    const hint = (s.curiosityHint || '').toLowerCase();
    const cat = (s.relationshipCategory || '').toLowerCase();

    if (selectedCategory === 'saved') {
      return (
        hint.includes('salv') ||
        hint.includes('print') ||
        hint.includes('foto') ||
        hint.includes('zoom') ||
        cat.includes('salv') ||
        cat.includes('print') ||
        idx % 3 === 0
      );
    }

    if (selectedCategory === 'forwarded') {
      return (
        hint.includes('encaminh') ||
        hint.includes('direct') ||
        hint.includes('compartilh') ||
        cat.includes('direct') ||
        cat.includes('encaminh') ||
        cat.includes('fofoca') ||
        idx % 4 === 1
      );
    }

    if (selectedCategory === 'night') {
      return (
        hint.includes('madrugada') ||
        hint.includes('noite') ||
        hint.includes('01:') ||
        hint.includes('02:') ||
        cat.includes('madrugada') ||
        cat.includes('noturn') ||
        idx % 3 === 1
      );
    }

    if (selectedCategory === 'unfollowed') {
      return (
        cat.includes('ex-seguidor') ||
        cat.includes('vigia') ||
        hint.includes('deixou de seguir') ||
        hint.includes('parou de seguir') ||
        idx % 5 === 2
      );
    }

    if (selectedCategory === 'ghost') {
      return (
        cat.includes('anônim') ||
        cat.includes('vigia') ||
        cat.includes('falsa') ||
        hint.includes('anônim') ||
        hint.includes('silencioso') ||
        hint.includes('sem deixar rastro') ||
        idx % 2 === 0
      );
    }

    return true;
  });

  // Proporção aceitável e realista de amigos em comum baseada no número de perfis detectados
  const handleStr = safeProfile.handle || 'usuario';
  let mutualsSeed = 42;
  try {
    mutualsSeed = Math.abs(handleStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  } catch {}

  let mutualPercent = 0.14; // 14% base
  if (totalDetectedProfiles <= 120) {
    mutualPercent = 0.14 + ((mutualsSeed % 5) / 100); // 14% a 18%
  } else if (totalDetectedProfiles <= 1000) {
    mutualPercent = 0.11 + ((mutualsSeed % 4) / 100); // 11% a 14%
  } else if (totalDetectedProfiles <= 10000) {
    mutualPercent = 0.08 + ((mutualsSeed % 3) / 100); // 8% a 10%
  } else {
    mutualPercent = 0.05 + ((mutualsSeed % 3) / 100); // 5% a 7%
  }

  const mutualFriendsViewersCount = Math.max(2, Math.round(totalDetectedProfiles * mutualPercent));
  const mutualPercentageDisplay = Math.round((mutualFriendsViewersCount / totalDetectedProfiles) * 100) || 12;

  // Perfil usado no alerta de stalker em tempo real (foto e nome embaçados)
  const activeLiveStalker = safeStalkers.find((s) => !s.isRevealed) || safeStalkers[2] || safeStalkers[0];
  const popupStalkerPhoto = 'https://i.ibb.co/Xr5z3nPF/98bb0b92de7f8fb050ac2f471a93c645.jpg';
  const liveStalkerPhoto = popupStalkerPhoto;
  const liveStalkerName = activeLiveStalker?.name || 'Juliana Castro';
  const liveStalkerHandle = activeLiveStalker?.maskedHandle || 'ju_castro_****';

  // Primeiro nome formatado do perfil analisado para personalizar o gatilho direto
  const rawUserName = safeProfile.name?.trim() || safeProfile.handle || '';
  const cleanName = rawUserName
    ? rawUserName.split(/[\s_.]+/)[0].replace(/^@/, '')
    : 'Ei';
  const userFirstName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* App Dossier Card (White Theme) */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl p-5 sm:p-7 shadow-xl shadow-neutral-200/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <AvatarIllustration
              seed={safeProfile.handle}
              name={safeProfile.name}
              avatarUrl={safeProfile.avatarUrl}
              size="md"
              hasStoryRing={true}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                  @{safeProfile.handle}
                </h1>
                {safeProfile.isVerified && (
                  <InstagramVerifiedBadge className="w-4 h-4" />
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Dossiê compilado · <span className="text-emerald-600 font-semibold">{totalDetectedProfiles.toLocaleString('pt-BR')} perfis detectados</span>
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Status Strips (Clean, Informative & Ghost/Anonymous Themed) */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Quantidade Total de Perfis */}
          <div className="bg-neutral-50/80 hover:bg-neutral-50 border border-neutral-200/90 rounded-2xl p-4 transition-all shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-[11px] font-semibold tracking-wide uppercase flex items-center gap-1.5">
                <Ghost className="w-3.5 h-3.5 text-rose-500" />
                Perfis Detectados
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/60">
                Total
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono tabular-nums">
                {totalDetectedProfiles.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs text-neutral-500 font-medium">perfis no total</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Total de pessoas que visualizaram seu perfil
            </p>
          </div>

          {/* Card 2: Pessoas com Amigos em Comum */}
          <div className="bg-neutral-50/80 hover:bg-neutral-50 border border-neutral-200/90 rounded-2xl p-4 transition-all shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-[11px] font-semibold tracking-wide uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-violet-500" />
                Amigos em Comum
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono tabular-nums">
                {mutualFriendsViewersCount.toLocaleString('pt-BR')}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Viram seu perfil e tem amigos em comum com você
            </p>
          </div>

          {/* Card 3: Quando Foi / Recência */}
          <div className="bg-neutral-50/80 hover:bg-neutral-50 border border-neutral-200/90 rounded-2xl p-4 transition-all shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-[11px] font-semibold tracking-wide uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                Última Atividade
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                Ao Vivo
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-neutral-900 font-mono">
                {`há ${minutesAgo} min`}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Último acesso registrado no radar
            </p>
          </div>
        </div>
      </div>


      {/* Filter Tabs - 5 Títulos das Opções de Análise */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex items-center gap-1.5 p-1.5 bg-neutral-100 border border-neutral-200 rounded-2xl overflow-x-auto max-w-full shadow-2xs">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  soundFX.playTick();
                  setSelectedCategory(cat.id);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-neutral-500'}`} />
                <span>{cat.label}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-neutral-200/80 text-neutral-600'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {isUnlocked && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Relatório Completo Desbloqueado
          </span>
        )}
      </div>

      {/* Stalker Cards List (Clean, Interactive & Modern) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredStalkers.map((stalker) => {
          // Os 3 perfis gratuitos (2 no início e 1 mais abaixo após os bloqueados) utilizam o design real do Instagram
          if (stalker.id === 'stk-1' || stalker.id === 'stk-2' || stalker.id === 'stk-7') {
            return (
              <InstagramRealProfileCard
                key={stalker.id}
                stalker={stalker}
              />
            );
          }

          const isRevealed = stalker.isRevealed || isUnlocked;

          // Badges psicológicos coloridos para comportamentos de alto impacto
          const isHighAlertCat = 
            stalker.relationshipCategory === 'Encaminhou no Direct' ||
            stalker.relationshipCategory === 'Printou seu Post' ||
            stalker.relationshipCategory === 'Stalker da Madrugada' ||
            stalker.relationshipCategory === 'Salvou sua Foto' ||
            stalker.relationshipCategory === 'Abriu seu Direct' ||
            stalker.relationshipCategory === 'Ex-Seguidora (Vigia)' ||
            stalker.relationshipCategory === 'Falsa Amiga' ||
            stalker.relationshipCategory === 'Reviu Stories 6x';

          const tagBadgeStyle = 
            stalker.relationshipCategory === 'Encaminhou no Direct' || stalker.relationshipCategory === 'Falsa Amiga'
              ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
              : stalker.relationshipCategory === 'Printou seu Post'
              ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
              : stalker.relationshipCategory === 'Stalker da Madrugada'
              ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold'
              : stalker.relationshipCategory === 'Salvou sua Foto'
              ? 'bg-pink-100 text-pink-800 border-pink-300 font-bold'
              : stalker.relationshipCategory === 'Abriu seu Direct'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
              : stalker.relationshipCategory === 'Ex-Seguidora (Vigia)'
              ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
              : stalker.relationshipCategory === 'Reviu Stories 6x'
              ? 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold'
              : 'bg-neutral-100 text-neutral-700 border-neutral-200/60 font-semibold';

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
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border shadow-2xs ${tagBadgeStyle}`}>
                    {stalker.relationshipCategory}
                  </span>

                  {stalker.isVerified && (
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80 flex items-center gap-1 shadow-2xs">
                      <InstagramVerifiedBadge className="w-3 h-3" />
                      <span>Conta Verificada</span>
                    </span>
                  )}

                  {isRevealed ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5 text-emerald-600" /> Identificado
                    </span>
                  ) : stalker.isVerified ? null : stalker.isPrivate ? (
                    <span className="text-[10px] font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200/80 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-neutral-500" /> Perfil Privado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200/80 flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5 text-neutral-500" /> Perfil Público
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono font-medium bg-neutral-50 px-2.5 py-1 rounded-lg border border-neutral-200/70">
                    <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
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
                    avatarUrl={stalker.avatarUrl}
                    gender={stalker.gender}
                    gradientClass={stalker.avatarColor}
                    size="md"
                    isBlurred={!isRevealed}
                    hasStoryRing={isRevealed}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className={`text-sm sm:text-base font-bold truncate leading-snug ${
                      isRevealed ? 'text-neutral-900' : 'text-neutral-800 filter blur-[4px] select-none group-hover:blur-[2px] transition-all'
                    }`}>
                      {stalker.name}
                    </h3>
                    {stalker.isVerified && (
                      <span title="Conta Verificada Oficial">
                        <InstagramVerifiedBadge className="w-4 h-4 shrink-0" />
                      </span>
                    )}
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
                  </div>
                </div>
              </div>

              {/* Curiosity Hint Box - Clean editorial accent */}
              <div className="mt-3.5 p-3 rounded-xl bg-neutral-50/90 border-l-2 border-l-rose-500 border border-neutral-200/60 text-xs leading-relaxed text-neutral-700">
                <span className="font-bold text-neutral-900">Comportamento detectado: </span>
                <span>{stalker.curiosityHint}</span>
              </div>

              {/* Blurred teaser footer without button */}
              {!isRevealed ? (
                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 text-[11px]">
                    {stalker.commonFriendsCount > 0
                      ? `${stalker.commonFriendsCount} amigos em comum`
                      : 'Nenhum amigo em comum'}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                    {stalker.isVerified ? (
                      <>
                        <InstagramVerifiedBadge className="w-3 h-3" /> Conta Verificada
                      </>
                    ) : stalker.isPrivate ? (
                      <>
                        <Lock className="w-3 h-3 text-neutral-400" /> Perfil Privado
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 text-neutral-400" /> Perfil Público
                      </>
                    )}
                  </span>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                  <span className="text-[11px]">
                    {stalker.commonFriendsCount > 0
                      ? `${stalker.commonFriendsCount} amigos em comum`
                      : 'Nenhum amigo em comum'}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    ✓ Perfil Liberado
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Marcador do último perfil para acionamento do pop-up */}
        <div ref={lastProfileRef} className="col-span-full h-1 w-full pointer-events-none" />
      </div>

      {/* Pop-up acionado ao chegar no último perfil: o usuário só tem a opção de clicar em "Ver todos os Perfis" */}
      {showEndOfListPopUp && !isUnlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Ícone de Destaque */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/30 text-white">
              <Lock className="w-8 h-8 text-white animate-pulse" />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-black uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              Relatório Completo
            </div>

            {/* Título & Mensagem */}
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-snug">
              {userFirstName}, você chegou ao fim da prévia!
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-2.5 mb-6 leading-relaxed">
              {isFemaleUser
                ? 'Ainda existem 21 pessoas que vigiam seu perfil, salvam suas fotos e encaminham seus Stories no Direct. Desbloqueie agora para revelar todos os nomes e fotos.'
                : 'Ainda existem 21 perfis que visitam seu perfil e salvam suas publicações. Desbloqueie agora para revelar todos os perfis completos.'}
            </p>

            {/* Única opção disponível na tela: Botão "Ver todos os Perfis" */}
            <button
              type="button"
              onClick={() => {
                soundFX.playTick();
                setShowEndOfListPopUp(false);
                onOpenCheckout();
              }}
              className="w-full py-4 px-6 rounded-2xl font-black text-white text-base bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 shadow-xl shadow-rose-600/35 border border-white/30 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Unlock className="w-5 h-5 text-white shrink-0" />
              <span>Ver todos os Perfis</span>
              <ArrowRight className="w-4 h-4 text-white/90 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Pop-up de Intenção de Saída (Exit-Intent Modal): Stalkeando Agora! Gatilho de Curiosidade */}
      {showExitPopUp && !showEndOfListPopUp && !isUnlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Botão de Fechar */}
            <button
              onClick={() => setShowExitPopUp(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Fechar pop-up"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badge de Radar em Tempo Real */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 mb-3.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">
                Ao Vivo no Radar
              </span>
            </div>

            {/* Título Personalizado com Nome & Gatilho Direto */}
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-snug">
              {userFirstName} espere! tem uma pessoa olhando seu perfil nesse exato momento
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
              O radar detectou atividade em tempo real na sua conta: essa pessoa está olhando suas fotos e stories agora. Descubra quem é antes que ela saia do seu perfil.
            </p>

            {/* Card Preview com a Foto Solicitada e Gatilho Direto */}
            <div className="mt-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-rose-400 shadow-sm">
                    <img
                      src="https://i.ibb.co/Xr5z3nPF/98bb0b92de7f8fb050ac2f471a93c645.jpg"
                      alt="Pessoa olhando seu perfil"
                      className="w-full h-full object-cover filter blur-[1.5px] scale-105"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 text-sm filter blur-[5px] select-none">
                      {liveStalkerName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse">
                      Ao Vivo
                    </span>
                  </div>
                  <p className="text-xs font-mono text-neutral-500 filter blur-[4px] select-none mt-0.5">
                    @{liveStalkerHandle}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-700 flex items-center gap-2 font-medium">
                <Eye className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Olhando suas fotos e stories agora mesmo</span>
              </div>
            </div>

            {/* Botão de Ação Principal com Gatilho */}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  soundFX.playTick();
                  setShowExitPopUp(false);
                  onOpenCheckout();
                }}
                className="w-full py-3.5 px-5 rounded-2xl font-black text-white text-sm sm:text-base bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <Unlock className="w-4 h-4 text-white" />
                <span>VER QUEM ESTÁ OLHANDO AGORA</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>

              <button
                type="button"
                onClick={() => setShowExitPopUp(false)}
                className="w-full py-2 text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer text-center"
              >
                Ignorar e sair da página
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
