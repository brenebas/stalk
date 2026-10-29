import React, { useState } from 'react';
import { FunnelStep, InstagramProfile, ScanMetrics, StalkerVisitor } from './types';
import { PRESET_ACCOUNTS, getOrCreateInstagramProfile } from './data/mockProfiles';
import { generateScanMetrics, generateStalkersList } from './data/stalkersData';
import { Navbar } from './components/Navbar';
import { StepInput } from './components/StepInput';
import { StepConfirmProfile } from './components/StepConfirmProfile';
import { StepScanning } from './components/StepScanning';
import { StepResults } from './components/StepResults';
import { CheckoutModal } from './components/CheckoutModal';
import { Footer } from './components/Footer';

export default function App() {
  const [currentStep, setCurrentStep] = useState<FunnelStep>('input');
  const [currentProfile, setCurrentProfile] = useState<InstagramProfile>(PRESET_ACCOUNTS[0]);
  const initialMetrics = generateScanMetrics(
    PRESET_ACCOUNTS[0].handle,
    PRESET_ACCOUNTS[0].followersCount,
    PRESET_ACCOUNTS[0].isPrivate
  );
  const [metrics, setMetrics] = useState<ScanMetrics>(initialMetrics);
  const [stalkers, setStalkers] = useState<StalkerVisitor[]>(generateStalkersList(false, initialMetrics.visitorsToday));
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSearchingProfile, setIsSearchingProfile] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Handlers
  const handleSubmitHandle = async (rawHandle: string) => {
    const clean = rawHandle.replace(/^@/, '').trim();
    setIsSearchingProfile(true);
    setSearchError('');

    try {
      // Connect to the official Apify Instagram backend API route
      const response = await fetch(`/api/instagram/profile?username=${encodeURIComponent(clean)}`);
      
      if (response.ok) {
        const liveData: InstagramProfile = await response.json();
        const liveMetrics = generateScanMetrics(
          liveData.handle,
          liveData.followersCount,
          liveData.isPrivate
        );
        setCurrentProfile(liveData);
        setMetrics(liveMetrics);
        setStalkers(generateStalkersList(false, liveMetrics.visitorsToday));
        setIsUnlocked(false);
        setSearchError('');
        setCurrentStep('confirm_profile');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (response.status === 404) {
        setSearchError('Esse perfil não existe, por favor coloque um perfil válido');
      } else {
        // Fallback resiliente caso o servidor retorne status de indisponibilidade
        const { getOrCreateInstagramProfile } = await import('./data/mockProfiles');
        const fallbackData = getOrCreateInstagramProfile(clean);
        const fallbackMetrics = generateScanMetrics(
          fallbackData.handle,
          fallbackData.followersCount,
          fallbackData.isPrivate
        );
        setCurrentProfile(fallbackData);
        setMetrics(fallbackMetrics);
        setStalkers(generateStalkersList(false, fallbackMetrics.visitorsToday));
        setIsUnlocked(false);
        setSearchError('');
        setCurrentStep('confirm_profile');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.warn('Erro de conexão ao consultar /api/instagram/profile, ativando fallback resiliente:', err);
      try {
        const { getOrCreateInstagramProfile } = await import('./data/mockProfiles');
        const fallbackData = getOrCreateInstagramProfile(clean);
        const fallbackMetrics = generateScanMetrics(
          fallbackData.handle,
          fallbackData.followersCount,
          fallbackData.isPrivate
        );
        setCurrentProfile(fallbackData);
        setMetrics(fallbackMetrics);
        setStalkers(generateStalkersList(false, fallbackMetrics.visitorsToday));
        setIsUnlocked(false);
        setSearchError('');
        setCurrentStep('confirm_profile');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        setSearchError('Esse perfil não existe, por favor coloque um perfil válido');
      }
    } finally {
      setIsSearchingProfile(false);
    }
  };

  const handleConfirmProfile = () => {
    setCurrentStep('scanning');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishScan = () => {
    setCurrentStep('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setCurrentStep('input');
    setIsUnlocked(false);
    setStalkers(generateStalkersList(false, metrics.visitorsToday));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUnlockSuccess = () => {
    setIsUnlocked(true);
    setStalkers(generateStalkersList(true, metrics.visitorsToday));
  };

  const handleToggleSimulateUnlock = () => {
    const nextState = !isUnlocked;
    setIsUnlocked(nextState);
    setStalkers(generateStalkersList(nextState, metrics.visitorsToday));
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* App Interface Top Bar */}
      <Navbar
        onReset={handleReset}
        hasActiveSearch={currentStep !== 'input'}
        isUnlocked={isUnlocked}
        onOpenUpgrade={() => setIsCheckoutOpen(true)}
      />

      {/* Main App Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-2.5 sm:px-6 py-4 sm:py-8 flex flex-col justify-center bg-black text-white">
        {/* Dynamic Funnel Workflow */}
        {currentStep === 'input' && (
          <div className="animate-in fade-in duration-200">
            <StepInput
              onSubmitHandle={handleSubmitHandle}
              isLoading={isSearchingProfile}
              errorMessage={searchError}
              onClearError={() => setSearchError('')}
            />
          </div>
        )}

        {currentStep === 'confirm_profile' && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <StepConfirmProfile
              profile={currentProfile}
              onConfirm={handleConfirmProfile}
              onBack={() => setCurrentStep('input')}
            />
          </div>
        )}

        {currentStep === 'scanning' && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <StepScanning
              profile={currentProfile}
              metrics={metrics}
              onFinishScan={handleFinishScan}
            />
          </div>
        )}

        {currentStep === 'results' && (
          <div className="animate-in fade-in duration-200">
            <StepResults
              profile={currentProfile}
              metrics={metrics}
              stalkers={stalkers}
              isUnlocked={isUnlocked}
              onOpenCheckout={() => setIsCheckoutOpen(true)}
              onToggleSimulateUnlock={handleToggleSimulateUnlock}
              onReset={handleReset}
            />
          </div>
        )}
      </main>

      {/* In-App VIP Upgrade Dialog */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        profile={currentProfile}
        onSuccessUnlock={handleUnlockSuccess}
      />



      {/* Minimal App Footer */}
      <Footer />
    </div>
  );
}
