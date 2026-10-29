import React, { useState } from 'react';
import { Radar, Loader2 } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface StepInputProps {
  onSubmitHandle: (handle: string) => void;
  isLoading?: boolean;
  errorMessage?: string;
  onClearError?: () => void;
}

export const StepInput: React.FC<StepInputProps> = ({
  onSubmitHandle,
  isLoading = false,
  errorMessage = '',
  onClearError,
}) => {
  const [handleInput, setHandleInput] = useState('');
  const [localErrorMsg, setLocalErrorMsg] = useState('');

  const activeError = localErrorMsg || errorMessage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const clean = handleInput.replace(/^@/, '').trim();
    if (!clean) {
      setLocalErrorMsg('Esse perfil não existe, por favor coloque um perfil válido');
      return;
    }
    soundFX.playTick();
    setLocalErrorMsg('');
    if (onClearError) onClearError();
    onSubmitHandle(clean);
  };

  return (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-8 space-y-6">
      {/* Centered Brand & Action Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center mx-auto text-white shadow-xl shadow-pink-500/20">
          <Radar className="w-8 h-8 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Quem visitou seu perfil?
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 max-w-sm mx-auto">
            Identifique quem abriu seus stories, visitou seu perfil e salvou suas fotos nos últimos 7 dias.
          </p>
        </div>
      </div>

      {/* Clean Single Card Input (White Theme) */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl p-5 sm:p-7 shadow-xl shadow-neutral-200/40 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="insta-handle" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Nome de Usuário (@)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 font-bold text-base">
                @
              </span>
              <input
                id="insta-handle"
                type="text"
                value={handleInput}
                disabled={isLoading}
                onChange={(e) => {
                  setHandleInput(e.target.value);
                  if (localErrorMsg) setLocalErrorMsg('');
                  if (onClearError) onClearError();
                }}
                placeholder="exemplo: seu.perfil"
                autoComplete="off"
                className="w-full pl-9 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white focus:border-transparent transition-all disabled:opacity-60"
              />
            </div>
            {activeError && (
              <p className="text-rose-600 text-xs mt-1.5 font-medium">
                {activeError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white text-base bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 shadow-xl shadow-rose-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Consultando API do Instagram...</span>
              </div>
            ) : (
              <span>Iniciar análise</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
