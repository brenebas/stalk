import { StalkerVisitor, ScanMetrics, RealInstagramConnection, InstagramProfile } from '../types';
import { detectGender } from '../utils/genderDetector';

export function generateScanMetrics(
  handle: string,
  followersCount?: number,
  isPrivate: boolean = false
): ScanMetrics {
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = (hash << 5) - hash + handle.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);
  const jitter = 0.88 + ((seed % 25) / 100); // 0.88 to 1.13 variation

  // Base followers count if not provided
  const followers = typeof followersCount === 'number' && followersCount > 0
    ? followersCount
    : (620 + (seed % 1400));

  // Intelligent conversion curve based on Instagram audience size:
  // - Contas pequenas (ex: 80 a 500 seguidores): 8% a 13% de visitantes + base
  // - Contas médias (ex: 500 a 10.000): 4% a 7% de visitantes + base
  // - Contas criadores (ex: 10k a 100k): 2.2% a 3.8% de visitantes + base
  // - Contas grandes (ex: 100k a 1M+): 0.8% a 1.8% de visitantes + base
  let rawVisitors = 0;
  if (followers <= 500) {
    const rate = 0.085 + ((seed % 5) / 100); // 8.5% a 13.5%
    rawVisitors = Math.round(followers * rate * jitter) + 7;
  } else if (followers <= 5000) {
    const rate = 0.048 + ((seed % 24) / 1000); // 4.8% a 7.2%
    rawVisitors = Math.round(followers * rate * jitter) + 15;
  } else if (followers <= 50000) {
    const rate = 0.026 + ((seed % 14) / 1000); // 2.6% a 4.0%
    rawVisitors = Math.round(followers * rate * jitter) + 40;
  } else if (followers <= 500000) {
    const rate = 0.015 + ((seed % 10) / 1000); // 1.5% a 2.5%
    rawVisitors = Math.round(followers * rate * jitter) + 110;
  } else {
    // 500k+ seguidores (grandes perfis / celebridades)
    const rate = 0.008 + ((seed % 6) / 1000); // 0.8% a 1.4%
    rawVisitors = Math.round(followers * rate * jitter) + 300;
  }

  // Perfis privados possuem tráfego externo restrito (~25% a menos)
  if (isPrivate) {
    rawVisitors = Math.max(6, Math.round(rawVisitors * 0.75));
  }

  const visitorsToday = Math.max(8, rawVisitors);

  // Métricas proporcionais e condizentes com o tamanho da conta:
  // Posts salvos: ~20% a 30% do volume de visitantes
  const savedPostsCount = Math.max(2, Math.round(visitorsToday * (0.22 + ((seed % 9) / 100))));

  // Encaminhamentos no Direct: ~14% a 24% do volume de visitantes
  const forwardedDirectCount = Math.max(1, Math.round(visitorsToday * (0.16 + ((seed % 8) / 100))));

  // Ex-seguidores que ainda visitam
  const unfollowedRate = 0.04 + ((seed % 4) / 100);
  const unfollowedVisitingCount = Math.max(2, Math.min(Math.round(visitorsToday * unfollowedRate) + 1, 120));

  // Seguidores fantasmas (% da base): 35% a 62%
  const ghostFollowersPercent = 35 + (seed % 28);

  // Admiradores secretos e stalkers noturnos com limites proporcionais
  const secretAdmirersCount = Math.max(2, Math.min(Math.round(visitorsToday * 0.12) + 2, 60));
  const nightStalkersCount = Math.max(2, Math.min(Math.round(visitorsToday * 0.14) + 1, 80));

  // Total de interações registradas: ~4x a 6x os visitantes
  const totalInteractionsLogged = Math.round(visitorsToday * (4.0 + ((seed % 18) / 10)));

  return {
    visitorsToday,
    savedPostsCount,
    forwardedDirectCount,
    unfollowedVisitingCount,
    ghostFollowersPercent,
    secretAdmirersCount,
    nightStalkersCount,
    totalInteractionsLogged
  };
}

export function generateStalkersList(
  isUnlocked: boolean = false,
  targetCount?: number,
  targetUserGender: 'female' | 'male' = 'female'
): StalkerVisitor[] {
  const isFemaleUser = targetUserGender === 'female';

  const baseList: StalkerVisitor[] = [
    {
      id: 'stk-1',
      name: isFemaleUser ? 'Mariana Duarte' : 'Matheus Borges',
      handle: isFemaleUser ? 'mari_duarte96' : 'matheus.borges',
      maskedHandle: isFemaleUser ? 'mari_duarte96' : 'matheus.borges',
      avatarSeed: isFemaleUser ? 'Mariana' : 'Matheus',
      avatarColor: isFemaleUser ? 'from-pink-500 to-rose-500' : 'from-blue-600 to-indigo-700',
      avatarUrl: isFemaleUser
        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      gender: isFemaleUser ? 'female' : 'male',
      isRevealed: true,
      isPrivate: false,
      followRelationship: 'they_follow_you',
      isFollowing: false,
      isFollower: true,
      visitsToday: 6,
      lastVisitAgo: 'há 18 min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Amigo Próximo',
      curiosityHint: 'Segue você, mas você não segue de volta. Visitou seu perfil 6x nos últimos 7 dias e abriu seus últimos 2 stories 3 vezes seguidas.',
      suspicionScore: 94,
      commonFriendsCount: 14,
      storyViewsWithoutFollowing: 3,
      postsCount: 3,
      followersCount: 428,
      followingCount: 312,
      bio: isFemaleUser ? '✨ Vivendo um dia de cada vez 📍 SP' : '⚡ Engenharia & Lifestyle 📍 SP',
      mutualFriendsAvatars: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=80&q=80'
      ],
      mutualFriendsText: 'Segue você · Seguido(a) por gabriel.lima, beatriz_santos e outras 12 pessoas',
      postImages: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80'
      ]
    },
    {
      id: 'stk-2',
      name: 'Carolina Mendes',
      handle: 'carol_mendes_rj',
      maskedHandle: 'carol_mendes_rj',
      avatarSeed: 'Carolina',
      avatarColor: 'from-purple-500 to-pink-600',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      gender: 'female',
      isRevealed: true,
      isPrivate: false,
      followRelationship: 'mutual',
      isFollowing: true,
      isFollower: true,
      visitsToday: 5,
      lastVisitAgo: 'há 32 min',
      frequency: 'Alta',
      relationshipCategory: 'Amigo Próximo',
      curiosityHint: 'Vocês se seguem mutuamente. Visualizou suas últimas fotos de perfil e passou 3min 40s rolando seu feed esta semana.',
      suspicionScore: 91,
      commonFriendsCount: 8,
      savedPhotosCount: 1,
      postsCount: 2,
      followersCount: 310,
      followingCount: 285,
      bio: '🌴 Carioca | Beach, life & coffee ☕',
      mutualFriendsAvatars: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80'
      ],
      mutualFriendsText: 'Seguem-se · Seguido(a) por camila_azevedo, lucas.moraes e outras 6 pessoas',
      postImages: [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80'
      ]
    },
    // Os perfis a seguir ficam bloqueados por padrão entre os gratuitos
    {
      id: 'stk-3',
      name: isUnlocked ? 'Guilherme Silva' : 'G********* S****',
      handle: isUnlocked ? 'gui_silva.oficial' : 'g****_silva',
      maskedHandle: 'g****_silva',
      avatarSeed: 'Guilherme',
      avatarColor: 'from-indigo-500 to-purple-600',
      gender: 'male',
      isRevealed: isUnlocked,
      isVerified: true,
      isPrivate: false,
      visitsToday: 9,
      lastVisitAgo: 'há 2h 15min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Ex-Contato',
      curiosityHint: 'Pesquisou seu @ diretamente na barra de busca 11 vezes esta semana.',
      suspicionScore: 98,
      commonFriendsCount: 21,
      storyViewsWithoutFollowing: 8
    },
    {
      id: 'stk-4',
      name: isUnlocked ? 'Felipe Santos' : 'F***** S*****',
      handle: isUnlocked ? 'felipe_santos' : 'felipe_****',
      maskedHandle: 'felipe_****',
      avatarSeed: 'Felipe',
      avatarColor: 'from-purple-500 to-pink-600',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: 5,
      lastVisitAgo: 'há 4h 30min',
      frequency: 'Alta',
      relationshipCategory: 'Ex-Seguidor',
      curiosityHint: 'Deixou de te seguir há 14 dias, mas continua visitando seu perfil quase toda noite.',
      suspicionScore: 96,
      commonFriendsCount: 17
    },
    {
      id: 'stk-5',
      name: isUnlocked ? 'Thiago Vasconcelos' : 'T***** V***********',
      handle: isUnlocked ? 'thiago_vasconcelos' : 'thiago_****',
      maskedHandle: 'thiago_****',
      avatarSeed: 'Thiago',
      avatarColor: 'from-emerald-500 to-teal-600',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: false,
      visitsToday: 7,
      lastVisitAgo: 'há 8h 20min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Crush Secreto',
      curiosityHint: 'Salvou 2 fotos suas na pasta secreta de favoritos do Instagram.',
      suspicionScore: 92,
      commonFriendsCount: 9,
      savedPhotosCount: 2
    },
    {
      id: 'stk-6',
      name: isUnlocked ? 'Luana Albuquerque' : 'L**** A**********',
      handle: isUnlocked ? 'luana.albuquerque' : 'luana.*****',
      maskedHandle: 'luana.*****',
      avatarSeed: 'Luana',
      avatarColor: 'from-amber-500 to-orange-600',
      gender: 'female',
      isRevealed: isUnlocked,
      isVerified: true,
      isPrivate: false,
      visitsToday: 3,
      lastVisitAgo: 'há 14h 45min',
      frequency: 'Média',
      relationshipCategory: 'Amigo Próximo',
      curiosityHint: 'Encaminhou uma postagem recente sua no Direct para outra pessoa.',
      suspicionScore: 89,
      commonFriendsCount: 25
    },
    // Perfil 3 Gratuito (+1 liberado posicionado mais abaixo após os bloqueados)
    // Se quem pesquisa for mulher: perfil masculino @vitor_ma0
    // Se quem pesquisa for homem: perfil feminino @lella_silv
    {
      id: 'stk-7',
      name: isFemaleUser ? 'Vítor Machado' : 'Lella Silva',
      handle: isFemaleUser ? 'vitor_ma0' : 'lella_silv',
      maskedHandle: isFemaleUser ? 'vitor_ma0' : 'lella_silv',
      avatarSeed: isFemaleUser ? 'Vítor' : 'Lella',
      avatarColor: isFemaleUser ? 'from-blue-500 to-cyan-500' : 'from-rose-500 to-pink-500',
      avatarUrl: isFemaleUser
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      gender: isFemaleUser ? 'male' : 'female',
      isRevealed: true,
      isPrivate: true,
      followRelationship: 'neither',
      isFollowing: false,
      isFollower: false,
      visitsToday: 8,
      lastVisitAgo: 'há 1d 3h 10min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Stalker Noturno',
      curiosityHint: 'Perfil externo: nenhum de vocês se segue. Encontrou seu perfil por busca direta e visitou na madrugada 4 vezes esta semana.',
      suspicionScore: 97,
      commonFriendsCount: 0,
      savedPhotosCount: 1,
      postsCount: 0,
      followersCount: isFemaleUser ? 141 : 382,
      followingCount: isFemaleUser ? 133 : 290,
      bio: isFemaleUser ? '⚡ Engenharia & Lifestyle 📍 RJ' : '✨ Vivendo o agora | Design & Moda 🤍',
      mutualFriendsAvatars: [],
      mutualFriendsText: 'Perfil sugerido para você'
    },

    {
      id: 'stk-8',
      name: isUnlocked ? 'Bruno Nogueira' : 'B**** N*******',
      handle: isUnlocked ? 'brunooo_nog' : 'brunooo_****',
      maskedHandle: 'brunooo_****',
      avatarSeed: 'Bruno',
      avatarColor: 'from-blue-600 to-indigo-700',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: false,
      visitsToday: 4,
      lastVisitAgo: 'há 1d 9h 25min',
      frequency: 'Alta',
      relationshipCategory: 'Anônimo',
      curiosityHint: 'Usa navegadores anônimos para visualizar seus stories sem aparecer na lista oficial.',
      suspicionScore: 95,
      commonFriendsCount: 12
    },
    {
      id: 'stk-9',
      name: isUnlocked ? 'Fernanda Barreto' : 'F******* B******',
      handle: isUnlocked ? 'fernanda_barreto' : 'fernanda_****',
      maskedHandle: 'fernanda_****',
      avatarSeed: 'Fernanda',
      avatarColor: 'from-rose-500 to-red-600',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: 6,
      lastVisitAgo: 'há 2d 4h 15min',
      frequency: 'Alta',
      relationshipCategory: 'Ex-Contato',
      curiosityHint: 'Visitou seu perfil 8 vezes nas últimas 48h sem deixar nenhuma curtida.',
      suspicionScore: 91,
      commonFriendsCount: 19
    },
    {
      id: 'stk-10',
      name: isUnlocked ? 'Felipe Prado' : 'F***** P****',
      handle: isUnlocked ? 'felipe_prado_sp' : 'felipe_****',
      maskedHandle: 'felipe_****',
      avatarSeed: 'Felipe',
      avatarColor: 'from-cyan-500 to-blue-600',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: false,
      visitsToday: 5,
      lastVisitAgo: 'há 2d 12h 40min',
      frequency: 'Alta',
      relationshipCategory: 'Ex-Seguidor',
      curiosityHint: 'Deixou de te seguir há 1 mês, mas volta ao seu perfil a cada 2 dias.',
      suspicionScore: 93,
      commonFriendsCount: 15
    },
    {
      id: 'stk-11',
      name: isUnlocked ? 'Beatriz Ramos' : 'B****** R****',
      handle: isUnlocked ? 'bia.ramos_art' : 'beatriz_****',
      maskedHandle: 'beatriz_****',
      avatarSeed: 'Beatriz',
      avatarColor: 'from-fuchsia-500 to-pink-600',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: 2,
      lastVisitAgo: 'há 3d 2h 30min',
      frequency: 'Média',
      relationshipCategory: 'Crush Secreto',
      curiosityHint: 'Curtiu e descurtiu por engano uma publicação antiga sua em 2 segundos.',
      suspicionScore: 94,
      commonFriendsCount: 7
    },
    {
      id: 'stk-12',
      name: isUnlocked ? 'Gabriel Zanin' : 'G****** Z****',
      handle: isUnlocked ? 'gabriel_zanin' : 'gabriel_****',
      maskedHandle: 'gabriel_****',
      avatarSeed: 'Gabriel',
      avatarColor: 'from-teal-500 to-emerald-600',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: false,
      visitsToday: 3,
      lastVisitAgo: 'há 3d 15h 20min',
      frequency: 'Média',
      relationshipCategory: 'Amigo Próximo',
      curiosityHint: 'Compartilhou seu carrossel de fotos recente em uma conversa privada.',
      suspicionScore: 86,
      commonFriendsCount: 22
    },
    {
      id: 'stk-13',
      name: isUnlocked ? 'Letícia Pires' : 'L****** P****',
      handle: isUnlocked ? 'leticia_pires' : 'leticia_****',
      maskedHandle: 'leticia_****',
      avatarSeed: 'Letícia',
      avatarColor: 'from-pink-500 to-purple-600',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: 4,
      lastVisitAgo: 'há 4d 5h 45min',
      frequency: 'Alta',
      relationshipCategory: 'Stalker Noturno',
      curiosityHint: 'Passou mais de 6 minutos vendo seus destaques antigos de viagens e eventos.',
      suspicionScore: 90,
      commonFriendsCount: 11
    },
    {
      id: 'stk-14',
      name: isUnlocked ? 'André Lima' : 'A**** L***',
      handle: isUnlocked ? 'andre_lima_br' : 'andre_****',
      maskedHandle: 'andre_****',
      avatarSeed: 'André',
      avatarColor: 'from-sky-500 to-blue-700',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: false,
      visitsToday: 7,
      lastVisitAgo: 'há 4d 18h 10min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Ex-Contato',
      curiosityHint: 'Totalizou mais de 18 visitas acumuladas ao seu perfil durante os últimos 30 dias.',
      suspicionScore: 96,
      commonFriendsCount: 16
    },
    {
      id: 'stk-15',
      name: isUnlocked ? 'Juliana Fontes' : 'J****** F*****',
      handle: isUnlocked ? 'ju.fontes' : 'juliana_****',
      maskedHandle: 'juliana_****',
      avatarSeed: 'Juliana',
      avatarColor: 'from-rose-500 to-orange-500',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: 3,
      lastVisitAgo: 'há 5d 7h 35min',
      frequency: 'Média',
      relationshipCategory: 'Crush Secreto',
      curiosityHint: 'Deu zoom em 3 fotos do seu perfil e salvou uma nos favoritos.',
      suspicionScore: 87,
      commonFriendsCount: 6
    },
    {
      id: 'stk-16',
      name: isUnlocked ? 'Vítor Machado' : 'V**** M******',
      handle: isUnlocked ? 'vitor_machado92' : 'vitor_****',
      maskedHandle: 'vitor_****',
      avatarSeed: 'Vítor',
      avatarColor: 'from-indigo-600 to-blue-700',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: false,
      visitsToday: 4,
      lastVisitAgo: 'há 5d 16h 50min',
      frequency: 'Alta',
      relationshipCategory: 'Anônimo',
      curiosityHint: 'Abre seu perfil regularmente no horário de almoço pelo navegador web.',
      suspicionScore: 88,
      commonFriendsCount: 14
    },
    {
      id: 'stk-17',
      name: isUnlocked ? 'Isabela Cavalcanti' : 'I****** C*********',
      handle: isUnlocked ? 'isabela_cavalcanti' : 'isabela_****',
      maskedHandle: 'isabela_****',
      avatarSeed: 'Isabela',
      avatarColor: 'from-purple-600 to-pink-500',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: 2,
      lastVisitAgo: 'há 6d 4h 15min',
      frequency: 'Média',
      relationshipCategory: 'Ex-Seguidor',
      curiosityHint: 'Visualizou seu perfil completo após parar de interagir nas suas publicações.',
      suspicionScore: 85,
      commonFriendsCount: 18
    },
    {
      id: 'stk-18',
      name: isUnlocked ? 'Matheus Borges' : 'M****** B*****',
      handle: isUnlocked ? 'matheus.borges' : 'matheus_****',
      maskedHandle: 'matheus_****',
      avatarSeed: 'Matheus',
      avatarColor: 'from-amber-600 to-red-600',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: false,
      visitsToday: 1,
      lastVisitAgo: 'há 6d 21h 30min',
      frequency: 'Média',
      relationshipCategory: 'Stalker Noturno',
      curiosityHint: 'Visitou seu perfil logo após você postar uma foto nos Stories.',
      suspicionScore: 82,
      commonFriendsCount: 9
    }
  ];

  if (!targetCount || targetCount <= baseList.length) {
    return targetCount ? baseList.slice(0, Math.max(2, targetCount)) : baseList;
  }

  // Capped to a safe, performance-optimized maximum of 24 top suspect cards
  // This guarantees instantaneous rendering without browser freezes even for profiles with millions of followers
  const MAX_CARDS = 24;
  const safeTarget = Math.min(targetCount, MAX_CARDS);
  const extraCount = Math.max(0, safeTarget - baseList.length);

  if (extraCount === 0) {
    return baseList;
  }

  const extraPool = [
    { first: 'Felipe', last: 'Rocha', gender: 'male' as const, handle: 'felipe_rocha94', cat: 'Stalker Noturno' as const, hint: 'Acessou seu perfil repetidas vezes durante a madrugada.' },
    { first: 'Juliana', last: 'Castro', gender: 'female' as const, handle: 'ju_castro_oficial', cat: 'Amigo Próximo' as const, hint: 'Visualizou suas publicações e Stories em sequência rápida.' },
    { first: 'Lucas', last: 'Moraes', gender: 'male' as const, handle: 'lucasmoraes_sp', cat: 'Crush Secreto' as const, hint: 'Passou mais de 4 minutos rolando fotos do seu feed.' },
    { first: 'Beatriz', last: 'Santana', gender: 'female' as const, handle: 'bia_santana_', cat: 'Ex-Seguidor' as const, hint: 'Pesquisou seu @ diretamente na barra de busca.' },
    { first: 'Gabriel', last: 'Almeida', gender: 'male' as const, handle: 'gabriel_almeida91', cat: 'Ex-Contato' as const, hint: 'Abriu suas fotos em destaque e deu zoom nos posts.' },
    { first: 'Larissa', last: 'Gomes', gender: 'female' as const, handle: 'lari_gomes_rj', cat: 'Stalker Noturno' as const, hint: 'Registrou 5 visualizações entre 02:00 e 04:30.' },
    { first: 'Rafael', last: 'Barros', gender: 'male' as const, handle: 'rafael_barros_br', cat: 'Crush Secreto' as const, hint: 'Salvou uma publicação sua em coleção particular.' },
    { first: 'Camila', last: 'Azevedo', gender: 'female' as const, handle: 'mila_azevedo97', cat: 'Amigo Próximo' as const, hint: 'Encaminhou postagem sua via mensagem direta.' },
    { first: 'Vinicius', last: 'Ribeiro', gender: 'male' as const, handle: 'vini_ribeiro_real', cat: 'Ex-Seguidor' as const, hint: 'Acessou seu perfil após você publicar um Story novo.' },
    { first: 'Amanda', last: 'Cardoso', gender: 'female' as const, handle: 'amanda_cardoso_df', cat: 'Ex-Contato' as const, hint: 'Visualizou seu perfil sem seguir ou curtir nada.' },
    { first: 'Gustavo', last: 'Freitas', gender: 'male' as const, handle: 'gustavo_freitas01', cat: 'Stalker Noturno' as const, hint: 'Visitou seu perfil 3 noites seguidas esta semana.' },
    { first: 'Patricia', last: 'Ramos', gender: 'female' as const, handle: 'patricia_ramos_br', cat: 'Crush Secreto' as const, hint: 'Ficou vários minutos navegando nas fotos antigas.' },
    { first: 'Diego', last: 'Martins', gender: 'male' as const, handle: 'diego_martins_99', cat: 'Amigo Próximo' as const, hint: 'Checou seu status e Stories repetidamente.' },
    { first: 'Fernanda', last: 'Pinto', gender: 'female' as const, handle: 'nanda_pinto_ofc', cat: 'Ex-Contato' as const, hint: 'Pesquisou seu nome completo na busca do Instagram.' },
    { first: 'Leonardo', last: 'Teixeira', gender: 'male' as const, handle: 'leo_teixeira_sp', cat: 'Stalker Noturno' as const, hint: 'Registrou visita às 03:15 da madrugada.' },
    { first: 'Renata', last: 'Correia', gender: 'female' as const, handle: 'renata_correia95', cat: 'Ex-Seguidor' as const, hint: 'Acompanha seus posts sem deixar rastro de curtidas.' },
    { first: 'Thiago', last: 'Monteiro', gender: 'male' as const, handle: 'thiago_monteiro_br', cat: 'Crush Secreto' as const, hint: 'Abriu suas fotos salvas e stories com frequência.' },
    { first: 'Vanessa', last: 'Lopes', gender: 'female' as const, handle: 'vanessa_lopes_mg', cat: 'Amigo Próximo' as const, hint: 'Interage e visita seu perfil com alta frequência.' },
    { first: 'Murilo', last: 'Cavalcante', gender: 'male' as const, handle: 'murilo_caval', cat: 'Stalker Noturno' as const, hint: 'Visualizações de madrugada registradas no feed.' },
    { first: 'Tatiane', last: 'Farias', gender: 'female' as const, handle: 'tati_farias_ofc', cat: 'Ex-Contato' as const, hint: 'Acessou seu perfil diretamente pelo link compartilhado.' },
    { first: 'Caio', last: 'Mendes', gender: 'male' as const, handle: 'caio_mendes_92', cat: 'Crush Secreto' as const, hint: 'Visitou fotos em destaques e Stories recentemente.' },
    { first: 'Aline', last: 'Duarte', gender: 'female' as const, handle: 'aline_duarte_sp', cat: 'Ex-Seguidor' as const, hint: 'Deixou de seguir mas continua abrindo seu feed.' },
    { first: 'Eduardo', last: 'Silveira', gender: 'male' as const, handle: 'edu_silveira_rs', cat: 'Stalker Noturno' as const, hint: 'Múltiplos acessos no período noturno.' },
    { first: 'Carolina', last: 'Neves', gender: 'female' as const, handle: 'carol_neves_ba', cat: 'Amigo Próximo' as const, hint: 'Visualizou sua última atualização há poucos minutos.' },
    { first: 'Andre', last: 'Machado', gender: 'male' as const, handle: 'andre_machado_pr', cat: 'Ex-Contato' as const, hint: 'Checou suas publicações recentes e perfil.' },
    { first: 'Jessica', last: 'Vieira', gender: 'female' as const, handle: 'jessica_vieira_ce', cat: 'Crush Secreto' as const, hint: 'Visualizou perfil com tempo prolongado de permanência.' },
    { first: 'Marcos', last: 'Fernandes', gender: 'male' as const, handle: 'marcos_fernandes_go', cat: 'Stalker Noturno' as const, hint: 'Acessos noturnos sequenciais aos Stories.' },
    { first: 'Daniela', last: 'Braga', gender: 'female' as const, handle: 'dani_braga_sc', cat: 'Amigo Próximo' as const, hint: 'Visita regular ao perfil nas últimas 24 horas.' },
    { first: 'Alexandre', last: 'Cunha', gender: 'male' as const, handle: 'alex_cunha_es', cat: 'Ex-Seguidor' as const, hint: 'Acessou seu feed após parar de seguir sua conta.' },
    { first: 'Bruna', last: 'Peixoto', gender: 'female' as const, handle: 'bruna_peixoto_pe', cat: 'Ex-Contato' as const, hint: 'Registrou visita anônima aos Stories recentes.' }
  ];

  const colorGradients = [
    'from-pink-500 to-rose-500',
    'from-blue-500 to-cyan-500',
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-fuchsia-600',
    'from-rose-500 to-red-600'
  ];

  const extraList: StalkerVisitor[] = [];
  for (let i = 0; i < extraCount; i++) {
    const item = extraPool[i % extraPool.length];
    const idNum = baseList.length + i + 1;
    const maskedName = `${item.first[0]}${'*'.repeat(item.first.length - 1)} ${item.last[0]}${'*'.repeat(item.last.length - 1)}`;
    const maskedHandle = `${item.handle.slice(0, 3)}****_${item.handle.slice(-2)}`;
    
    const extraDay = 1 + ((i * 2 + 1) % 6);
    const extraHour = (i * 3 + 2) % 23;
    const extraMin = ((i * 11 + 9) % 50) + 5;

    extraList.push({
      id: `stk-${idNum}`,
      name: isUnlocked ? `${item.first} ${item.last}` : maskedName,
      handle: isUnlocked ? item.handle : maskedHandle,
      maskedHandle: maskedHandle,
      avatarSeed: item.first,
      avatarColor: colorGradients[i % colorGradients.length],
      gender: item.gender,
      isRevealed: isUnlocked,
      isPrivate: i % 2 === 0,
      visitsToday: 1 + ((i * 3) % 7),
      lastVisitAgo: `há ${extraDay}d ${extraHour}h ${extraMin}min`,
      frequency: (i % 3 === 0 ? 'Muito Alta' : i % 2 === 0 ? 'Alta' : 'Média'),
      relationshipCategory: item.cat,
      curiosityHint: item.hint,
      suspicionScore: 80 + (i % 18),
      commonFriendsCount: 3 + (i % 22)
    });
  }

  return [...baseList, ...extraList];
}

/**
 * Integrates real following/follower accounts fetched from Apify into the 3 free profiles:
 * 1. "a pessoa me segue mas eu não sigo de volta" (they_follow_you) - Feminino
 * 2. "nós nos seguimos" (mutual) - Feminino
 * 3. "ninguém se segue, um perfil mais aleatório" (neither) - Masculino
 * Distribuição garantida: 2 perfis femininos e 1 masculino.
 */
export function applyRealConnectionsToStalkers(
  stalkers: StalkerVisitor[],
  connections: RealInstagramConnection[],
  targetHandleOrProfile?: string | InstagramProfile
): StalkerVisitor[] {
  if (!connections || connections.length === 0 || !Array.isArray(stalkers) || stalkers.length < 3) {
    return stalkers;
  }

  const updated = [...stalkers];

  const targetHandle = typeof targetHandleOrProfile === 'object' && targetHandleOrProfile !== null
    ? (targetHandleOrProfile.handle || 'usuario')
    : (targetHandleOrProfile || 'usuario');

  const toProxyUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('/api/proxy-image')) return url;
    if (url.includes('cdninstagram.com') || url.includes('fbcdn.net') || url.includes('fbsbx.com') || url.includes('instagram.com')) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const targetProfile = typeof targetHandleOrProfile === 'object' && targetHandleOrProfile !== null
    ? targetHandleOrProfile
    : null;
  const targetUserGender: 'female' | 'male' = targetProfile
    ? detectGender(targetProfile.name, targetProfile.bio, targetProfile.handle)
    : detectGender('', '', typeof targetHandleOrProfile === 'string' ? targetHandleOrProfile : 'usuario');

  // Separa as conexões reais por gênero detectado
  const femaleConns: RealInstagramConnection[] = [];
  const maleConns: RealInstagramConnection[] = [];

  for (const c of connections) {
    const detected = c.gender || detectGender(c.fullName, c.bio, c.username);
    if (detected === 'female') {
      femaleConns.push(c);
    } else {
      maleConns.push(c);
    }
  }

  // 3. Identifica conn3 primeiro (o 3º perfil externo onde ninguém se segue):
  // Se quem pesquisa for mulher -> @vitor_ma0 (masculino)
  // Se quem pesquisa for homem -> @lella_silv (feminino)
  const stk7Index = updated.findIndex(s => s.id === 'stk-7');
  const target3ExpectedHandle = targetUserGender === 'female' ? 'vitor_ma0' : 'lella_silv';
  const conn3 = connections.find(c => c.username.toLowerCase() === target3ExpectedHandle)
    || connections[2]
    || connections.find(c => c.username.toLowerCase() === 'vitor_ma0' || c.username.toLowerCase() === 'lella_silv')
    || (targetUserGender === 'female' ? maleConns[0] : femaleConns[0]);

  // Candidatos 1 e 2 para garantir 2 mulheres e 1 homem no total:
  // Se mulher: conn3 é homem (@vitor_ma0) -> conn1 e conn2 DEVEM ser mulheres
  // Se homem: conn3 é mulher (@lella_silv) -> entre conn1 e conn2 DEVE haver 1 homem e 1 mulher
  let conn1: RealInstagramConnection | undefined;
  let conn2: RealInstagramConnection | undefined;

  if (targetUserGender === 'female') {
    const availableFemales = femaleConns.filter(c => c.username.toLowerCase() !== conn3?.username.toLowerCase());
    conn1 = availableFemales[0] || connections.find(c => c.username.toLowerCase() !== conn3?.username.toLowerCase()) || connections[0];
    conn2 = availableFemales.filter(c => c.username.toLowerCase() !== conn1?.username.toLowerCase())[0]
      || connections.find(c => c.username.toLowerCase() !== conn3?.username.toLowerCase() && c.username.toLowerCase() !== conn1?.username.toLowerCase())
      || connections[1];
  } else {
    // Quem pesquisa é homem: conn3 é mulher (@lella_silv).
    // conn1 (dos seguidores): masculino
    const availableMales = maleConns.filter(c => c.username.toLowerCase() !== conn3?.username.toLowerCase());
    conn1 = availableMales[0] || connections.find(c => c.username.toLowerCase() !== conn3?.username.toLowerCase()) || connections[0];

    // conn2 (dos seguidos): feminino
    const availableFemales = femaleConns.filter(c => c.username.toLowerCase() !== conn3?.username.toLowerCase() && c.username.toLowerCase() !== conn1?.username.toLowerCase());
    conn2 = availableFemales[0] || connections.find(c => c.username.toLowerCase() !== conn3?.username.toLowerCase() && c.username.toLowerCase() !== conn1?.username.toLowerCase()) || connections[1];
  }

  // 1. Perfil 1:
  if (conn1 && updated[0]) {
    const pic1 = conn1.profilePicUrlHD || conn1.profilePicUrl;
    const proxyPic1 = pic1 ? toProxyUrl(pic1) : updated[0].avatarUrl;
    const postImgs1 = (typeof conn1.postsCount === 'number' && conn1.postsCount === 0)
      ? []
      : (conn1.postImages && conn1.postImages.length > 0)
      ? conn1.postImages.map(toProxyUrl)
      : (conn1.postsCount && conn1.postsCount > 0 ? updated[0].postImages : []);

    const isConn1Following = typeof conn1.isFollowing === 'boolean'
      ? conn1.isFollowing
      : (conn1.followRelationship === 'mutual');
    const isConn1Follower = typeof conn1.isFollower === 'boolean'
      ? conn1.isFollower
      : (conn1.followRelationship !== 'neither');

    const gender1 = conn1.gender || detectGender(conn1.fullName, conn1.bio, conn1.username);

    updated[0] = {
      ...updated[0],
      handle: conn1.username,
      maskedHandle: conn1.username,
      name: conn1.fullName && conn1.fullName.trim() ? conn1.fullName : conn1.username,
      avatarUrl: proxyPic1,
      gender: gender1,
      isRevealed: true,
      followRelationship: conn1.followRelationship || (isConn1Following && isConn1Follower ? 'mutual' : isConn1Following ? 'mutual' : isConn1Follower ? 'they_follow_you' : 'neither'),
      isFollowing: isConn1Following,
      isFollower: isConn1Follower,
      bio: conn1.bio !== undefined && conn1.bio !== null ? conn1.bio : updated[0].bio,
      followersCount: typeof conn1.followersCount === 'number' ? conn1.followersCount : updated[0].followersCount,
      followingCount: typeof conn1.followingCount === 'number' ? conn1.followingCount : updated[0].followingCount,
      postsCount: typeof conn1.postsCount === 'number' ? conn1.postsCount : updated[0].postsCount,
      isVerified: conn1.isVerified,
      isPrivate: conn1.isPrivate,
      postImages: postImgs1,
      curiosityHint: isConn1Following
        ? `Vocês se seguem mutuamente. Visualizou suas publicações recentes e abriu seus últimos stories ${updated[0].visitsToday}x nos últimos 7 dias.`
        : `Segue você, mas você não segue de volta. Visitou seu perfil ${updated[0].visitsToday}x nos últimos 7 dias e abriu seus últimos stories.`,
      mutualFriendsText: isConn1Following
        ? `Seguem-se · Seguido(a) por ${targetHandle} e outras ${Math.max(2, updated[0].commonFriendsCount - 1)} pessoas`
        : `Segue você · Seguido(a) por ${targetHandle} e outras ${Math.max(2, updated[0].commonFriendsCount - 1)} pessoas`,
      mutualFriendsAvatars: connections.slice(1, 4)
        .map(c => toProxyUrl(c.profilePicUrlHD || c.profilePicUrl))
        .filter(Boolean),
    };
  }

  // 2. Perfil 2:
  if (conn2 && updated[1]) {
    const pic2 = conn2.profilePicUrlHD || conn2.profilePicUrl;
    const proxyPic2 = pic2 ? toProxyUrl(pic2) : updated[1].avatarUrl;
    const postImgs2 = (typeof conn2.postsCount === 'number' && conn2.postsCount === 0)
      ? []
      : (conn2.postImages && conn2.postImages.length > 0)
      ? conn2.postImages.map(toProxyUrl)
      : (conn2.postsCount && conn2.postsCount > 0 ? updated[1].postImages : []);

    const isConn2Following = typeof conn2.isFollowing === 'boolean'
      ? conn2.isFollowing
      : true;
    const isConn2Follower = typeof conn2.isFollower === 'boolean'
      ? conn2.isFollower
      : (conn2.followRelationship === 'mutual');

    const gender2 = conn2.gender || detectGender(conn2.fullName, conn2.bio, conn2.username);

    updated[1] = {
      ...updated[1],
      handle: conn2.username,
      maskedHandle: conn2.username,
      name: conn2.fullName && conn2.fullName.trim() ? conn2.fullName : conn2.username,
      avatarUrl: proxyPic2,
      gender: gender2,
      isRevealed: true,
      followRelationship: conn2.followRelationship || (isConn2Following && isConn2Follower ? 'mutual' : isConn2Following ? 'mutual' : isConn2Follower ? 'they_follow_you' : 'neither'),
      isFollowing: isConn2Following,
      isFollower: isConn2Follower,
      bio: conn2.bio !== undefined && conn2.bio !== null ? conn2.bio : updated[1].bio,
      followersCount: typeof conn2.followersCount === 'number' ? conn2.followersCount : updated[1].followersCount,
      followingCount: typeof conn2.followingCount === 'number' ? conn2.followingCount : updated[1].followingCount,
      postsCount: typeof conn2.postsCount === 'number' ? conn2.postsCount : updated[1].postsCount,
      isVerified: conn2.isVerified,
      isPrivate: conn2.isPrivate,
      postImages: postImgs2,
      curiosityHint: isConn2Following
        ? `Vocês se seguem mutuamente. Visualizou suas publicações recentes e passou vários minutos rolando seu feed.`
        : `Segue você, mas você não segue de volta. Visitou seu perfil ${updated[1].visitsToday}x nos últimos 7 dias.`,
      mutualFriendsText: isConn2Following
        ? `Seguem-se · Seguido(a) por ${targetHandle} e outras ${Math.max(2, updated[1].commonFriendsCount - 1)} pessoas`
        : `Segue você · Seguido(a) por ${targetHandle} e outras ${Math.max(2, updated[1].commonFriendsCount - 1)} pessoas`,
      mutualFriendsAvatars: connections.slice(0, 3)
        .filter(c => c.username !== conn2.username)
        .map(c => toProxyUrl(c.profilePicUrlHD || c.profilePicUrl))
        .filter(Boolean),
    };
  }

  // 3. Perfil 3: Perfil externo stk-7 (@vitor_ma0 para mulher, @lella_silv para homem)
  if (conn3 && stk7Index !== -1) {
    const pic3 = conn3.profilePicUrlHD || conn3.profilePicUrl;
    const proxyPic3 = pic3 ? toProxyUrl(pic3) : updated[stk7Index].avatarUrl;
    const postImgs3 = (typeof conn3.postsCount === 'number' && conn3.postsCount === 0)
      ? []
      : (conn3.postImages && conn3.postImages.length > 0)
      ? conn3.postImages.map(toProxyUrl)
      : (conn3.postsCount && conn3.postsCount > 0 ? updated[stk7Index].postImages : []);

    const isConn3Following = typeof conn3.isFollowing === 'boolean'
      ? conn3.isFollowing
      : false;
    const isConn3Follower = typeof conn3.isFollower === 'boolean'
      ? conn3.isFollower
      : false;

    const gender3 = conn3.gender || (targetUserGender === 'female' ? 'male' : 'female');

    updated[stk7Index] = {
      ...updated[stk7Index],
      handle: conn3.username,
      maskedHandle: conn3.username,
      name: conn3.fullName && conn3.fullName.trim() ? conn3.fullName : conn3.username,
      avatarUrl: proxyPic3,
      gender: gender3,
      isRevealed: true,
      followRelationship: conn3.followRelationship || (isConn3Following && isConn3Follower ? 'mutual' : isConn3Following ? 'mutual' : isConn3Follower ? 'they_follow_you' : 'neither'),
      isFollowing: isConn3Following,
      isFollower: isConn3Follower,
      bio: conn3.bio !== undefined && conn3.bio !== null ? conn3.bio : updated[stk7Index].bio,
      followersCount: typeof conn3.followersCount === 'number' ? conn3.followersCount : updated[stk7Index].followersCount,
      followingCount: typeof conn3.followingCount === 'number' ? conn3.followingCount : updated[stk7Index].followingCount,
      postsCount: typeof conn3.postsCount === 'number' ? conn3.postsCount : updated[stk7Index].postsCount,
      isVerified: conn3.isVerified,
      isPrivate: conn3.isPrivate,
      postImages: postImgs3,
      curiosityHint: isConn3Following
        ? `Vocês se seguem no Instagram. Visitou seu perfil na madrugada ${updated[stk7Index].visitsToday}x esta semana.`
        : `Perfil externo: nenhum de vocês se segue. Encontrou seu perfil por busca direta e visitou na madrugada ${updated[stk7Index].visitsToday}x esta semana.`,
      mutualFriendsText: isConn3Following ? `Seguem-se · Seguido(a) por ${targetHandle}` : 'Perfil sugerido para você',
      mutualFriendsAvatars: [],
    };
  }

  return updated;
}
