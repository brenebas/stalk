import React, { useState, useEffect } from 'react';
import { StalkerVisitor } from '../types';
import { 
  ChevronLeft, 
  ChevronDown,
  MoreHorizontal, 
  Grid3X3, 
  Repeat2, 
  SquareUserRound, 
  UserPlus, 
  Lock, 
  Clock, 
  Check, 
  Camera
} from 'lucide-react';
import { InstagramVerifiedBadge } from './StepConfirmProfile';

interface InstagramRealProfileCardProps {
  stalker: StalkerVisitor;
}

export const InstagramRealProfileCard: React.FC<InstagramRealProfileCardProps> = ({ stalker }) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'reels' | 'tagged'>('grid');
  
  // Relações definidas:
  // 1: 'they_follow_you' (a pessoa me segue mas eu não sigo de volta) -> Botão inicial "Seguir de volta"
  // 2: 'mutual' (nós nos seguimos) -> Botão inicial "Seguindo ▾"
  // 3: 'neither' (ninguém se segue, perfil mais aleatório) -> Botão inicial "Seguir"
  const relationship = stalker.followRelationship || (
    stalker.id === 'stk-1' ? 'they_follow_you' :
    stalker.id === 'stk-2' ? 'mutual' : 'neither'
  );

  const initialIsFollowing = typeof stalker.isFollowing === 'boolean'
    ? stalker.isFollowing
    : (relationship === 'mutual');

  const isPrivate = Boolean(stalker.isPrivate);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isRequested, setIsRequested] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // Sincroniza estado inicial sempre que o perfil ou a relação atualizar
  useEffect(() => {
    const nextFollowing = typeof stalker.isFollowing === 'boolean'
      ? stalker.isFollowing
      : (relationship === 'mutual');
    setIsFollowing(nextFollowing);
    setIsRequested(false);
    setAvatarFailed(false);
  }, [stalker.id, stalker.handle, stalker.avatarUrl, stalker.isFollowing, relationship]);

  const handlePrimaryAction = () => {
    if (isFollowing) {
      setIsFollowing(false);
      setIsRequested(false);
    } else {
      if (isPrivate && !isFollowing) {
        if (!isRequested) {
          setIsRequested(true);
        } else {
          setIsRequested(false);
        }
      } else {
        setIsFollowing(true);
      }
    }
  };

  let primaryButtonText = 'Seguir';
  let primaryIsActive = false; // false = azul destacado, true = neutro cinza (seguindo/solicitado)

  if (isFollowing) {
    primaryButtonText = 'Seguindo';
    primaryIsActive = true;
  } else if (isPrivate && isRequested) {
    primaryButtonText = 'Solicitado';
    primaryIsActive = true;
  } else if (stalker.isFollower || relationship === 'they_follow_you') {
    primaryButtonText = 'Seguir de volta';
    primaryIsActive = false;
  } else {
    primaryButtonText = 'Seguir';
    primaryIsActive = false;
  }

  const resolveAvatar = (url?: string) => {
    if (!url) return '';
    // Avoid double-wrapping
    if (url.startsWith('/api/proxy-image')) {
      return url;
    }
    if (url.includes('cdninstagram.com') || url.includes('fbcdn.net') || url.includes('fbsbx.com') || url.includes('instagram.com')) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const defaultAvatar = stalker.gender === 'male'
    ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'
    : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80';

  const avatarSrc = !avatarFailed && stalker.avatarUrl
    ? resolveAvatar(stalker.avatarUrl)
    : defaultAvatar;

  const parsedPosts = Number(stalker.postsCount);
  const postsCount = !isNaN(parsedPosts) && isFinite(parsedPosts) && parsedPosts >= 0 ? parsedPosts : (isPrivate ? 0 : 3);
  const parsedFollowers = Number(stalker.followersCount);
  const followersCount = !isNaN(parsedFollowers) && isFinite(parsedFollowers) && parsedFollowers >= 0 ? parsedFollowers : (isPrivate ? 141 : 428);
  const parsedFollowing = Number(stalker.followingCount);
  const followingCount = !isNaN(parsedFollowing) && isFinite(parsedFollowing) && parsedFollowing >= 0 ? parsedFollowing : (isPrivate ? 133 : 312);

  const bio = stalker.bio !== undefined
    ? stalker.bio
    : (isPrivate ? '⚡ Engenharia & Lifestyle 📍 RJ' : '✨ Vivendo um dia de cada vez 📍 SP');

  const formatCount = (count?: number | string | null, fallback: number = 0) => {
    const rawNum = Number(count);
    const n = !isNaN(rawNum) && isFinite(rawNum) && rawNum >= 0 ? rawNum : fallback;
    if (n >= 1_000_000) {
      return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    }
    if (n >= 100_000) {
      return (n / 1_000).toFixed(0) + ' mil';
    }
    if (n >= 10_000) {
      return (n / 1_000).toFixed(1).replace('.0', '') + ' mil';
    }
    return n.toLocaleString('pt-BR');
  };

  const mutualAvatars = stalker.mutualFriendsAvatars && stalker.mutualFriendsAvatars.length > 0
    ? stalker.mutualFriendsAvatars.map(resolveAvatar)
    : [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80'
      ];

  const mutualText = stalker.mutualFriendsText || (
    relationship === 'they_follow_you'
      ? 'Segue você · Seguido(a) por gabriel.lima e outras 12 pessoas'
      : relationship === 'mutual'
      ? 'Seguem-se · Seguido(a) por camila_azevedo e outras 6 pessoas'
      : 'Perfil sugerido para você'
  );

  // Quando o perfil tiver 0 posts (como @santoxswx7), nunca coloca imagens fictícias
  const hasZeroPosts = stalker.postsCount === 0;

  const postImages = !hasZeroPosts && Array.isArray(stalker.postImages) && stalker.postImages.length > 0
    ? stalker.postImages.map(resolveAvatar)
    : [];

  return (
    <div className="bg-white border border-neutral-200/90 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      {/* 1. Header do Dossiê Investigativo / Telemetria do Visitante */}
      <div className="px-4 py-3 bg-neutral-50/90 border-b border-neutral-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200/70 text-neutral-800 border border-neutral-300/50">
            {stalker.relationshipCategory}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono font-medium bg-white px-2 py-0.5 rounded-md border border-neutral-200/70">
          <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span>{stalker.lastVisitAgo}</span>
        </div>
      </div>

      {/* 2. Interface Real do Instagram Profile (Fiel aos Screenshots) */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Instagram Top Bar */}
        <div className="flex items-center justify-between pb-3.5 mb-1">
          <div className="flex items-center gap-1.5 text-neutral-900 flex-wrap">
            <ChevronLeft className="w-6 h-6 stroke-[2.5] cursor-pointer hover:opacity-70 transition-opacity" />
            <span className="font-bold text-base tracking-tight leading-none">
              {stalker.handle}
            </span>
            {stalker.isVerified && <InstagramVerifiedBadge className="w-4 h-4 ml-0.5" />}
            {!isFollowing && (stalker.isFollower || relationship === 'they_follow_you') && (
              <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-xs leading-none">
                Segue você
              </span>
            )}
          </div>
          <MoreHorizontal className="w-5 h-5 text-neutral-900 cursor-pointer hover:opacity-70 transition-opacity" />
        </div>

        {/* Profile Avatar & Stats Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Avatar com Story Ring (para aberto) ou Foto clássica (para privado) */}
          <div className="relative shrink-0">
            {!isPrivate ? (
              /* Story Ring Gradient Instagram autêntico */
              <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                <div className="p-[2px] bg-white rounded-full">
                  <img
                    src={avatarSrc}
                    alt={stalker.name}
                    onError={() => setAvatarFailed(true)}
                    className="w-16 h-16 sm:w-[72px] sm:h-[72px] object-cover rounded-full"
                  />
                </div>
              </div>
            ) : (
              /* Perfil Privado sem story ativo */
              <div className="p-[1px] bg-neutral-200 rounded-full">
                <img
                  src={avatarSrc}
                  alt={stalker.name}
                  onError={() => setAvatarFailed(true)}
                  className="w-16 h-16 sm:w-[72px] sm:h-[72px] object-cover rounded-full"
                />
              </div>
            )}
          </div>

          {/* 3 Colunas de Métricas (Posts, Seguidores, Seguindo) */}
          <div className="flex-1 flex items-center justify-around text-center">
            <div>
              <span className="block font-bold text-sm sm:text-base text-neutral-900 leading-tight">
                {formatCount(postsCount, isPrivate ? 0 : 3)}
              </span>
              <span className="text-[11px] sm:text-xs text-neutral-600">posts</span>
            </div>
            <div>
              <span className="block font-bold text-sm sm:text-base text-neutral-900 leading-tight">
                {formatCount(followersCount, isPrivate ? 141 : 428)}
              </span>
              <span className="text-[11px] sm:text-xs text-neutral-600">seguidores</span>
            </div>
            <div>
              <span className="block font-bold text-sm sm:text-base text-neutral-900 leading-tight">
                {formatCount(followingCount, isPrivate ? 133 : 312)}
              </span>
              <span className="text-[11px] sm:text-xs text-neutral-600">seguindo</span>
            </div>
          </div>
        </div>

        {/* Nome & Bio do Instagram */}
        <div className="mt-3">
          <h4 className="font-bold text-xs sm:text-sm text-neutral-900 leading-snug">
            {stalker.name}
          </h4>
          {bio ? (
            <p className="text-xs text-neutral-700 whitespace-pre-line mt-0.5 leading-relaxed break-words">
              {bio}
            </p>
          ) : null}
        </div>

        {/* Amigos em Comum (Seguido(a) por ... e outras X pessoas) */}
        <div className="mt-2.5 flex items-center gap-2">
          {mutualAvatars.length > 0 && (
            <div className="flex items-center -space-x-1.5 shrink-0">
              {mutualAvatars.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="Amigo em comum"
                  className="w-4 h-4 rounded-full object-cover border border-white"
                />
              ))}
            </div>
          )}
          <p className="text-[11px] text-neutral-600 leading-tight truncate">
            {mutualText}
          </p>
        </div>

        {/* Botões de Ação do Instagram com suporte aos 3 perfis */}
        <div className="mt-3.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              primaryIsActive
                ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200/90'
                : 'bg-[#0095f6] hover:bg-[#1877f2] text-white shadow-xs'
            }`}
          >
            <span>{primaryButtonText}</span>
            {primaryIsActive && primaryButtonText === 'Seguindo' && <ChevronDown className="w-3.5 h-3.5 text-neutral-700" />}
          </button>

          <button
            type="button"
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200/90 transition-all cursor-pointer text-center"
          >
            Mensagem
          </button>

          <button
            type="button"
            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200/90 transition-all cursor-pointer shrink-0"
            aria-label="Descobrir pessoas"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </button>
        </div>


        {/* Barra de Abas do Instagram (Grid / Reposts / Tags) */}
        <div className="mt-4 border-t border-neutral-100 flex items-center justify-around">
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`flex-1 py-2.5 flex items-center justify-center cursor-pointer transition-colors ${
              activeTab === 'grid'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reels')}
            className={`flex-1 py-2.5 flex items-center justify-center cursor-pointer transition-colors ${
              activeTab === 'reels'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Repeat2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tagged')}
            className={`flex-1 py-2.5 flex items-center justify-center cursor-pointer transition-colors ${
              activeTab === 'tagged'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <SquareUserRound className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo Abaixo das Abas */}
        {!isPrivate || isFollowing ? (
          /* Grade de Fotos do Perfil ou Estado Vazio */
          postImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 pt-1 pb-2">
              {postImages.slice(0, 6).map((src, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden bg-neutral-100 group">
                  <img
                    src={src}
                    alt={`Post ${idx + 1}`}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback if an image fails to load
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Tela autêntica quando não há posts (fiel ao anexo do usuário) */
            <div className="py-10 sm:py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-neutral-900 flex items-center justify-center mb-3">
                <Camera className="w-8 h-8 sm:w-9 sm:h-9 text-neutral-900 stroke-[1.8]" />
              </div>
              <h5 className="font-extrabold text-base sm:text-lg text-neutral-900 tracking-tight">
                Ainda não há nenhum post
              </h5>
            </div>
          )
        ) : (
          /* Área Central de Perfil Privado com Cadeado */
          <div className="py-6 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full border-2 border-neutral-900 flex items-center justify-center mb-2.5">
              <Lock className="w-6 h-6 text-neutral-900" />
            </div>
            <h5 className="font-bold text-sm text-neutral-900">
              Esse perfil é privado
            </h5>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xs">
              Siga este perfil para ver as fotos e vídeos.
            </p>
          </div>
        )}
      </div>

      {/* 3. Rodapé Investigativo / Gatilhos e Comportamento Detectado (Mantendo 100% dos textos) */}
      <div className="p-3.5 bg-neutral-50 border-t border-neutral-200/70 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-neutral-600">
          <span>
            Visitas (7 dias): <strong className="text-neutral-900 font-semibold">{stalker.visitsToday}x</strong>
          </span>
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-600" /> Liberado
          </span>
        </div>

        {/* Caixa de Comportamento Detectado */}
        <div className="p-2.5 rounded-xl bg-white border-l-2 border-l-rose-500 border border-neutral-200/70 text-xs leading-relaxed text-neutral-700">
          <span className="font-bold text-neutral-900">Comportamento detectado: </span>
          <span>{stalker.curiosityHint}</span>
        </div>
      </div>
    </div>
  );
};
