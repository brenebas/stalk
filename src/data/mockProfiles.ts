import { InstagramProfile } from '../types';

// Deterministic hash helper for consistent generation based on handle
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Preset popular accounts for immediate quick test
export const PRESET_ACCOUNTS: InstagramProfile[] = [
  {
    handle: 'wesley_dev',
    name: 'Wesley Santos',
    bio: 'Software Engineer & Tech Creator ⚡\nConstruindo produtos digitais escaláveis.\n📍 São Paulo, Brasil',
    avatarUrl: '',
    followersCount: 14200,
    followingCount: 680,
    postsCount: 124,
    isVerified: true,
    isPrivate: false,
    category: 'Criador de conteúdo digital'
  },
  {
    handle: 'camila.lima_oficial',
    name: 'Camila Lima',
    bio: 'Lifestyle, moda & viagens ✨\nParcerias via direct 📩\nRio de Janeiro 🌴',
    avatarUrl: '',
    followersCount: 38900,
    followingCount: 840,
    postsCount: 312,
    isVerified: false,
    isPrivate: false,
    category: 'Blogueira'
  },
  {
    handle: 'pedro_albuquerque',
    name: 'Pedro Henrique Albuquerque',
    bio: 'Crossfit | Coffee | Marketing ☕🏋️\nVivendo um dia de cada vez.',
    avatarUrl: '',
    followersCount: 4820,
    followingCount: 910,
    postsCount: 88,
    isVerified: false,
    isPrivate: true,
    category: 'Conta Pessoal'
  }
];

export function getOrCreateInstagramProfile(rawHandle: string): InstagramProfile {
  const cleanHandle = rawHandle.replace(/^@/, '').trim().toLowerCase();
  
  const existingPreset = PRESET_ACCOUNTS.find(p => p.handle.toLowerCase() === cleanHandle);
  if (existingPreset) {
    return existingPreset;
  }

  const seed = hashString(cleanHandle || 'user_insta');
  const followersBase = (seed % 45000) + 1200;
  const followingBase = (seed % 1400) + 250;
  const postsBase = (seed % 280) + 18;
  const isVerified = (seed % 7) === 0;
  const isPrivate = (seed % 4) === 0;

  // Plausible formatted display name
  const formattedName = cleanHandle
    .split(/[._]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Usuário Instagram';

  const bios = [
    'Vivendo momentos que viram histórias ✨\n📍 Brasil | Apaixonado por conexões.',
    'Construindo o futuro com disciplina e café ☕\n📩 Contato profissional por DM',
    'Amor pela vida, viagens e boas memórias 📸\nGratidão diária 🙏',
    'Moda, rotina e coisas boas da vida 🌸\nBem-vindo ao meu feed!',
    'Foco nos objetivos e mente positiva 🚀'
  ];

  const bioSelected = bios[seed % bios.length];

  return {
    handle: cleanHandle || 'usuario',
    name: formattedName,
    bio: bioSelected,
    avatarUrl: '',
    followersCount: followersBase,
    followingCount: followingBase,
    postsCount: postsBase,
    isVerified,
    isPrivate,
    category: isPrivate ? 'Conta Privada' : 'Perfil Pessoal'
  };
}
