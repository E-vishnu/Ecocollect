import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, AppView } from './components/Navbar';
import { ResidentAppSimulator } from './components/ResidentAppSimulator';
import { AgentAppSimulator } from './components/AgentAppSimulator';
import { AdminDashboard } from './components/AdminDashboard';
import { IotScaleSimulator } from './components/IotScaleSimulator';
import { CnnClassifierStudio } from './components/CnnClassifierStudio';
import { PricingCalculator } from './components/PricingCalculator';
import { CodeExplorer } from './components/CodeExplorer';
import { AuthPage } from './components/AuthPage';
import { ShieldAlert } from 'lucide-react';

import { User, Pickup, WeightLog, WasteCategory, WeightSource, Role } from './types';
import { INITIAL_USERS, INITIAL_PICKUPS, INITIAL_WEIGHT_LOGS, calculateDynamicPricing } from './data/pricingConstants';
import { useLanguage } from './i18n/LanguageContext';

export const VIEW_TO_PATH: Record<AppView, string> = {
  resident_app: '/resident',
  agent_app: '/agent',
  admin_dashboard: '/admin',
  iot_scale: '/iot-scale',
  cnn_classifier: '/cnn-classifier',
  pricing_calc: '/pricing-calc',
  code_explorer: '/code-explorer',
  auth_view: '/login'
};

export const PATH_TO_VIEW: Record<string, AppView> = {
  '/resident': 'resident_app',
  '/resident-app': 'resident_app',
  '/agent': 'agent_app',
  '/agent-app': 'agent_app',
  '/admin': 'admin_dashboard',
  '/admin-dashboard': 'admin_dashboard',
  '/iot-scale': 'iot_scale',
  '/cnn-classifier': 'cnn_classifier',
  '/pricing-calc': 'pricing_calc',
  '/pricing-calculator': 'pricing_calc',
  '/code-explorer': 'code_explorer',
  '/login': 'auth_view',
  '/auth': 'auth_view',
  '/signin': 'auth_view'
};

export function parseViewFromLocation(): AppView | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#\/?/, '/').toLowerCase();
  if (hash && PATH_TO_VIEW[hash]) {
    return PATH_TO_VIEW[hash];
  }
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  if (path && PATH_TO_VIEW[path]) {
    return PATH_TO_VIEW[path];
  }
  return null;
}

export function isViewPermittedForUser(view: AppView, user: User | null | undefined): boolean {
  if (!user) {
    return view === 'auth_view';
  }
  switch (user.role) {
    case 'resident':
      return view === 'resident_app';
    case 'agent':
      return view === 'agent_app';
    case 'admin':
      return [
        'admin_dashboard',
        'iot_scale',
        'cnn_classifier',
        'pricing_calc',
        'code_explorer'
      ].includes(view);
    default:
      return false;
  }
}

export function getDefaultViewForUser(user: User | null | undefined): AppView {
  if (!user) return 'auth_view';
  if (user.role === 'resident') return 'resident_app';
  if (user.role === 'agent') return 'agent_app';
  if (user.role === 'admin') return 'admin_dashboard';
  return 'auth_view';
}

const getInitialSession = (): { user: User | null; view: AppView } => {
  if (typeof localStorage === 'undefined') {
    return { user: null, view: 'auth_view' };
  }
  const token = localStorage.getItem('ecocollect_token');
  const storedUserStr = localStorage.getItem('ecocollect_user');
  const isLoggedOut = localStorage.getItem('ecocollect_logged_out') === 'true';

  let user: User | null = null;
  if (!isLoggedOut && storedUserStr) {
    try {
      const parsed = JSON.parse(storedUserStr);
      if (parsed && ['resident', 'agent', 'admin'].includes(parsed.role)) {
        user = parsed;
      }
    } catch {
      localStorage.removeItem('ecocollect_user');
    }
  }

  // If brand new session with no explicit logout, seed initial demo resident
  if (!isLoggedOut && !user && !token) {
    const demoResident = INITIAL_USERS.find(u => u.id === 'usr_res_1') || INITIAL_USERS[0];
    user = demoResident;
    try {
      localStorage.setItem('ecocollect_user', JSON.stringify(demoResident));
      localStorage.setItem('ecocollect_session_role', demoResident.role);
    } catch {}
  }

  const requestedView = parseViewFromLocation();
  if (requestedView && isViewPermittedForUser(requestedView, user)) {
    return { user, view: requestedView };
  }

  return { user, view: getDefaultViewForUser(user) };
};

export default function App() {
  const { t } = useLanguage();
  const initialSession = getInitialSession();
  const [currentUser, setCurrentUser] = useState<User | null>(initialSession.user);
  const [activeView, setActiveView] = useState<AppView>(initialSession.view);
  const [users, setUsers] = useState<User[]>(() => {
    if (initialSession.user) {
      const exists = INITIAL_USERS.some(u => u.id === initialSession.user!.id);
      return exists ? INITIAL_USERS : [initialSession.user, ...INITIAL_USERS];
    }
    return INITIAL_USERS;
  });
  const [currentUserId, setCurrentUserId] = useState<string>(initialSession.user ? initialSession.user.id : '');
  const [pickups, setPickups] = useState<Pickup[]>(INITIAL_PICKUPS);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(INITIAL_WEIGHT_LOGS);
  const [scaleLiveWeight, setScaleLiveWeight] = useState<number>(4.85);
  const [unauthorizedNotice, setUnauthorizedNotice] = useState<string | null>(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<Role>('resident');

  // Verify and sync token with server
  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('ecocollect_token') : null;
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUsers(prev => {
            const exists = prev.find(u => u.id === data.user.id);
            if (exists) {
              return prev.map(u => u.id === data.user.id ? { ...u, ...data.user } : u);
            }
            return [data.user, ...prev];
          });
          setCurrentUser(data.user);
          setCurrentUserId(data.user.id);
          localStorage.setItem('ecocollect_user', JSON.stringify(data.user));
          localStorage.setItem('ecocollect_session_role', data.user.role);

          // Verify if currently rendered view is authorized for this confirmed account role
          setActiveView(prevView => {
            if (isViewPermittedForUser(prevView, data.user)) {
              return prevView;
            }
            const fallback = getDefaultViewForUser(data.user);
            const path = VIEW_TO_PATH[fallback];
            if (typeof window !== 'undefined') {
              window.history.replaceState({ view: fallback }, '', path);
            }
            return fallback;
          });
        } else {
          // Token expired or invalid
          localStorage.removeItem('ecocollect_token');
          localStorage.removeItem('ecocollect_user');
          localStorage.removeItem('ecocollect_session_role');
          localStorage.setItem('ecocollect_logged_out', 'true');
          setCurrentUser(null);
          setCurrentUserId('');
          setActiveView('auth_view');
          if (typeof window !== 'undefined') {
            window.history.replaceState({ view: 'auth_view' }, '', '/login');
          }
        }
      })
      .catch(() => {
        // In offline mode, preserve local session
      });
    }
  }, []);

  // Safe navigation handler enforcing RBAC
  const handleSafeViewChange = useCallback((targetView: AppView) => {
    if (!isViewPermittedForUser(targetView, currentUser)) {
      const permittedView = getDefaultViewForUser(currentUser);
      setUnauthorizedNotice(
        currentUser
          ? `Access restricted: Your ${currentUser.role === 'resident' ? 'Resident' : currentUser.role === 'agent' ? 'Collection Agent' : 'Municipal Admin'} account is only permitted to access authorized portals.`
          : 'Please sign in to access protected portals.'
      );
      setActiveView(permittedView);
      const path = VIEW_TO_PATH[permittedView];
      if (typeof window !== 'undefined' && window.location.pathname !== path) {
        window.history.replaceState({ view: permittedView }, '', path);
      }
      return;
    }

    setUnauthorizedNotice(null);
    setActiveView(targetView);
    const path = VIEW_TO_PATH[targetView];
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState({ view: targetView }, '', path);
    }
  }, [currentUser]);

  // URL synchronization and manual URL navigation protection
  useEffect(() => {
    // Initial sync of current URL path
    const currentPath = VIEW_TO_PATH[activeView];
    if (typeof window !== 'undefined' && window.location.pathname !== currentPath && window.location.hash !== `#${currentPath}`) {
      window.history.replaceState({ view: activeView }, '', currentPath);
    }

    const handleLocationChange = () => {
      const requested = parseViewFromLocation();
      if (requested) {
        if (isViewPermittedForUser(requested, currentUser)) {
          setActiveView(requested);
          setUnauthorizedNotice(null);
        } else {
          const permitted = getDefaultViewForUser(currentUser);
          setActiveView(permitted);
          setUnauthorizedNotice(
            currentUser
              ? `Access restricted: Unauthorized route requested. Redirected to your authorized portal.`
              : 'Please sign in to access protected portals.'
          );
          const fallbackPath = VIEW_TO_PATH[permitted];
          window.history.replaceState({ view: permitted }, '', fallbackPath);
        }
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [currentUser, activeView]);

  // Strict Role-Based Access Control (RBAC) Enforcement guard on state change
  useEffect(() => {
    if (!currentUser) {
      if (activeView !== 'auth_view') {
        setActiveView('auth_view');
        if (typeof window !== 'undefined') {
          window.history.replaceState({ view: 'auth_view' }, '', '/login');
        }
      }
      return;
    }

    // Ensure currently active view is strictly permitted for currentUser's authenticated role
    if (!isViewPermittedForUser(activeView, currentUser)) {
      const permitted = getDefaultViewForUser(currentUser);
      setActiveView(permitted);
      const path = VIEW_TO_PATH[permitted];
      if (typeof window !== 'undefined') {
        window.history.replaceState({ view: permitted }, '', path);
      }
    }
  }, [currentUser, activeView]);

  // Pickups where category mismatch is flagged and not yet reviewed
  const unresolvedMismatches = pickups.filter(p => p.mismatchFlagged && !p.adminReviewed);

  // Auth Handlers
  const handleOpenAuth = (role: Role = 'resident') => {
    setAuthDefaultRole(role);
    setIsAuthModalOpen(true);
  };

  const handleLogin = (user: User) => {
    // Read the authenticated user's actual role
    const actualRole = user.role;

    setUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) {
        return prev.map(u => u.id === user.id ? { ...u, ...user } : u);
      }
      return [user, ...prev];
    });
    setCurrentUser(user);
    setCurrentUserId(user.id);
    setIsAuthModalOpen(false);
    setUnauthorizedNotice(null);

    // Persist authenticated session
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('ecocollect_logged_out');
      localStorage.setItem('ecocollect_user', JSON.stringify(user));
      localStorage.setItem('ecocollect_session_role', actualRole);
    }

    // Direct user to their respective portal strictly based on authenticated role
    const targetView = getDefaultViewForUser(user);
    setActiveView(targetView);
    const path = VIEW_TO_PATH[targetView];
    if (typeof window !== 'undefined') {
      window.history.replaceState({ view: targetView }, '', path);
    }
  };

  const handleSignUp = (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    setCurrentUserId(newUser.id);
    setIsAuthModalOpen(false);
    setUnauthorizedNotice(null);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('ecocollect_logged_out');
      localStorage.setItem('ecocollect_user', JSON.stringify(newUser));
      localStorage.setItem('ecocollect_session_role', newUser.role);
    }

    const targetView = getDefaultViewForUser(newUser);
    setActiveView(targetView);
    const path = VIEW_TO_PATH[targetView];
    if (typeof window !== 'undefined') {
      window.history.replaceState({ view: targetView }, '', path);
    }
  };

  const handleLogout = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('ecocollect_token');
      localStorage.removeItem('ecocollect_user');
      localStorage.removeItem('ecocollect_session_role');
      localStorage.setItem('ecocollect_logged_out', 'true');
    }
    setCurrentUser(null);
    setCurrentUserId('');
    setActiveView('auth_view');
    setIsAuthModalOpen(false);
    setUnauthorizedNotice(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({ view: 'auth_view' }, '', '/login');
    }
  };

  // Handlers
  const handleCreatePickup = (newPickupData: Partial<Pickup>) => {
    const newPickup: Pickup = {
      id: 'pku_' + Date.now(),
      pickupCode: newPickupData.pickupCode || 'ECO-' + Math.floor(100000 + Math.random() * 900000),
      residentId: newPickupData.residentId || currentUser.id,
      residentName: newPickupData.residentName || currentUser.name,
      residentPhone: newPickupData.residentPhone || currentUser.phone,
      residentAddress: newPickupData.residentAddress || 'Indiranagar, Bengaluru',
      residentCoordinates: newPickupData.residentCoordinates || { lat: 12.9716, lng: 77.6412 },
      category: newPickupData.category || 'plastic',
      pickupType: newPickupData.pickupType || 'routine',
      scheduledDate: newPickupData.scheduledDate || '2026-08-30',
      timeSlot: newPickupData.timeSlot || '09:00 AM - 11:00 AM',
      status: 'requested',
      isSegregated: newPickupData.isSegregated !== undefined ? newPickupData.isSegregated : true,
      segregationFactor: newPickupData.isSegregated ? 0.8 : 1.5,
      weightKg: 0,
      weightSource: 'pending',
      processingFee: 0,
      recyclablePayout: 0,
      netSettlement: 0,
      paymentStatus: 'pending',
      mismatchFlagged: false,
      notes: newPickupData.notes || '',
      createdAt: new Date().toISOString()
    };

    setPickups([newPickup, ...pickups]);
  };

  const handleConfirmCollection = (pickupId: string, collectionData: {
    weightKg: number;
    weightSource: WeightSource;
    wastePhotoUrl: string;
    cnnCategory: WasteCategory;
    cnnConfidence: number;
    mismatchFlagged: boolean;
  }) => {
    setPickups(prev => prev.map(p => {
      if (p.id !== pickupId) return p;

      const isSegregated = !collectionData.mismatchFlagged && p.isSegregated;
      const pricing = calculateDynamicPricing({
        category: p.category,
        pickupType: p.pickupType,
        weightKg: collectionData.weightKg,
        isSegregated
      });

      return {
        ...p,
        weightKg: collectionData.weightKg,
        weightSource: collectionData.weightSource,
        wastePhotoUrl: collectionData.wastePhotoUrl,
        cnnCategory: collectionData.cnnCategory,
        cnnConfidence: collectionData.cnnConfidence,
        mismatchFlagged: collectionData.mismatchFlagged,
        adminReviewed: false,
        status: collectionData.mismatchFlagged ? 'verified' : 'completed',
        processingFee: pricing.processingFee,
        recyclablePayout: pricing.recyclablePayout,
        netSettlement: pricing.netSettlement,
        completedAt: new Date().toISOString()
      };
    }));
  };

  const handleResolveMismatch = (pickupId: string, resolution: 'accept_resident' | 'enforce_penalty' | 'manual_adjust') => {
    setPickups(prev => prev.map(p => {
      if (p.id !== pickupId) return p;

      const isSegregated = (resolution === 'accept_resident');
      const pricing = calculateDynamicPricing({
        category: p.category,
        pickupType: p.pickupType,
        weightKg: p.weightKg,
        isSegregated
      });

      return {
        ...p,
        isSegregated,
        segregationFactor: isSegregated ? 0.8 : 1.5,
        adminReviewed: true,
        mismatchFlagged: false,
        status: 'priced',
        processingFee: pricing.processingFee,
        recyclablePayout: pricing.recyclablePayout,
        netSettlement: pricing.netSettlement
      };
    }));
  };

  const handleSettlePayment = (pickupId: string, txnId: string, isPayout: boolean) => {
    setPickups(prev => prev.map(p => {
      if (p.id !== pickupId) return p;
      return {
        ...p,
        status: 'completed',
        paymentStatus: isPayout ? 'payout_credited' : 'paid',
        upiTxnId: isPayout ? txnId : undefined,
        razorpayPaymentId: !isPayout ? txnId : undefined
      };
    }));

    // Update user wallet balance & reward points
    setUsers(prev => prev.map(u => {
      if (u.id !== currentUser.id) return u;
      const pickup = pickups.find(p => p.id === pickupId);
      const amount = pickup ? Math.abs(pickup.netSettlement) : 50;
      return {
        ...u,
        walletBalance: isPayout ? u.walletBalance + amount : u.walletBalance,
        rewardPoints: u.rewardPoints + 25
      };
    }));
  };

  const handlePostScaleTelemetry = (log: WeightLog) => {
    setWeightLogs([log, ...weightLogs]);
    setScaleLiveWeight(log.weightKg);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased flex flex-col selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden w-full">
      
      {/* Top Main Navigation */}
      <Navbar
        activeView={activeView}
        setActiveView={handleSafeViewChange}
        scaleLiveWeight={scaleLiveWeight}
        unresolvedMismatchesCount={unresolvedMismatches.length}
        currentUser={currentUser || undefined}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 min-w-0">
        
        {/* Unauthorized Route / Access Alert Banner */}
        {unauthorizedNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-sm shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="font-medium">{unauthorizedNotice}</span>
            </div>
            <button 
              onClick={() => setUnauthorizedNotice(null)}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Role Protected Portal Views */}
        {activeView === 'resident_app' && isViewPermittedForUser('resident_app', currentUser) && (
          <ResidentAppSimulator
            currentUser={currentUser!}
            pickups={pickups}
            onCreatePickup={handleCreatePickup}
            onSettlePayment={handleSettlePayment}
            onOpenScaleView={() => handleSafeViewChange('iot_scale')}
            onOpenAuth={() => handleOpenAuth('resident')}
          />
        )}

        {activeView === 'agent_app' && isViewPermittedForUser('agent_app', currentUser) && (
          <AgentAppSimulator
            pickups={pickups}
            scaleLiveWeight={scaleLiveWeight}
            onScaleTare={() => setScaleLiveWeight(0.0)}
            onConfirmCollection={handleConfirmCollection}
            onNavigateToIoTScale={() => handleSafeViewChange('iot_scale')}
            currentUser={currentUser!}
            onOpenAuth={() => handleOpenAuth('agent')}
          />
        )}

        {activeView === 'admin_dashboard' && isViewPermittedForUser('admin_dashboard', currentUser) && (
          <AdminDashboard
            pickups={pickups}
            users={users}
            weightLogs={weightLogs}
            onResolveMismatch={handleResolveMismatch}
            onNavigateView={handleSafeViewChange}
            scaleLiveWeight={scaleLiveWeight}
            onUpdateScaleWeight={setScaleLiveWeight}
            onTareScale={() => setScaleLiveWeight(0.0)}
            onPostScaleTelemetry={handlePostScaleTelemetry}
          />
        )}

        {/* Municipal Admin Authorized Technical Modules */}
        {activeView === 'iot_scale' && isViewPermittedForUser('iot_scale', currentUser) && (
          <IotScaleSimulator
            currentScaleWeight={scaleLiveWeight}
            onUpdateScaleWeight={setScaleLiveWeight}
            onTareScale={() => setScaleLiveWeight(0.0)}
            onPostScaleTelemetry={handlePostScaleTelemetry}
          />
        )}

        {activeView === 'cnn_classifier' && isViewPermittedForUser('cnn_classifier', currentUser) && (
          <CnnClassifierStudio />
        )}

        {activeView === 'pricing_calc' && isViewPermittedForUser('pricing_calc', currentUser) && (
          <PricingCalculator />
        )}

        {activeView === 'code_explorer' && isViewPermittedForUser('code_explorer', currentUser) && (
          <CodeExplorer />
        )}

        {(activeView === 'auth_view' || !currentUser) && (
          <AuthPage
            existingUsers={users}
            defaultRole={authDefaultRole}
            onLogin={handleLogin}
            onSignUp={handleSignUp}
            onCancel={currentUser ? () => handleSafeViewChange(getDefaultViewForUser(currentUser)) : undefined}
          />
        )}

      </main>

      {/* Auth Modal Overlay */}
      {isAuthModalOpen && activeView !== 'auth_view' && (
        <div className="fixed inset-0 top-16 z-40 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <AuthPage
              existingUsers={users}
              defaultRole={authDefaultRole}
              onLogin={handleLogin}
              onSignUp={handleSignUp}
              onCancel={() => setIsAuthModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Persistent Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{t('footer.prototypeEngine', 'EcoCollect Prototype Engine')}</span>
            <span>• {t('footer.techStack', 'i18n English/Hindi/Kannada • ESP32 HX711 Telemetry • MobileNet CNN • Node.js Express')}</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            {t('footer.formulation', 'Formulation')}: P = Σ(Wi × Ri × Si) + F • Rp = Σ(Wj × Vj)
          </div>
        </div>
      </footer>

    </div>
  );
}
