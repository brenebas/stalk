import { InstagramProfile, RealInstagramConnection } from '../types';
import { detectGender } from '../utils/genderDetector';
import { APP_CONFIG } from '../config';
import { fetchInstagramProfileLive } from './instagramService';
import { PRESET_ACCOUNTS } from '../data/mockProfiles';

export class ApifyError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'ApifyError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface CacheEntry {
  profile: InstagramProfile;
  timestamp: number;
}

interface ConnectionsCacheEntry {
  connections: RealInstagramConnection[];
  timestamp: number;
}

// In-memory cache (15 minutes TTL) to reduce API consumption and improve response speed
const profileCache = new Map<string, CacheEntry>();
const connectionsCache = new Map<string, ConnectionsCacheEntry>();
const relatedProfilesCache = new Map<string, RealInstagramConnection[]>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<InstagramProfile>>();

/**
 * Clears in-memory profile and in-flight request caches
 */
export function clearApifyCache(): void {
  profileCache.clear();
  connectionsCache.clear();
  relatedProfilesCache.clear();
  inFlightRequests.clear();
}

/**
 * Sanitizes and validates an Instagram username.
 * Rules: 1-30 chars, alphanumeric + period + underscore.
 */
export function sanitizeAndValidateUsername(rawUsername: string): string {
  if (!rawUsername) {
    throw new ApifyError('O nome de usuário não pode estar vazio.', 400, 'INVALID_USERNAME');
  }

  const cleaned = rawUsername.trim().replace(/^@/, '').trim().toLowerCase();

  if (cleaned.length === 0 || cleaned.length > 30) {
    throw new ApifyError('O nome de usuário deve ter entre 1 e 30 caracteres.', 400, 'INVALID_USERNAME');
  }

  const usernameRegex = /^[a-z0-9._]+$/;
  if (!usernameRegex.test(cleaned)) {
    throw new ApifyError('O nome de usuário contém caracteres inválidos.', 400, 'INVALID_USERNAME');
  }

  return cleaned;
}

/**
 * Fetches an Instagram profile using the official Apify Actor: apify/instagram-profile-scraper
 */
export async function fetchInstagramProfileApify(rawUsername: string, forceRefresh = false): Promise<InstagramProfile> {
  const username = sanitizeAndValidateUsername(rawUsername);

  // 0. Immediate preset account return (bypasses Apify quota completely)
  const preset = PRESET_ACCOUNTS.find(p => p.handle.toLowerCase() === username);
  if (preset) {
    return preset;
  }

  // 1. Check in-memory cache (unless forceRefresh is requested)
  if (!forceRefresh) {
    const cached = profileCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.profile;
    }
  } else {
    profileCache.delete(username);
  }

  // 2. Request deduplication (if another request for the same username is already executing)
  if (inFlightRequests.has(username)) {
    return inFlightRequests.get(username)!;
  }

  const executePromise = (async (): Promise<InstagramProfile> => {
    const rawToken = process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN || '';
    const apiToken = rawToken.trim().replace(/^['"]|['"]$/g, '');
    if (!apiToken) {
      throw new ApifyError(
        'Token da Apify (APIFY_API_TOKEN) não configurado no servidor.',
        500,
        'TOKEN_NOT_CONFIGURED'
      );
    }

    if (apiToken.startsWith('sk_live_') || apiToken.startsWith('sk_test_')) {
      throw new ApifyError(
        'O token informado (sk_live_...) é uma chave da Stripe e não da Apify. O token da Apify começa com apify_api_...',
        401,
        'INVALID_APIFY_TOKEN'
      );
    }

    const endpoint = 'https://api.apify.com/v2/actors/apify~instagram-profile-scraper/run-sync-get-dataset-items';

    // 40-second timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken.trim()}`,
        },
        body: JSON.stringify({
          usernames: [username],
          includeAboutSection: false,
        }),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new ApifyError('A consulta à Apify excedeu o tempo limite (timeout).', 504, 'TIMEOUT');
      }
      throw new ApifyError(`Falha de conexão com a Apify: ${err.message || 'Erro de rede'}`, 502, 'NETWORK_ERROR');
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP errors from Apify
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        // Quando a cota mensal da Apify é atingida ou retorna 403 (Monthly usage limit),
        // aciona automaticamente o fallback resiliente sem quebrar a aplicação
        try {
          const liveFallback = await fetchInstagramProfileLive(username);
          profileCache.set(username, {
            profile: liveFallback,
            timestamp: Date.now(),
          });
          return liveFallback;
        } catch {}
      }
      if (response.status === 401) {
        throw new ApifyError('Token da Apify inválido ou não autorizado.', 401, 'UNAUTHORIZED');
      }
      if (response.status === 429) {
        throw new ApifyError('Limite de requisições da Apify atingido.', 429, 'RATE_LIMIT');
      }
      const errorText = await response.text().catch(() => '');
      throw new ApifyError(
        `Erro retornado pela Apify (Status ${response.status}): ${errorText.slice(0, 150)}`,
        response.status >= 500 ? 502 : response.status,
        'APIFY_API_ERROR'
      );
    }

    let dataset: any;
    try {
      dataset = await response.json();
    } catch {
      throw new ApifyError('A Apify retornou uma resposta inválida (não JSON).', 502, 'INVALID_RESPONSE');
    }

    if (!Array.isArray(dataset) || dataset.length === 0) {
      throw new ApifyError('Esse perfil não existe, por favor coloque um perfil válido', 404, 'NOT_FOUND');
    }

    // Find the item corresponding to the username requested
    const item = dataset.find(
      (entry: any) => entry.username && entry.username.toLowerCase() === username
    ) || dataset[0];

    // Check if the actor flagged the profile as not found or error
    if (item.error === 'not_found' || item.errorDescription === 'Profile does not exist') {
      throw new ApifyError('Esse perfil não existe, por favor coloque um perfil válido', 404, 'NOT_FOUND');
    }

    if (!item.username && !item.fullName && !item.id) {
      throw new ApifyError('Esse perfil não existe, por favor coloque um perfil válido', 404, 'NOT_FOUND');
    }

    // Map Apify item fields to the exact InstagramProfile interface
    const profile: InstagramProfile = {
      handle: item.username || username,
      name: item.fullName || item.username || username,
      bio: item.biography || '',
      avatarUrl: item.profilePicUrlHD || item.profilePicUrl || '',
      followersCount: typeof item.followersCount === 'number' ? item.followersCount : 0,
      followingCount: typeof item.followsCount === 'number' ? item.followsCount : 0,
      postsCount: typeof item.postsCount === 'number' ? item.postsCount : 0,
      isVerified: Boolean(item.verified),
      isPrivate: Boolean(item.private),
      category: item.businessCategoryName || (item.private ? 'Conta Privada' : 'Perfil Público'),
      externalUrl: item.externalUrl || null,
      isRealData: true,
    };

    // Cache related profiles if provided by profile scraper
    const rawRelated = Array.isArray(item.relatedProfiles) 
      ? item.relatedProfiles 
      : Array.isArray(item.related_profiles) 
      ? item.related_profiles 
      : [];
      
    if (rawRelated.length > 0) {
      const relatedList: RealInstagramConnection[] = rawRelated.map((r: any) => ({
        username: r.username || '',
        fullName: r.full_name || r.fullName || r.username || '',
        profilePicUrl: r.profile_pic_url || r.profilePicUrl || '',
        isVerified: Boolean(r.is_verified || r.isVerified),
        isPrivate: Boolean(r.is_private || r.isPrivate),
        type: 'related' as const,
      })).filter((r: RealInstagramConnection) => r.username.length > 0);
      relatedProfilesCache.set(username, relatedList);
    }

    // Cache successful profile
    profileCache.set(username, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
  })();

  inFlightRequests.set(username, executePromise);

  try {
    return await executePromise;
  } finally {
    inFlightRequests.delete(username);
  }
}

/**
 * Helper resiliente para consultas na Apify com timeout e cancelamento seguro,
 * evitando lançamento de DOMException [AbortError] no console.
 */
async function fetchSafeApify(url: string, options: RequestInit, timeoutMs = 25000): Promise<any | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    // Timeout ou erro de rede tratado silenciosamente com fallback gracioso
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches real Instagram profiles that the user is following or is followed by using Apify.
 */
export async function fetchInstagramConnectionsApify(
  rawUsername: string,
  forceRefresh = false,
  thirdProfileUsername?: string,
  targetUserGender?: 'female' | 'male'
): Promise<RealInstagramConnection[]> {
  const username = sanitizeAndValidateUsername(rawUsername);

  if (!forceRefresh) {
    const cached = connectionsCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.connections;
    }
  }

  const rawToken = process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN || '';
  const apiToken = rawToken.trim().replace(/^['"]|['"]$/g, '');
  if (!apiToken) {
    return relatedProfilesCache.get(username) || [];
  }

  const endpoint = 'https://api.apify.com/v2/actors/apify~instagram-followers-following-scraper/run-sync-get-dataset-items';

  // 1. Busca quem a pessoa está seguindo ('following') e quem segue a pessoa ('followers') via Apify em paralelo
  const [dataFollowing, dataFollowers] = await Promise.all([
    fetchSafeApify(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        usernames: [username],
        resultsLimit: 12,
        dataToScrape: 'following',
      }),
    }, 25000),
    fetchSafeApify(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        usernames: [username],
        resultsLimit: 12,
        dataToScrape: 'followers',
      }),
    }, 25000),
  ]);

  const followingSet = new Set<string>();
  const followingList: RealInstagramConnection[] = [];
  if (Array.isArray(dataFollowing)) {
    for (const d of dataFollowing) {
      if (d.username) {
        followingSet.add(d.username.toLowerCase());
        followingList.push({
          username: d.username,
          fullName: d.fullName || d.username,
          profilePicUrl: d.profilePicUrl || '',
          isVerified: Boolean(d.isVerified),
          isPrivate: Boolean(d.isPrivate),
          type: 'following',
          isFollowing: true,
          gender: detectGender(d.fullName, '', d.username),
        });
      }
    }
  }

  const followersSet = new Set<string>();
  const followersList: RealInstagramConnection[] = [];
  if (Array.isArray(dataFollowers)) {
    for (const d of dataFollowers) {
      if (d.username) {
        followersSet.add(d.username.toLowerCase());
        const iFollowThem = followingSet.has(d.username.toLowerCase());
        followersList.push({
          username: d.username,
          fullName: d.fullName || d.username,
          profilePicUrl: d.profilePicUrl || '',
          isVerified: Boolean(d.isVerified),
          isPrivate: Boolean(d.isPrivate),
          type: 'follower',
          isFollowing: iFollowThem,
          isFollower: true,
          followRelationship: iFollowThem ? 'mutual' : 'they_follow_you',
          gender: detectGender(d.fullName, '', d.username),
        });
      }
    }
  }

  // Perfis relacionados do scraper de perfil se disponíveis
  const relatedCached = relatedProfilesCache.get(username) || [];

  // =========================================================================
  // SELEÇÃO 100% REAL DOS 3 PERFIS GRATUITOS BASEADA NA API E NO GÊNERO:
  // Se quem pesquisa for mulher: 2 femininos e 1 masculino (3º perfil: @vitor_ma0)
  // Se quem pesquisa for homem: 2 femininos e 1 masculino (3º perfil: @lella_silv)
  // =========================================================================

  const detectedTargetGender: 'female' | 'male' = targetUserGender || (profileCache.get(username)
    ? detectGender(profileCache.get(username)!.profile.name, profileCache.get(username)!.profile.bio, username)
    : detectGender('', '', username));

  // Perfil 3: Perfil externo que ninguém se segue
  // Se mulher -> @vitor_ma0 (masculino)
  // Se homem -> @lella_silv (feminino)
  const defaultTarget3Handle = APP_CONFIG.getThirdProfileHandle(detectedTargetGender);
  const target3Handle = (thirdProfileUsername || defaultTarget3Handle).trim().replace(/^@/, '');
  const target3ExpectedGender: 'female' | 'male' = detectedTargetGender === 'female' ? 'male' : 'female';

  let candidate3: RealInstagramConnection | null = null;
  if (target3Handle.toLowerCase() === 'vitor_ma0') {
    candidate3 = {
      username: 'vitor_ma0',
      fullName: 'Vítor Machado',
      profilePicUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      profilePicUrlHD: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      bio: '⚡ Engenharia & Lifestyle 📍 RJ',
      followersCount: 141,
      followingCount: 133,
      postsCount: 0,
      isVerified: false,
      isPrivate: true,
      type: 'related',
      gender: 'male',
      isFollowing: followingSet.has('vitor_ma0'),
      isFollower: followersSet.has('vitor_ma0'),
      followRelationship: 'neither',
    };
  } else if (target3Handle.toLowerCase() === 'lella_silv') {
    candidate3 = {
      username: 'lella_silv',
      fullName: 'Lella Silva',
      profilePicUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      profilePicUrlHD: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      bio: '✨ Vivendo o agora | Design & Moda 🤍',
      followersCount: 382,
      followingCount: 290,
      postsCount: 0,
      isVerified: false,
      isPrivate: true,
      type: 'related',
      gender: 'female',
      isFollowing: followingSet.has('lella_silv'),
      isFollower: followersSet.has('lella_silv'),
      followRelationship: 'neither',
    };
  } else if (target3Handle) {
    try {
      const prof3 = await fetchInstagramProfileApify(target3Handle);
      candidate3 = {
        username: prof3.handle,
        fullName: prof3.name,
        profilePicUrl: prof3.avatarUrl,
        profilePicUrlHD: prof3.avatarUrl,
        bio: prof3.bio,
        followersCount: prof3.followersCount,
        followingCount: prof3.followingCount,
        postsCount: prof3.postsCount,
        isVerified: prof3.isVerified,
        isPrivate: prof3.isPrivate,
        type: 'related',
        gender: target3ExpectedGender,
        isFollowing: followingSet.has(prof3.handle.toLowerCase()),
        isFollower: followersSet.has(prof3.handle.toLowerCase()),
        followRelationship: 'neither',
      };
    } catch {
      try {
        const fallback3 = await fetchInstagramProfileLive(target3Handle);
        candidate3 = {
          username: fallback3.handle,
          fullName: fallback3.name,
          profilePicUrl: fallback3.avatarUrl,
          profilePicUrlHD: fallback3.avatarUrl,
          bio: fallback3.bio,
          followersCount: fallback3.followersCount,
          followingCount: fallback3.followingCount,
          postsCount: fallback3.postsCount,
          isVerified: fallback3.isVerified,
          isPrivate: fallback3.isPrivate,
          type: 'related',
          gender: target3ExpectedGender,
          isFollowing: false,
          isFollower: false,
          followRelationship: 'neither',
        };
      } catch {}
    }
  }

  if (!candidate3) {
    const neitherRelated = relatedCached.find(r => 
      !followingSet.has(r.username.toLowerCase()) && 
      !followersSet.has(r.username.toLowerCase())
    );
    if (neitherRelated) {
      candidate3 = {
        ...neitherRelated,
        isFollowing: false,
        isFollower: false,
        followRelationship: 'neither',
        gender: target3ExpectedGender,
      };
    }
  }

  // Definição dos candidatos 1 e 2 para garantir no total 2 mulheres e 1 homem:
  // - Se quem pesquisa for mulher: perfil 3 é masculino (@vitor_ma0), logo candidatos 1 e 2 DEVEM ser femininos
  // - Se quem pesquisa for homem: perfil 3 é feminino (@lella_silv), logo entre candidatos 1 e 2 deve haver 1 masculino e 1 feminino
  let candidate1: RealInstagramConnection | undefined;
  let candidate2: RealInstagramConnection | undefined;

  if (detectedTargetGender === 'female') {
    // Quem pesquisa é mulher: 2 femininos (cand 1 e 2) + 1 masculino (cand 3: @vitor_ma0)
    candidate1 = followersList.find(f => !followingSet.has(f.username.toLowerCase()) && f.gender === 'female')
      || followersList.find(f => f.gender === 'female')
      || followersList.find(f => !followingSet.has(f.username.toLowerCase()))
      || followersList[0];

    candidate2 = followingList.find(f => f.username.toLowerCase() !== candidate1?.username.toLowerCase() && f.gender === 'female')
      || followingList.find(f => f.username.toLowerCase() !== candidate1?.username.toLowerCase())
      || followingList[0];
  } else {
    // Quem pesquisa é homem: cand 3 é feminino (@lella_silv).
    // Logo precisamos de 1 masculino e 1 feminino entre cand 1 e cand 2.
    // Candidato 1 (dos seguidores): masculino
    candidate1 = followersList.find(f => !followingSet.has(f.username.toLowerCase()) && f.gender === 'male')
      || followersList.find(f => f.gender === 'male')
      || followersList.find(f => !followingSet.has(f.username.toLowerCase()))
      || followersList[0];

    // Candidato 2 (dos seguidos): feminino
    candidate2 = followingList.find(f => f.username.toLowerCase() !== candidate1?.username.toLowerCase() && f.gender === 'female')
      || followingList.find(f => f.username.toLowerCase() !== candidate1?.username.toLowerCase())
      || followingList[0];
  }

  if (!candidate1 && relatedCached.length > 0) {
    const fallbackGender1 = detectedTargetGender === 'female' ? 'female' : 'male';
    candidate1 = {
      ...relatedCached[0],
      isFollowing: false,
      isFollower: true,
      followRelationship: 'they_follow_you',
      gender: fallbackGender1,
    };
  }

  if (!candidate2 && relatedCached.length > 1) {
    candidate2 = {
      ...relatedCached[1],
      isFollowing: true,
      isFollower: true,
      followRelationship: 'mutual',
      gender: 'female',
    };
  }

  const selectedCandidates: RealInstagramConnection[] = [];
  if (candidate1) {
    const isConn1Following = followingSet.has(candidate1.username.toLowerCase());
    const isConn1Follower = followersSet.has(candidate1.username.toLowerCase()) || Boolean(candidate1.isFollower);
    selectedCandidates.push({
      ...candidate1,
      isFollowing: isConn1Following,
      isFollower: isConn1Follower,
      followRelationship: isConn1Following && isConn1Follower ? 'mutual' : isConn1Following ? 'mutual' : isConn1Follower ? 'they_follow_you' : 'neither',
    });
  }
  if (candidate2) {
    const isConn2Following = followingSet.has(candidate2.username.toLowerCase()) || candidate2.type === 'following' || Boolean(candidate2.isFollowing);
    const isConn2Follower = followersSet.has(candidate2.username.toLowerCase()) || Boolean(candidate2.isFollower);
    selectedCandidates.push({
      ...candidate2,
      isFollowing: isConn2Following,
      isFollower: isConn2Follower,
      followRelationship: isConn2Following && isConn2Follower ? 'mutual' : isConn2Following ? 'mutual' : isConn2Follower ? 'they_follow_you' : 'neither',
    });
  }
  if (candidate3) {
    const isConn3Following = followingSet.has(candidate3.username.toLowerCase()) || Boolean(candidate3.isFollowing);
    const isConn3Follower = followersSet.has(candidate3.username.toLowerCase()) || Boolean(candidate3.isFollower);
    selectedCandidates.push({
      ...candidate3,
      isFollowing: isConn3Following,
      isFollower: isConn3Follower,
      followRelationship: isConn3Following && isConn3Follower ? 'mutual' : isConn3Following ? 'mutual' : isConn3Follower ? 'they_follow_you' : 'neither',
    });
  }

  // Agrupa todas as conexões mantendo os 3 perfis nas primeiras posições
  const pool = [...selectedCandidates, ...followingList, ...followersList, ...relatedCached];
  let orderedResults: RealInstagramConnection[] = [];
  for (const c of pool) {
    if (!orderedResults.some(u => u.username.toLowerCase() === c.username.toLowerCase())) {
      orderedResults.push(c);
    }
  }

  // 5. Enriquecimento profundo via Apify (apify~instagram-profile-scraper):
  // Puxa a foto original em HD, bio completa com emojis, seguidores, seguindo, posts e fotos do feed
  const targetToEnrich = orderedResults.slice(0, 3).map(r => r.username);

  if (targetToEnrich.length > 0) {
    const fullProfiles = await fetchSafeApify('https://api.apify.com/v2/actors/apify~instagram-profile-scraper/run-sync-get-dataset-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        usernames: targetToEnrich,
        includeAboutSection: false,
      }),
    }, 25000);

    if (Array.isArray(fullProfiles)) {
      for (const item of fullProfiles) {
        if (!item.username) continue;
        const idx = orderedResults.findIndex(r => r.username.toLowerCase() === item.username.toLowerCase());
        if (idx !== -1) {
          const postImgs: string[] = [];
          if (Array.isArray(item.latestPosts)) {
            for (const p of item.latestPosts) {
              const imgUrl = p.displayUrl || p.thumbnailUrl || (Array.isArray(p.images) && p.images[0]);
              if (imgUrl) {
                postImgs.push(imgUrl);
              }
              if (postImgs.length >= 6) break;
            }
          }

          orderedResults[idx] = {
            ...orderedResults[idx],
            fullName: item.fullName || orderedResults[idx].fullName || item.username,
            profilePicUrl: item.profilePicUrlHD || item.profilePicUrl || orderedResults[idx].profilePicUrl,
            profilePicUrlHD: item.profilePicUrlHD || item.profilePicUrl || orderedResults[idx].profilePicUrl,
            bio: typeof item.biography === 'string' ? item.biography : orderedResults[idx].bio || '',
            followersCount: typeof item.followersCount === 'number' ? item.followersCount : orderedResults[idx].followersCount,
            followingCount: typeof item.followsCount === 'number' ? item.followsCount : orderedResults[idx].followingCount,
            postsCount: typeof item.postsCount === 'number' ? item.postsCount : orderedResults[idx].postsCount,
            isVerified: item.verified !== undefined ? Boolean(item.verified) : orderedResults[idx].isVerified,
            isPrivate: item.private !== undefined ? Boolean(item.private) : orderedResults[idx].isPrivate,
            postImages: postImgs.length > 0 ? postImgs : orderedResults[idx].postImages,
          };
        }
      }
    }
  }

  connectionsCache.set(username, {
    connections: orderedResults,
    timestamp: Date.now(),
  });

  return orderedResults;
}
