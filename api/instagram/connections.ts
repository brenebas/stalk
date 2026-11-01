export interface RealInstagramConnection {
  username: string;
  fullName: string;
  profilePicUrl: string;
  profilePicUrlHD?: string;
  isPrivate?: boolean;
  isVerified?: boolean;
  followRelationship?: 'mutual' | 'they_follow_you' | 'neither';
  isFollowing?: boolean;
  isFollower?: boolean;
  gender?: 'female' | 'male';
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  postImages?: string[];
}

function cleanUsername(raw: string): string {
  if (!raw) return '';
  return raw.trim().replace(/^@/, '').trim().toLowerCase();
}

function toProxyUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/api/proxy-image')) return url;
  if (
    url.includes('cdninstagram.com') ||
    url.includes('fbcdn.net') ||
    url.includes('fbsbx.com') ||
    url.includes('instagram.com')
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUsername =
      (req.query?.username as string) ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('username') : '') ||
      '';

    const thirdProfile =
      (req.query?.thirdProfile as string) ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('thirdProfile') : '') ||
      '';

    const gender =
      ((req.query?.gender as string) ||
        (req.url ? new URL(req.url, 'http://localhost').searchParams.get('gender') : '')) as 'female' | 'male' | undefined;

    const username = cleanUsername(rawUsername);

    if (!username) {
      return res.status(400).json({
        error: 'O parâmetro username é obrigatório.',
        code: 'MISSING_USERNAME',
      });
    }

    const isFemaleTarget = gender === 'female';

    // Perfil 3 externo garantido (vitor_ma0 para mulher, lella_silv para homem)
    const conn3: RealInstagramConnection = isFemaleTarget
      ? {
          username: 'vitor_ma0',
          fullName: 'Vitor M.',
          profilePicUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
          isPrivate: false,
          isVerified: false,
          followRelationship: 'neither',
          isFollowing: false,
          isFollower: false,
          gender: 'male',
          bio: 'Vivendo e aprendendo ⚡',
          followersCount: 890,
          followingCount: 410,
          postsCount: 28,
          postImages: [
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
          ],
        }
      : {
          username: 'lella_silv',
          fullName: 'Lella Silva',
          profilePicUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          isPrivate: false,
          isVerified: false,
          followRelationship: 'neither',
          isFollowing: false,
          isFollower: false,
          gender: 'female',
          bio: '✨ A vida é feita de momentos 🌸 SP',
          followersCount: 1250,
          followingCount: 520,
          postsCount: 54,
          postImages: [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
          ],
        };

    // Perfis 1 e 2:
    // Para mulher: conn1 e conn2 são mulheres (totalizando 2 mulheres e 1 homem com o vitor)
    // Para homem: conn1 é homem, conn2 é mulher (totalizando 2 mulheres e 1 homem com a lella)
    const conn1: RealInstagramConnection = isFemaleTarget
      ? {
          username: 'mariana.costa_',
          fullName: 'Mariana Costa',
          profilePicUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
          isPrivate: false,
          isVerified: false,
          followRelationship: 'they_follow_you',
          isFollowing: false,
          isFollower: true,
          gender: 'female',
          bio: '✨ Vivendo um dia de cada vez 📍 SP',
          followersCount: 642,
          followingCount: 390,
          postsCount: 34,
          postImages: [
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
          ],
        }
      : {
          username: 'gabriel.lima98',
          fullName: 'Gabriel Lima',
          profilePicUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
          isPrivate: false,
          isVerified: false,
          followRelationship: 'they_follow_you',
          isFollowing: false,
          isFollower: true,
          gender: 'male',
          bio: '⚡ Engenharia & Lifestyle 📍 SP',
          followersCount: 520,
          followingCount: 410,
          postsCount: 45,
          postImages: [
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
          ],
        };

    const conn2: RealInstagramConnection = {
      username: 'carol_mendes_rj',
      fullName: 'Carolina Mendes',
      profilePicUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
      isPrivate: false,
      isVerified: false,
      followRelationship: 'mutual',
      isFollowing: true,
      isFollower: true,
      gender: 'female',
      bio: 'Design & Fotografia 📷',
      followersCount: 980,
      followingCount: 640,
      postsCount: 88,
      postImages: [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      ],
    };

    return res.status(200).json({
      connections: [conn1, conn2, conn3],
    });
  } catch (error: any) {
    return res.status(200).json({ connections: [] });
  }
}
