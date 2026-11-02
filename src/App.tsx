import React, { useState, useEffect } from 'react';
import { FunnelStep, InstagramProfile, ScanMetrics, StalkerVisitor, RealInstagramConnection } from './types';
import { DEMO_PROFILES, getDemoInstagramProfile } from './data/mockProfiles';
import { generateScanMetrics, generateStalkersList, applyRealConnectionsToStalkers } from './data/stalkersData';
import { Navbar } from './components/Navbar';
import { StepInput } from './components/StepInput';
import { StepConfirmProfile } from './components/StepConfirmProfile';
import { StepScanning } from './components/StepScanning';
import { StepResults } from './components/StepResults';
import { CheckoutModal } from './components/CheckoutModal';
import { Footer } from './components/Footer';
import { soundFX } from './utils/audio';
import { APP_CONFIG } from './config';
import { detectGender } from './utils/genderDetector';

export default function App() {
  const [currentStep, setCurrentStep] = useState<FunnelStep>('input');
  const [currentProfile, setCurrentProfile] = useState<InstagramProfile>(DEMO_PROFILES[0]);
  const initialMetrics = generateScanMetrics(
    DEMO_PROFILES[0].handle,
    DEMO_PROFILES[0].followersCount,
    DEMO_PROFILES[0].isPrivate
  );
  const initialGender = detectGender(DEMO_PROFILES[0].name, DEMO_PROFILES[0].bio, DEMO_PROFILES[0].handle);
  const [metrics, setMetrics] = useState<ScanMetrics>(initialMetrics);
  const [stalkers, setStalkers] = useState<StalkerVisitor[]>(generateStalkersList(false, initialMetrics.visitorsToday, initialGender));
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [realConnections, setRealConnections] = useState<RealInstagramConnection[]>([]);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSearchingProfile, setIsSearchingProfile] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Auto-fetch real connections whenever a real profile changes
  useEffect(() => {
    if (currentProfile?.handle && currentProfile.isRealData) {
      const userGender = detectGender(currentProfile.name, currentProfile.bio, currentProfile.handle);
      const thirdHandle = APP_CONFIG.getThirdProfileHandle(userGender);
      fetch(`/api/instagram/connections?username=${encodeURIComponent(currentProfile.handle)}&thirdProfile=${encodeURIComponent(thirdHandle)}&gender=${userGender}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.connections && Array.isArray(data.connections) && data.connections.length > 0) {
            setRealConnections(data.connections);
            setStalkers((current) => applyRealConnectionsToStalkers(current, data.connections, currentProfile));
          }
        })
        .catch((err) => console.warn('Conexões Apify background info:', err));
    }
  }, [currentProfile?.handle, currentProfile?.isRealData]);

  // Handlers
  const cleanHandle = (raw: string): string => {
    if (!raw) return '';
    let str = raw.trim();
    str = str.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
    str = str.split('?')[0].split('/')[0];
    str = str.replace(/^@+/, '').trim();
    str = str.replace(/\s+/g, '');
    return str.toLowerCase();
  };

  const handleSubmitHandle = async (rawHandle: string) => {
    const clean = cleanHandle(rawHandle);
    if (!clean) {
      setSearchError('Por favor, digite o nome de usuário do Instagram.');
      return;
    }

    setIsSearchingProfile(true);
    setSearchError('');
    setRealConnections([]);

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
        const userGender = detectGender(liveData.name, liveData.bio, liveData.handle);
        const thirdHandle = APP_CONFIG.getThirdProfileHandle(userGender);
        const baseStalkers = generateStalkersList(false, liveMetrics.visitorsToday, userGender);
        setStalkers(baseStalkers);
        setIsUnlocked(false);
        setSearchError('');
        setCurrentStep('confirm_profile');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Puxa conexões reais da Apify em segundo plano para compor os perfis gratuitos
        fetch(`/api/instagram/connections?username=${encodeURIComponent(clean)}&thirdProfile=${encodeURIComponent(thirdHandle)}&gender=${userGender}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.connections && Array.isArray(data.connections) && data.connections.length > 0) {
              setRealConnections(data.connections);
              setStalkers((current) => applyRealConnectionsToStalkers(current, data.connections, liveData));
            }
          })
          .catch((err) => console.warn('Conexões Apify background info:', err));
      } else {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 404 || errJson.code === 'NOT_FOUND' || errJson.code === 'PROFILE_NOT_FOUND') {
          setSearchError('Esse perfil não existe ou não foi encontrado no Instagram. Por favor, coloque um perfil válido.');
        } else if (response.status === 401 || errJson.code === 'UNAUTHORIZED' || errJson.code === 'TOKEN_MISSING') {
          setSearchError(errJson.error || 'Autenticação da Apify pendente. Verifique a chave APIFY_API_TOKEN na Vercel.');
        } else if (response.status === 504 || errJson.code === 'TIMEOUT') {
          setSearchError('A consulta excedeu o tempo limite da rede. Verifique sua conexão e tente novamente.');
        } else if (response.status === 429 || response.status === 403) {
          setSearchError(errJson.error || 'Limite de requisições ou cota da Apify atingido. Tente novamente mais tarde.');
        } else {
          setSearchError(errJson.error || 'Erro ao consultar perfil no Instagram. Verifique o @ digitado.');
        }
      }
    } catch {
      setSearchError('Falha na comunicação com o servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSearchingProfile(false);
    }
  };

  const handleStartDemo = (rawHandle?: string) => {
    const clean = cleanHandle(rawHandle || 'demo.lifestyle') || 'demo.lifestyle';
    const demoData = getDemoInstagramProfile(clean);
    const demoMetrics = generateScanMetrics(
      demoData.handle,
      demoData.followersCount,
      demoData.isPrivate
    );
    const demoGender = detectGender(demoData.name, demoData.bio, demoData.handle);
    setCurrentProfile(demoData);
    setMetrics(demoMetrics);
    setStalkers(generateStalkersList(false, demoMetrics.visitorsToday, demoGender));
    setIsUnlocked(false);
    setSearchError('');
    setCurrentStep('confirm_profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmProfile = () => {
    setCurrentStep('scanning');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishScan = () => {
    try {
      soundFX.playComplete();
    } catch {}

    if (!stalkers || stalkers.length === 0) {
      const base = generateStalkersList(false, metrics?.visitorsToday || 24);
      setStalkers(realConnections.length > 0 ? applyRealConnectionsToStalkers(base, realConnections, currentProfile) : base);
    } else if (realConnections.length > 0) {
      setStalkers((current) => applyRealConnectionsToStalkers(current, realConnections, currentProfile));
    }

    setCurrentStep('results');
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  };

  const handleReset = () => {
    setCurrentStep('input');
    setIsUnlocked(false);
    setRealConnections([]);
    setStalkers(generateStalkersList(false, metrics.visitorsToday));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUnlockSuccess = () => {
    setIsUnlocked(true);
    const base = generateStalkersList(true, metrics.visitorsToday);
    setStalkers(realConnections.length > 0 ? applyRealConnectionsToStalkers(base, realConnections, currentProfile.handle) : base);
  };

  const handleToggleSimulateUnlock = () => {
    const nextState = !isUnlocked;
    setIsUnlocked(nextState);
    const base = generateStalkersList(nextState, metrics.visitorsToday);
    setStalkers(realConnections.length > 0 ? applyRealConnectionsToStalkers(base, realConnections, currentProfile.handle) : base);
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
              onStartDemo={handleStartDemo}
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
