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

function getPrivateVisits(
  stalkerGender: 'female' | 'male',
  isFemaleUser: boolean,
  elevatedCount: number,
  realisticCount: number
): number {
  if (isFemaleUser && stalkerGender === 'male') {
    return elevatedCount;
  }
  return realisticCount;
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
      visitsToday: 2,
      lastVisitAgo: 'há 18 min',
      frequency: 'Média',
      relationshipCategory: 'Amigo Próximo',
      curiosityHint: 'Visualizou seu último post e abriu seu último Story 2 vezes em menos de 10 minutos.',
      suspicionScore: 94,
      commonFriendsCount: 3,
      storyViewsWithoutFollowing: 2,
      postsCount: 3,
      followersCount: 428,
      followingCount: 312,
      bio: isFemaleUser ? '✨ Vivendo um dia de cada vez 📍 SP' : '⚡ Engenharia & Lifestyle 📍 SP',
      mutualFriendsAvatars: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=80&q=80'
      ],
      mutualFriendsText: 'Segue você · Seguido(a) por gabriel.lima e outras 3 pessoas',
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
      visitsToday: 2,
      lastVisitAgo: 'há 32 min',
      frequency: 'Média',
      relationshipCategory: 'Amigo Próximo',
      curiosityHint: 'Entrou no seu perfil através do último Reels que você curtiu, e ficou alguns segundos.',
      suspicionScore: 91,
      commonFriendsCount: 2,
      savedPhotosCount: 1,
      postsCount: 2,
      followersCount: 310,
      followingCount: 285,
      bio: '🌴 Carioca | Beach, life & coffee ☕',
      mutualFriendsAvatars: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80'
      ],
      mutualFriendsText: 'Seguem-se · Seguido(a) por camila_azevedo e outras 2 pessoas',
      postImages: [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80'
      ]
    },
    // Os perfis a seguir ficam bloqueados por padrão entre os gratuitos (perfis privados)
    {
      id: 'stk-3',
      name: isUnlocked ? 'Camila Vasconcelos' : 'C***** V***********',
      handle: isUnlocked ? 'camila_vasc' : 'camila_****',
      maskedHandle: 'camila_****',
      avatarSeed: 'Camila',
      avatarColor: 'from-purple-500 to-pink-600',
      avatarUrl: 'https://i.ibb.co/r2vbyvjM/958de002a72d1636dac421e9841e6669.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 18, 5),
      lastVisitAgo: isFemaleUser ? 'há 43 min' : 'há 35 min',
      frequency: 'Muito Alta',
      relationshipCategory: isFemaleUser ? 'Encaminhou no Direct' : 'Stalker da Madrugada',
      curiosityHint: isFemaleUser
        ? 'Encaminhou seu último Story no Direct para outra pessoa há 43 minutos.'
        : 'Visitou seu perfil na madrugada para rever seu último post.',
      suspicionScore: 98,
      commonFriendsCount: 0
    },
    {
      id: 'stk-4',
      name: isUnlocked ? 'Guilherme Silva' : 'G********* S****',
      handle: isUnlocked ? 'gui_silva.oficial' : 'g****_silva',
      maskedHandle: 'g****_silva',
      avatarSeed: 'Guilherme',
      avatarColor: 'from-indigo-500 to-purple-600',
      avatarUrl: 'https://i.ibb.co/LXtjQHr9/eb287f42f0d2279a8db70f63065ea69b.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isVerified: true,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 16, 4),
      lastVisitAgo: 'há 1h 15min',
      frequency: 'Muito Alta',
      relationshipCategory: isFemaleUser ? 'Crush Secreto' : 'Ex-Contato',
      curiosityHint: isFemaleUser
        ? 'Homem que pesquisou seu @ diretamente na barra de busca e olhou sua última foto de madrugada.'
        : 'Pesquisou seu @ diretamente na barra de busca para ver sua última foto.',
      suspicionScore: 98,
      commonFriendsCount: 3
    },
    {
      id: 'stk-5',
      name: isUnlocked ? 'Luana Albuquerque' : 'L**** A**********',
      handle: isUnlocked ? 'luana.albuquerque' : 'luana.*****',
      maskedHandle: 'luana.*****',
      avatarSeed: 'Luana',
      avatarColor: 'from-amber-500 to-orange-600',
      avatarUrl: 'https://i.ibb.co/FLcx50Tg/d49b9b3ea1840e4e47fe68a975d2bbb9.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isVerified: true,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 16, 5),
      lastVisitAgo: isFemaleUser ? 'há 1h 45min' : 'há 1h 10min',
      frequency: 'Muito Alta',
      relationshipCategory: isFemaleUser ? 'Printou seu Post' : 'Salvou sua Foto',
      curiosityHint: isFemaleUser
        ? 'Tirou print do seu último post recente e visitou seu feed sem curtir nada.'
        : 'Deu zoom na sua última foto do feed e salvou na pasta privada dela.',
      suspicionScore: 96,
      commonFriendsCount: 0
    },
    {
      id: 'stk-6',
      name: isUnlocked ? 'Thiago Santos' : 'T***** S*****',
      handle: isUnlocked ? 'thiago_santos' : 'thiago_****',
      maskedHandle: 'thiago_****',
      avatarSeed: 'Thiago',
      avatarColor: 'from-emerald-500 to-teal-600',
      avatarUrl: 'https://i.ibb.co/bMg8g40t/8be4f20073a2fe50431ce0703d04395d.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 17, 4),
      lastVisitAgo: 'há 2h 20min',
      frequency: 'Muito Alta',
      relationshipCategory: isFemaleUser ? 'Crush Secreto' : 'Amigo em Comum',
      curiosityHint: isFemaleUser
        ? 'Salvou sua última foto na pasta de favoritos do Instagram.'
        : 'Visualizou sua última foto e último post recente.',
      suspicionScore: 92,
      commonFriendsCount: 2
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
      visitsToday: 2,
      lastVisitAgo: 'há 1d 3h 10min',
      frequency: 'Média',
      relationshipCategory: 'Perfil Sugerido',
      curiosityHint: 'Encontrou seu perfil porque apareceu na opção de perfis sugeridos e ficou no seu perfil por 5 minutos.',
      suspicionScore: 97,
      commonFriendsCount: 0,
      savedPhotosCount: 1,
      postsCount: 3,
      followersCount: isFemaleUser ? 141 : 382,
      followingCount: isFemaleUser ? 133 : 290,
      bio: isFemaleUser ? '⚡ Engenharia & Lifestyle 📍 RJ' : '✨ Vivendo o agora | Design & Moda 🤍',
      postImages: isFemaleUser ? [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80'
      ] : [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80'
      ],
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
      avatarUrl: 'https://i.ibb.co/mV3ZFmFJ/36f3bdecab6f2d15d8671c15ac3e95ae.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 15, 5),
      lastVisitAgo: 'há 1d 9h 25min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Anônimo',
      curiosityHint: 'Usa navegadores anônimos para visualizar seu último Story sem aparecer na lista oficial.',
      suspicionScore: 95,
      commonFriendsCount: 0
    },
    {
      id: 'stk-9',
      name: isUnlocked ? 'Beatriz Ramos' : 'B****** R****',
      handle: isUnlocked ? 'bia.ramos_art' : 'beatriz_****',
      maskedHandle: 'beatriz_****',
      avatarSeed: 'Beatriz',
      avatarColor: 'from-fuchsia-500 to-pink-600',
      avatarUrl: 'https://i.ibb.co/TDN4w8zr/f0f612c99dae574a2a8850fd52a66fdd.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 15, 6),
      lastVisitAgo: isFemaleUser ? 'há 2d 4h 15min' : 'há 2h 20min',
      frequency: 'Muito Alta',
      relationshipCategory: isFemaleUser ? 'Ex-Seguidora (Vigia)' : 'Abriu seu Direct',
      curiosityHint: isFemaleUser
        ? 'Deixou de te seguir há 12 dias, mas entra no seu perfil todo dia para vigiar seu último post em off.'
        : 'Abriu a conversa no Direct com você após ver seu último Story, mas não enviou mensagem.',
      suspicionScore: 94,
      commonFriendsCount: 2
    },
    {
      id: 'stk-10',
      name: isUnlocked ? 'Felipe Prado' : 'F***** P****',
      handle: isUnlocked ? 'felipe_prado_sp' : 'felipe_****',
      maskedHandle: 'felipe_****',
      avatarSeed: 'Felipe',
      avatarColor: 'from-cyan-500 to-blue-600',
      avatarUrl: 'https://i.ibb.co/gFVCs9Tg/a6f398b941ca55be3168e65696c0dd10.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 18, 5),
      lastVisitAgo: 'há 2d 12h 40min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Ex-Seguidor',
      curiosityHint: 'Volta ao seu perfil para checar seu último post quase todos os dias.',
      suspicionScore: 93,
      commonFriendsCount: 1
    },
    {
      id: 'stk-11',
      name: isUnlocked ? 'Fernanda Barreto' : 'F******* B******',
      handle: isUnlocked ? 'fernanda_barreto' : 'fernanda_****',
      maskedHandle: 'fernanda_****',
      avatarSeed: 'Fernanda',
      avatarColor: 'from-rose-500 to-red-600',
      avatarUrl: 'https://i.ibb.co/35zx4xJ1/1d3db4cfe1952fabac1db0c9b550c5f2.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 14, 4),
      lastVisitAgo: isFemaleUser ? 'há 3d 2h 30min' : 'há 3h 40min',
      frequency: 'Muito Alta',
      relationshipCategory: isFemaleUser ? 'Visualizador Anônimo' : 'Reviu Stories 6x',
      curiosityHint: isFemaleUser
        ? 'Assiste seu último Story por ferramenta anônima para não aparecer na sua lista de visualizações.'
        : 'Reviu seu último Story 6 vezes seguidas sem te seguir.',
      suspicionScore: 92,
      commonFriendsCount: 0
    },
    {
      id: 'stk-12',
      name: isUnlocked ? 'Gabriela Zanin' : 'G******* Z****',
      handle: isUnlocked ? 'gabi_zanin' : 'gabi_****',
      maskedHandle: 'gabi_****',
      avatarSeed: 'Gabriela',
      avatarColor: 'from-teal-500 to-emerald-600',
      avatarUrl: 'https://i.ibb.co/PGTsn8TN/1c11683539dbf111e8b6aec021c54c86.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 15, 5),
      lastVisitAgo: 'há 3d 15h 20min',
      frequency: 'Alta',
      relationshipCategory: 'Amigo Próximo',
      curiosityHint: 'Compartilhou seu último carrossel de fotos recente em uma conversa privada.',
      suspicionScore: 86,
      commonFriendsCount: 3
    },
    {
      id: 'stk-13',
      name: isUnlocked ? 'Lucas Pires' : 'L**** P****',
      handle: isUnlocked ? 'lucas_pires' : 'lucas_****',
      maskedHandle: 'lucas_****',
      avatarSeed: 'Lucas',
      avatarColor: 'from-pink-500 to-purple-600',
      avatarUrl: 'https://i.ibb.co/SXCZP36C/a68e227b4647b3840f92a727684e236c.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 19, 6),
      lastVisitAgo: 'há 4d 5h 45min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Stalker Noturno',
      curiosityHint: 'Passou mais de 6 minutos vendo seus últimos destaques antigos de viagens e eventos.',
      suspicionScore: 90,
      commonFriendsCount: 0
    },
    {
      id: 'stk-14',
      name: isUnlocked ? 'Andréa Lima' : 'A***** L***',
      handle: isUnlocked ? 'andrea_lima_br' : 'andrea_****',
      maskedHandle: 'andrea_****',
      avatarSeed: 'Andréa',
      avatarColor: 'from-sky-500 to-blue-700',
      avatarUrl: 'https://i.ibb.co/HLzLG2Bv/90acdd39af79a0ede5a8654167f8e00d.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 16, 5),
      lastVisitAgo: 'há 4d 18h 10min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Ex-Contato',
      curiosityHint: 'Acessou seu perfil repetidas vezes para acompanhar suas últimas fotos.',
      suspicionScore: 96,
      commonFriendsCount: 2
    },
    {
      id: 'stk-15',
      name: isUnlocked ? 'Julio Fontes' : 'J**** F*****',
      handle: isUnlocked ? 'julio.fontes' : 'julio_****',
      maskedHandle: 'julio_****',
      avatarSeed: 'Julio',
      avatarColor: 'from-rose-500 to-orange-500',
      avatarUrl: 'https://i.ibb.co/93GhJfQR/80325f898083f906060f586cc1481bb3.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 15, 4),
      lastVisitAgo: 'há 5d 7h 35min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Crush Secreto',
      curiosityHint: 'Deu zoom na sua última foto do perfil e salvou nos favoritos.',
      suspicionScore: 87,
      commonFriendsCount: 0
    },
    {
      id: 'stk-16',
      name: isUnlocked ? 'Vitória Machado' : 'V****** M******',
      handle: isUnlocked ? 'vitoria_machado' : 'vitoria_****',
      maskedHandle: 'vitoria_****',
      avatarSeed: 'Vitória',
      avatarColor: 'from-indigo-600 to-blue-700',
      avatarUrl: 'https://i.ibb.co/wkCbqSQ/395a2cfc1e75296df2b90fb7c21886e9.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 14, 5),
      lastVisitAgo: 'há 5d 16h 50min',
      frequency: 'Alta',
      relationshipCategory: 'Anônimo',
      curiosityHint: isFemaleUser
        ? 'Compara curtidas do seu último post e vigia quem comenta nas suas publicações.'
        : 'Checa seu último post e suas últimas fotos frequentemente.',
      suspicionScore: 88,
      commonFriendsCount: 1
    },
    {
      id: 'stk-17',
      name: isUnlocked ? 'Igor Cavalcanti' : 'I*** C*********',
      handle: isUnlocked ? 'igor_cavalcanti' : 'igor_****',
      maskedHandle: 'igor_****',
      avatarSeed: 'Igor',
      avatarColor: 'from-purple-600 to-pink-500',
      avatarUrl: 'https://i.ibb.co/9kD9pddk/1456bd8bbd63723ef865becc9c5127c3.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 18, 5),
      lastVisitAgo: 'há 6d 4h 15min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Ex-Seguidor',
      curiosityHint: 'Acessou seu perfil logo após você postar seu último Story.',
      suspicionScore: 85,
      commonFriendsCount: 0
    },
    {
      id: 'stk-18',
      name: isUnlocked ? 'Mariana Borges' : 'M****** B*****',
      handle: isUnlocked ? 'mariana.borges94' : 'mariana_****',
      maskedHandle: 'mariana_****',
      avatarSeed: 'Mariana',
      avatarColor: 'from-amber-600 to-red-600',
      avatarUrl: 'https://i.ibb.co/gMWRJSfR/f1eb86f05c78ba95d426bba9b7458be6.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 15, 4),
      lastVisitAgo: 'há 6d 21h 30min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Stalker Noturno',
      curiosityHint: 'Visitou seu perfil logo após a publicação do seu último Story.',
      suspicionScore: 82,
      commonFriendsCount: 2
    },
    {
      id: 'stk-19',
      name: isUnlocked ? 'Rodrigo Ferreira' : 'R****** F*******',
      handle: isUnlocked ? 'rodrigo_ferreira' : 'rodrigo_****',
      maskedHandle: 'rodrigo_****',
      avatarSeed: 'Rodrigo',
      avatarColor: 'from-cyan-600 to-blue-700',
      avatarUrl: 'https://i.ibb.co/N6MxQddv/a4d03f0798e0925cc14e15821379be84.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 16, 5),
      lastVisitAgo: 'há 7d 3h 10min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Crush Secreto',
      curiosityHint: 'Ficou vários minutos rolando suas últimas fotos e salvou uma nos favoritos.',
      suspicionScore: 91,
      commonFriendsCount: 0
    },
    {
      id: 'stk-20',
      name: isUnlocked ? 'Juliana Castro' : 'J****** C*****',
      handle: isUnlocked ? 'ju_castro_oficial' : 'ju_castro_****',
      maskedHandle: 'ju_castro_****',
      avatarSeed: 'Juliana',
      avatarColor: 'from-pink-500 to-rose-600',
      avatarUrl: 'https://i.ibb.co/ccgm29G8/52e1507c8716cfaa99ac2d31a1fa83e3.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 14, 5),
      lastVisitAgo: 'há 7d 8h 40min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Amigo Próximo',
      curiosityHint: 'Visualizou seu último post e últimos Stories em sequência rápida.',
      suspicionScore: 89,
      commonFriendsCount: 3
    },
    {
      id: 'stk-21',
      name: isUnlocked ? 'Rafael Barros' : 'R***** B*****',
      handle: isUnlocked ? 'rafael_barros_br' : 'rafael_****',
      maskedHandle: 'rafael_****',
      avatarSeed: 'Rafael',
      avatarColor: 'from-emerald-600 to-teal-700',
      avatarUrl: 'https://i.ibb.co/qHdXHxn/e5775cd932b8daccd076002e180f84b4.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 20, 6),
      lastVisitAgo: 'há 7d 14h 25min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Stalker Noturno',
      curiosityHint: 'Salvou seu último post em coleção particular.',
      suspicionScore: 94,
      commonFriendsCount: 0
    },
    {
      id: 'stk-22',
      name: isUnlocked ? 'Larissa Gomes' : 'L****** G****',
      handle: isUnlocked ? 'lari_gomes_rj' : 'lari_****',
      maskedHandle: 'lari_****',
      avatarSeed: 'Larissa',
      avatarColor: 'from-fuchsia-600 to-purple-600',
      avatarUrl: 'https://i.ibb.co/Q3jmsfQv/b9821e8d3cfc2f9837c1e3cd63d2ce53.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 15, 5),
      lastVisitAgo: 'há 7d 19h 50min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Ex-Contato',
      curiosityHint: 'Registrou visualizações no seu perfil de madrugada para olhar suas últimas fotos.',
      suspicionScore: 88,
      commonFriendsCount: 1
    },
    {
      id: 'stk-23',
      name: isUnlocked ? 'Vinicius Ribeiro' : 'V******* R******',
      handle: isUnlocked ? 'vini_ribeiro_real' : 'vini_****',
      maskedHandle: 'vini_****',
      avatarSeed: 'Vinicius',
      avatarColor: 'from-blue-500 to-sky-600',
      avatarUrl: 'https://i.ibb.co/QjzZnjW6/a07909e6bcfbf093ce2b4348cca3348a.jpg',
      gender: 'male',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('male', isFemaleUser, 15, 4),
      lastVisitAgo: 'há 8d 2h 15min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Ex-Seguidor',
      curiosityHint: 'Acessou seu perfil repetidas vezes logo após seu último post no feed.',
      suspicionScore: 87,
      commonFriendsCount: 0
    },
    {
      id: 'stk-24',
      name: isUnlocked ? 'Bruna Peixoto' : 'B**** P******',
      handle: isUnlocked ? 'bruna_peixoto_pe' : 'bruna_****',
      maskedHandle: 'bruna_****',
      avatarSeed: 'Bruna',
      avatarColor: 'from-rose-500 to-amber-500',
      avatarUrl: 'https://i.ibb.co/Q3jmsfQv/b9821e8d3cfc2f9837c1e3cd63d2ce53.jpg',
      gender: 'female',
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: getPrivateVisits('female', isFemaleUser, 14, 5),
      lastVisitAgo: 'há 8d 6h 30min',
      frequency: 'Muito Alta',
      relationshipCategory: 'Amigo Próximo',
      curiosityHint: 'Acompanha seus últimos posts regularmente sem deixar registros de curtidas.',
      suspicionScore: 90,
      commonFriendsCount: 2
    }
  ];

  if (!isFemaleUser) {
    // Para homens: priorizar todas as mulheres na frente dos perfis bloqueados!
    // Ele não liga para outro homem, ele só pensa em mulheres que visitaram o perfil dele.
    const free1 = baseList[0];
    const free2 = baseList[1];
    const free3 = baseList[6]; // stk-7

    const locked = baseList.filter(s => !s.isRevealed);
    const lockedFemales = locked.filter(s => s.gender === 'female');
    const lockedMales = locked.filter(s => s.gender === 'male');

    const top4Females = lockedFemales.slice(0, 4);
    const restFemales = lockedFemales.slice(4);

    const reordered: StalkerVisitor[] = [
      free1,
      free2,
      ...top4Females,
      free3,
      ...restFemales,
      ...lockedMales
    ];

    reordered.forEach((s, idx) => {
      s.id = `stk-${idx + 1}`;
    });

    baseList.length = 0;
    baseList.push(...reordered);
  }

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
    { first: 'Juliana', last: 'Castro', gender: 'female' as const, handle: 'ju_castro_oficial', cat: 'Amigo Próximo' as const, hint: 'Visualizou seu último post e últimos Stories em sequência rápida.' },
    { first: 'Lucas', last: 'Moraes', gender: 'male' as const, handle: 'lucasmoraes_sp', cat: 'Crush Secreto' as const, hint: 'Passou mais de 4 minutos rolando as fotos do seu último post.' },
    { first: 'Beatriz', last: 'Santana', gender: 'female' as const, handle: 'bia_santana_', cat: 'Ex-Seguidor' as const, hint: 'Pesquisou seu @ diretamente na barra de busca.' },
    { first: 'Gabriel', last: 'Almeida', gender: 'male' as const, handle: 'gabriel_almeida91', cat: 'Ex-Contato' as const, hint: 'Abriu seus destaques e deu zoom no seu último post.' },
    { first: 'Larissa', last: 'Gomes', gender: 'female' as const, handle: 'lari_gomes_rj', cat: 'Stalker Noturno' as const, hint: 'Registrou acessos de madrugada logo após seu último Story.' },
    { first: 'Rafael', last: 'Barros', gender: 'male' as const, handle: 'rafael_barros_br', cat: 'Crush Secreto' as const, hint: 'Salvou seu último post em uma coleção particular.' },
    { first: 'Camila', last: 'Azevedo', gender: 'female' as const, handle: 'mila_azevedo97', cat: 'Amigo Próximo' as const, hint: 'Encaminhou seu último post via mensagem direta.' },
    { first: 'Vinicius', last: 'Ribeiro', gender: 'male' as const, handle: 'vini_ribeiro_real', cat: 'Ex-Seguidor' as const, hint: 'Acessou seu perfil após você publicar seu último Story.' },
    { first: 'Amanda', last: 'Cardoso', gender: 'female' as const, handle: 'amanda_cardoso_df', cat: 'Ex-Contato' as const, hint: 'Visualizou seu perfil sem seguir ou curtir nada.' },
    { first: 'Gustavo', last: 'Freitas', gender: 'male' as const, handle: 'gustavo_freitas01', cat: 'Stalker Noturno' as const, hint: 'Visitou seu perfil 3 noites seguidas esta semana.' },
    { first: 'Patricia', last: 'Ramos', gender: 'female' as const, handle: 'patricia_ramos_br', cat: 'Crush Secreto' as const, hint: 'Ficou vários minutos navegando desde suas fotos até seu último post.' },
    { first: 'Diego', last: 'Martins', gender: 'male' as const, handle: 'diego_martins_99', cat: 'Amigo Próximo' as const, hint: 'Checou seu perfil e seu último Story repetidamente.' },
    { first: 'Fernanda', last: 'Pinto', gender: 'female' as const, handle: 'nanda_pinto_ofc', cat: 'Ex-Contato' as const, hint: 'Pesquisou seu nome completo na busca do Instagram.' },
    { first: 'Leonardo', last: 'Teixeira', gender: 'male' as const, handle: 'leo_teixeira_sp', cat: 'Stalker Noturno' as const, hint: 'Registrou visita às 03:15 da madrugada após seu último Story.' },
    { first: 'Renata', last: 'Correia', gender: 'female' as const, handle: 'renata_correia95', cat: 'Ex-Seguidor' as const, hint: 'Acompanha seus últimos posts sem deixar rastro de curtidas.' },
    { first: 'Thiago', last: 'Monteiro', gender: 'male' as const, handle: 'thiago_monteiro_br', cat: 'Crush Secreto' as const, hint: 'Abriu seu último post e últimos Stories com frequência.' },
    { first: 'Vanessa', last: 'Lopes', gender: 'female' as const, handle: 'vanessa_lopes_mg', cat: 'Amigo Próximo' as const, hint: 'Interage e visita seu perfil com alta frequência.' },
    { first: 'Murilo', last: 'Cavalcante', gender: 'male' as const, handle: 'murilo_caval', cat: 'Stalker Noturno' as const, hint: 'Visualizações de madrugada no seu último post.' },
    { first: 'Tatiane', last: 'Farias', gender: 'female' as const, handle: 'tati_farias_ofc', cat: 'Ex-Contato' as const, hint: 'Acessou seu perfil diretamente pelo link compartilhado.' },
    { first: 'Caio', last: 'Mendes', gender: 'male' as const, handle: 'caio_mendes_92', cat: 'Crush Secreto' as const, hint: 'Visitou fotos em destaques e seu último Story recentemente.' },
    { first: 'Aline', last: 'Duarte', gender: 'female' as const, handle: 'aline_duarte_sp', cat: 'Ex-Seguidor' as const, hint: 'Deixou de seguir mas continua abrindo seu perfil e último post.' },
    { first: 'Eduardo', last: 'Silveira', gender: 'male' as const, handle: 'edu_silveira_rs', cat: 'Stalker Noturno' as const, hint: 'Múltiplos acessos no período noturno ao seu último Story.' },
    { first: 'Carolina', last: 'Neves', gender: 'female' as const, handle: 'carol_neves_ba', cat: 'Amigo Próximo' as const, hint: 'Visualizou seu último post há poucos minutos.' },
    { first: 'Andre', last: 'Machado', gender: 'male' as const, handle: 'andre_machado_pr', cat: 'Ex-Contato' as const, hint: 'Checou seu último post e perfil.' },
    { first: 'Jessica', last: 'Vieira', gender: 'female' as const, handle: 'jessica_vieira_ce', cat: 'Crush Secreto' as const, hint: 'Visualizou perfil e último post com tempo prolongado de permanência.' },
    { first: 'Marcos', last: 'Fernandes', gender: 'male' as const, handle: 'marcos_fernandes_go', cat: 'Stalker Noturno' as const, hint: 'Acessos noturnos sequenciais aos seus últimos Stories.' },
    { first: 'Daniela', last: 'Braga', gender: 'female' as const, handle: 'dani_braga_sc', cat: 'Amigo Próximo' as const, hint: 'Visita regular ao perfil e último Story nas últimas 24 horas.' },
    { first: 'Alexandre', last: 'Cunha', gender: 'male' as const, handle: 'alex_cunha_es', cat: 'Ex-Seguidor' as const, hint: 'Acessou seu perfil após parar de seguir sua conta.' },
    { first: 'Bruna', last: 'Peixoto', gender: 'female' as const, handle: 'bruna_peixoto_pe', cat: 'Ex-Contato' as const, hint: 'Registrou visita anônima ao seu último Story.' }
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
    const extraFriends = (i % 3 === 0) ? 0 : (1 + (i % 3));
    const extraVisits = getPrivateVisits(item.gender, isFemaleUser, 14 + (i % 6), 4 + (i % 3));

    extraList.push({
      id: `stk-${idNum}`,
      name: isUnlocked ? `${item.first} ${item.last}` : maskedName,
      handle: isUnlocked ? item.handle : maskedHandle,
      maskedHandle: maskedHandle,
      avatarSeed: item.first,
      avatarColor: colorGradients[i % colorGradients.length],
      gender: item.gender,
      isRevealed: isUnlocked,
      isPrivate: true,
      visitsToday: extraVisits,
      lastVisitAgo: `há ${extraDay}d ${extraHour}h ${extraMin}min`,
      frequency: (i % 2 === 0 ? 'Muito Alta' : 'Alta'),
      relationshipCategory: item.cat,
      curiosityHint: item.hint,
      suspicionScore: 80 + (i % 18),
      commonFriendsCount: extraFriends
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
    const postImgs1 = (conn1.postImages && conn1.postImages.length > 0)
      ? conn1.postImages.map(toProxyUrl)
      : (updated[0].postImages && updated[0].postImages.length > 0 ? updated[0].postImages : [
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80'
        ]);

    const isConn1Following = typeof conn1.isFollowing === 'boolean'
      ? conn1.isFollowing
      : (conn1.followRelationship === 'mutual');
    const isConn1Follower = typeof conn1.isFollower === 'boolean'
      ? conn1.isFollower
      : (conn1.followRelationship !== 'neither');

    const gender1 = conn1.gender || detectGender(conn1.fullName, conn1.bio, conn1.username);

    const visits1 = 2; // Máximo 2x em perfis abertos

    updated[0] = {
      ...updated[0],
      handle: conn1.username,
      maskedHandle: conn1.username,
      name: conn1.fullName && conn1.fullName.trim() ? conn1.fullName : conn1.username,
      avatarUrl: proxyPic1 || updated[0].avatarUrl,
      gender: gender1,
      isRevealed: true,
      followRelationship: conn1.followRelationship || (isConn1Following && isConn1Follower ? 'mutual' : isConn1Following ? 'mutual' : isConn1Follower ? 'they_follow_you' : 'neither'),
      isFollowing: isConn1Following,
      isFollower: isConn1Follower,
      visitsToday: visits1,
      frequency: 'Média',
      bio: conn1.bio !== undefined && conn1.bio !== null && conn1.bio.trim() ? conn1.bio : updated[0].bio,
      followersCount: typeof conn1.followersCount === 'number' && conn1.followersCount > 0 ? conn1.followersCount : updated[0].followersCount,
      followingCount: typeof conn1.followingCount === 'number' && conn1.followingCount > 0 ? conn1.followingCount : updated[0].followingCount,
      postsCount: Math.max(3, typeof conn1.postsCount === 'number' && conn1.postsCount > 0 ? conn1.postsCount : updated[0].postsCount),
      isVerified: conn1.isVerified,
      isPrivate: conn1.isPrivate,
      postImages: postImgs1,
      curiosityHint: `Visualizou seu último post e abriu seu último Story ${visits1} vezes em menos de 10 minutos.`,
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
    const postImgs2 = (conn2.postImages && conn2.postImages.length > 0)
      ? conn2.postImages.map(toProxyUrl)
      : (updated[1].postImages && updated[1].postImages.length > 0 ? updated[1].postImages : [
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
        ]);

    const isConn2Following = typeof conn2.isFollowing === 'boolean'
      ? conn2.isFollowing
      : true;
    const isConn2Follower = typeof conn2.isFollower === 'boolean'
      ? conn2.isFollower
      : (conn2.followRelationship === 'mutual');

    const gender2 = conn2.gender || detectGender(conn2.fullName, conn2.bio, conn2.username);
    const visits2 = 2; // Máximo 2x em perfis abertos

    updated[1] = {
      ...updated[1],
      handle: conn2.username,
      maskedHandle: conn2.username,
      name: conn2.fullName && conn2.fullName.trim() ? conn2.fullName : conn2.username,
      avatarUrl: proxyPic2 || updated[1].avatarUrl,
      gender: gender2,
      isRevealed: true,
      followRelationship: conn2.followRelationship || (isConn2Following && isConn2Follower ? 'mutual' : isConn2Following ? 'mutual' : isConn2Follower ? 'they_follow_you' : 'neither'),
      isFollowing: isConn2Following,
      isFollower: isConn2Follower,
      visitsToday: visits2,
      frequency: 'Média',
      bio: conn2.bio !== undefined && conn2.bio !== null && conn2.bio.trim() ? conn2.bio : updated[1].bio,
      followersCount: typeof conn2.followersCount === 'number' && conn2.followersCount > 0 ? conn2.followersCount : updated[1].followersCount,
      followingCount: typeof conn2.followingCount === 'number' && conn2.followingCount > 0 ? conn2.followingCount : updated[1].followingCount,
      postsCount: Math.max(3, typeof conn2.postsCount === 'number' && conn2.postsCount > 0 ? conn2.postsCount : updated[1].postsCount),
      isVerified: conn2.isVerified,
      isPrivate: conn2.isPrivate,
      postImages: postImgs2,
      curiosityHint: 'Entrou no seu perfil através do último Reels que você curtiu, e ficou alguns segundos.',
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
    const postImgs3 = (conn3.postImages && conn3.postImages.length > 0)
      ? conn3.postImages.map(toProxyUrl)
      : (updated[stk7Index].postImages && updated[stk7Index].postImages.length > 0 ? updated[stk7Index].postImages : [
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80'
        ]);

    const isConn3Following = typeof conn3.isFollowing === 'boolean'
      ? conn3.isFollowing
      : false;
    const isConn3Follower = typeof conn3.isFollower === 'boolean'
      ? conn3.isFollower
      : false;

    const gender3 = conn3.gender || (targetUserGender === 'female' ? 'male' : 'female');
    const visits3 = 2; // Máximo 2x em perfis abertos

    updated[stk7Index] = {
      ...updated[stk7Index],
      handle: conn3.username,
      maskedHandle: conn3.username,
      name: conn3.fullName && conn3.fullName.trim() ? conn3.fullName : conn3.username,
      avatarUrl: proxyPic3 || updated[stk7Index].avatarUrl,
      gender: gender3,
      isRevealed: true,
      followRelationship: conn3.followRelationship || (isConn3Following && isConn3Follower ? 'mutual' : isConn3Following ? 'mutual' : isConn3Follower ? 'they_follow_you' : 'neither'),
      isFollowing: isConn3Following,
      isFollower: isConn3Follower,
      visitsToday: visits3,
      frequency: 'Média',
      bio: conn3.bio !== undefined && conn3.bio !== null && conn3.bio.trim() ? conn3.bio : updated[stk7Index].bio,
      followersCount: typeof conn3.followersCount === 'number' && conn3.followersCount > 0 ? conn3.followersCount : updated[stk7Index].followersCount,
      followingCount: typeof conn3.followingCount === 'number' && conn3.followingCount > 0 ? conn3.followingCount : updated[stk7Index].followingCount,
      postsCount: Math.max(3, typeof conn3.postsCount === 'number' && conn3.postsCount > 0 ? conn3.postsCount : updated[stk7Index].postsCount),
      isVerified: conn3.isVerified,
      isPrivate: conn3.isPrivate,
      postImages: postImgs3,
      relationshipCategory: 'Perfil Sugerido',
      curiosityHint: 'Encontrou seu perfil porque apareceu na opção de perfis sugeridos e ficou no seu perfil por 5 minutos.',
      mutualFriendsText: isConn3Following ? `Seguem-se · Seguido(a) por ${targetHandle}` : 'Perfil sugerido para você',
      mutualFriendsAvatars: [],
    };
  }

  return updated;
}

