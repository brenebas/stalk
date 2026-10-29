import React from 'react';
import { Radar } from 'lucide-react';

interface NavbarProps {
  onReset: () => void;
  hasActiveSearch?: boolean;
  isUnlocked?: boolean;
  onOpenUpgrade?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onReset }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-black/90 backdrop-blur-md border-b border-neutral-900 shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        {/* Brand Zone */}
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 text-left cursor-pointer group whitespace-nowrap shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-white block leading-none">
            StalkRadar
          </span>
        </button>
      </div>
    </header>
  );
};
