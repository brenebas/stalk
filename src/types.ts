export type FeatureType = 
  | 'profile_visitors' 
  | 'unfollowers' 
  | 'saved_posts' 
  | 'follower_balance';

export type FunnelStep = 
  | 'input' 
  | 'confirm_profile' 
  | 'scanning' 
  | 'results';

export interface InstagramProfile {
  handle: string;
  name: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  category: string;
  externalUrl?: string | null;
  isRealData?: boolean;
}

export interface ScanMetrics {
  visitorsToday: number;
  savedPostsCount: number;
  forwardedDirectCount: number;
  unfollowedVisitingCount: number;
  ghostFollowersPercent: number;
  secretAdmirersCount: number;
  nightStalkersCount: number;
  totalInteractionsLogged: number;
}

export interface StalkerVisitor {
  id: string;
  name: string;
  handle: string;
  maskedHandle: string;
  avatarSeed: string;
  avatarColor: string;
  gender: 'female' | 'male';
  isRevealed: boolean;
  visitsToday: number;
  lastVisitAgo: string;
  frequency: 'Alta' | 'Média' | 'Muito Alta';
  relationshipCategory: 'Ex-Contato' | 'Crush Secreto' | 'Stalker Noturno' | 'Ex-Seguidor' | 'Amigo Próximo' | 'Anônimo';
  curiosityHint: string;
  suspicionScore?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
  commonFriendsCount: number;
  savedPhotosCount?: number;
  storyViewsWithoutFollowing?: number;
  avatarUrl?: string;
  bio?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  mutualFriendsAvatars?: string[];
  mutualFriendsText?: string;
  postImages?: string[];
  followRelationship?: 'they_follow_you' | 'mutual' | 'neither';
  isFollowing?: boolean;
  isFollower?: boolean;
}

export interface RealInstagramConnection {
  username: string;
  fullName: string;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isVerified: boolean;
  isPrivate: boolean;
  type: 'following' | 'follower' | 'related';
  postImages?: string[];
  gender?: 'female' | 'male';
  followRelationship?: 'they_follow_you' | 'mutual' | 'neither';
  isFollowing?: boolean;
  isFollower?: boolean;
}
