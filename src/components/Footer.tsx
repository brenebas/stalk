import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-neutral-900 bg-black py-4 px-4 text-center text-xs text-neutral-400">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-neutral-300">StalkRadar v4.2 · Servidores Operacionais</span>
        </div>
        <p className="text-neutral-500">
          Aplicação independente para análise de metadados públicos.
        </p>
      </div>
    </footer>
  );
};
