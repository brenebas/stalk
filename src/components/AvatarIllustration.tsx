import React, { useState, useEffect } from 'react';

interface AvatarIllustrationProps {
  seed: string;
  name?: string;
  avatarUrl?: string;
  gender?: 'female' | 'male';
  gradientClass?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isBlurred?: boolean;
  hasStoryRing?: boolean;
}

export const AvatarIllustration: React.FC<AvatarIllustrationProps> = ({
  seed,
  name = 'User',
  avatarUrl,
  gender = 'female',
  size = 'md',
  isBlurred = false,
  hasStoryRing = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const sizeMap = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-20 h-20 text-base',
    xl: 'w-24 h-24 text-xl',
  };

  const safeSeed = seed || name || 'user';
  const initial = (name ? name.charAt(0) : safeSeed.charAt(0)).toUpperCase();

  // Pick deterministic palette based on seed
  const palettes = [
    { bg: 'bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400', skin: '#fcd34d', hair: '#1f2937' },
    { bg: 'bg-gradient-to-tr from-violet-500 via-purple-500 to-indigo-500', skin: '#fed7aa', hair: '#451a03' },
    { bg: 'bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600', skin: '#fde047', hair: '#172554' },
    { bg: 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500', skin: '#fbcfe8', hair: '#312e81' },
    { bg: 'bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500', skin: '#fde68a', hair: '#0f172a' },
  ];

  let sum = 0;
  for (let i = 0; i < safeSeed.length; i++) sum += safeSeed.charCodeAt(i);
  const palette = palettes[sum % palettes.length];

  // Resolve proxy URL safely without double-wrapping
  const resolveAvatarUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('/api/proxy-image')) {
      return url;
    }
    if (
      url.includes('cdninstagram.com') ||
      url.includes('fbcdn.net') ||
      url.includes('fbsbx.com') ||
      url.includes('instagram.com')
    ) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const proxyAvatarUrl = resolveAvatarUrl(avatarUrl);
  const hasRealPhoto = Boolean(proxyAvatarUrl && !imgFailed);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        hasStoryRing
          ? 'p-[2.5px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]'
          : ''
      }`}
    >
      {/* Inner white separator gap for authentic Instagram story ring */}
      <div
        className={`${
          hasStoryRing ? 'p-[2px] bg-white rounded-full' : ''
        } flex items-center justify-center`}
      >
        <div
          className={`relative overflow-hidden rounded-full ${sizeMap[size]} ${palette.bg} flex items-center justify-center shadow-inner border border-neutral-200/40 select-none bg-neutral-100`}
        >
          {hasRealPhoto ? (
            <img
              src={proxyAvatarUrl}
              alt={name}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={() => setImgFailed(true)}
              className={`w-full h-full object-cover rounded-full transition-all duration-300 ${
                isBlurred ? 'filter blur-[1.5px] scale-105' : ''
              }`}
              loading="lazy"
            />
          ) : (
            /* Stylized vector character silhouette */
            <svg
              viewBox="0 0 100 100"
              className={`w-full h-full object-cover ${isBlurred ? 'filter blur-[1.5px]' : ''}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background aura */}
              <circle cx="50" cy="50" r="50" fill="currentColor" className="text-black/10" />

              {/* Head & shoulders silhouette */}
              {gender === 'female' ? (
                <g>
                  {/* Long Hair Backing */}
                  <path
                    d="M26 44C26 28 35 15 50 15C65 15 74 28 74 44C74 58 71 70 70 82C64 85 58 87 50 87C42 87 36 85 30 82C29 70 26 58 26 44Z"
                    fill={palette.hair}
                  />
                  {/* Shoulders / Torso */}
                  <path
                    d="M22 100C22 84 34 76 50 76C66 76 78 84 78 100Z"
                    fill="#ffffff"
                    fillOpacity="0.85"
                  />
                  {/* Neck */}
                  <rect x="44" y="55" width="12" height="15" rx="6" fill={palette.skin} />
                  {/* Head Oval */}
                  <ellipse cx="50" cy="46" rx="18" ry="21" fill={palette.skin} />
                  {/* Hair Front Fringe */}
                  <path
                    d="M32 38C34 26 42 22 50 22C58 22 66 26 68 38C61 31 52 30 50 34C48 30 39 31 32 38Z"
                    fill={palette.hair}
                  />
                </g>
              ) : (
                <g>
                  {/* Short Hair Backing */}
                  <path
                    d="M30 38C30 25 38 18 50 18C62 18 70 25 70 38C70 42 70 46 68 50C62 48 58 48 50 48C42 48 38 48 32 50C30 46 30 42 30 38Z"
                    fill={palette.hair}
                  />
                  {/* Shoulders / Torso */}
                  <path
                    d="M18 100C18 80 32 72 50 72C68 72 82 80 82 100Z"
                    fill="#ffffff"
                    fillOpacity="0.88"
                  />
                  {/* Neck */}
                  <rect x="43" y="54" width="14" height="16" rx="7" fill={palette.skin} />
                  {/* Head */}
                  <ellipse cx="50" cy="46" rx="19" ry="22" fill={palette.skin} />
                  {/* Hair style modern fade */}
                  <path
                    d="M30 36C32 24 40 20 50 20C60 20 68 24 70 36C65 30 57 28 50 29C43 28 35 30 30 36Z"
                    fill={palette.hair}
                  />
                </g>
              )}

              {/* Initial badge watermark in corner */}
              <circle cx="78" cy="24" r="14" fill="#000000" fillOpacity="0.25" />
              <text
                x="78"
                y="29"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="12"
                fontWeight="bold"
                fontFamily="system-ui"
              >
                {initial}
              </text>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
