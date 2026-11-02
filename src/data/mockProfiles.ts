import { InstagramProfile } from '../types';

// Deterministic hash helper for consistent generation based on handle in DEMO mode
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Isolated profiles strictly for DEMO/SIMULATION mode.
 * NEVER marked as isRealData: true. Always has isDemo: true and isRealData: false.
 */
export const DEMO_PROFILES: InstagramProfile[] = [
  {
    handle: 'demo.lifestyle',
    name: 'Perfil Demonstração',
    bio: 'Modo de teste simulado ⚡\nMostrando como o StalkRadar analisa perfis.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    followersCount: 3890,
    followingCount: 640,
    postsCount: 42,
    isVerified: false,
    isPrivate: false,
    category: 'Demonstração',
    isRealData: false,
    isDemo: true,
  },
  {
    handle: 'wesley_dev',
    name: 'Wesley Santos',
    bio: 'Software Engineer & Tech Creator ⚡\nConstruindo produtos digitais escaláveis.\n📍 São Paulo, Brasil',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    followersCount: 14200,
    followingCount: 680,
    postsCount: 124,
    isVerified: true,
    isPrivate: false,
    category: 'Criador de conteúdo digital',
    isRealData: false,
    isDemo: true,
  },
];

export const PRESET_ACCOUNTS = DEMO_PROFILES;

/**
 * Generates a simulated profile for the isolated DEMO mode.
 * Guaranteed to be flagged as isRealData: false, isDemo: true.
 */
export function getDemoInstagramProfile(rawHandle: string): InstagramProfile {
  const cleanHandle = rawHandle.replace(/^@/, '').trim().toLowerCase();

  const existingPreset = DEMO_PROFILES.find((p) => p.handle.toLowerCase() === cleanHandle);
  if (existingPreset) {
    return existingPreset;
  }

  const seed = hashString(cleanHandle || 'user_demo');
  const followersBase = (seed % 45000) + 1200;
  const followingBase = (seed % 1400) + 250;
  const postsBase = (seed % 280) + 18;
  const isVerified = (seed % 7) === 0;
  const isPrivate = (seed % 4) === 0;

  const formattedName =
    cleanHandle
      .split(/[._]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Usuário Demonstração';

  const bios = [
    '✨ Perfil de Demonstração Simulado\n📍 Padrões comportamentais do Instagram.',
    'Testando o radar em modo seguro ⚡\nSimulação analítica de engajamento.',
    'Lifestyle e viagens simuladas 📸\nModo demonstração ativo.',
  ];

  const bioSelected = bios[seed % bios.length];

  const avatarPool = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  ];
  const avatarUrl = avatarPool[seed % avatarPool.length];

  return {
    handle: cleanHandle || 'usuario.demo',
    name: formattedName,
    bio: bioSelected,
    avatarUrl,
    followersCount: followersBase,
    followingCount: followingBase,
    postsCount: postsBase,
    isVerified,
    isPrivate,
    category: isPrivate ? 'Conta Privada (Demo)' : 'Perfil Público (Demo)',
    isRealData: false,
    isDemo: true,
  };
}

export const getOrCreateInstagramProfile = getDemoInstagramProfile;
