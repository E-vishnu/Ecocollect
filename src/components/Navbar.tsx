import React, { useState } from 'react';
import { 
  Smartphone, 
  Truck, 
  ShieldCheck, 
  Scale, 
  Cpu, 
  Calculator, 
  FolderCode, 
  Leaf, 
  Radio,
  User as UserIcon,
  LogIn,
  LogOut,
  Sliders,
  ChevronDown,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { User, Role } from '../types';
import { LanguagePicker } from './LanguagePicker';
import { useLanguage } from '../i18n/LanguageContext';

export type AppView = 
  | 'resident_app' 
  | 'agent_app' 
  | 'admin_dashboard' 
  | 'iot_scale' 
  | 'cnn_classifier' 
  | 'pricing_calc' 
  | 'code_explorer'
  | 'auth_view';

interface NavbarProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  scaleLiveWeight: number;
  unresolvedMismatchesCount: number;
  currentUser?: User;
  onOpenAuth?: (role?: 'resident' | 'agent' | 'admin') => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  scaleLiveWeight,
  unresolvedMismatchesCount,
  currentUser,
  onOpenAuth,
  onLogout
}) => {
  const { t } = useLanguage();
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);

  // Derive active perspective
  const isTechnicalView = ['iot_scale', 'cnn_classifier', 'pricing_calc', 'code_explorer'].includes(activeView);
  
  const currentRolePerspective: 'resident' | 'agent' | 'admin' | 'system' = 
    activeView === 'resident_app' ? 'resident' :
    activeView === 'agent_app' ? 'agent' :
    activeView === 'admin_dashboard' ? 'admin' : 'system';

  const handleRoleSelect = (role: 'resident' | 'agent' | 'admin') => {
    setIsSystemMenuOpen(false);
    if (role === 'resident') {
      setActiveView('resident_app');
    } else if (role === 'agent') {
      setActiveView('agent_app');
    } else if (role === 'admin') {
      setActiveView('admin_dashboard');
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4 min-w-0">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0 min-w-0" 
            onClick={() => setActiveView(currentUser?.role === 'agent' ? 'agent_app' : currentUser?.role === 'admin' ? 'admin_dashboard' : 'resident_app')}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-inner shadow-emerald-400 shrink-0">
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white whitespace-nowrap">{t('appName', 'EcoCollect')}</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hidden xs:inline-block whitespace-nowrap">
                  {t('nav.smartWasteBadge', 'Smart Waste')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden md:block truncate max-w-[200px] lg:max-w-none">
                {t('nav.smartWasteSubtitle', 'Smart Waste Collection, Segregation & Recycling')}
              </p>
            </div>
          </div>

          {/* Current Authenticated Portal Indicator (RBAC Display - Clean on Desktop / Tablet) */}
          {currentUser ? (
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {currentUser.role === 'resident' && (
                <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-xl shadow-xs">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black tracking-wide">
                    {t('nav.residentPortal', 'Resident Portal')}
                  </span>
                </div>
              )}
              {currentUser.role === 'agent' && (
                <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-xl shadow-xs">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black tracking-wide">
                    {t('nav.agentPortal', 'Agent Field Portal')}
                  </span>
                </div>
              )}
              {currentUser.role === 'admin' && (
                <div className="flex items-center gap-2 bg-purple-950/80 border border-purple-500/40 text-purple-300 px-3 py-1.5 rounded-xl shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-black tracking-wide">
                    {t('nav.adminPortal', 'Municipal Admin Hub')}
                  </span>
                  {unresolvedMismatchesCount > 0 && (
                    <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                      {unresolvedMismatchesCount} {t('nav.flaggedCount', 'Flagged')}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{t('nav.smartWasteSubtitle', 'Smart Waste Collection, Segregation & Recycling')}</span>
            </div>
          )}

          {/* Right Actions: System Monitoring Menu (Admin only), Language & User Session */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* System Monitoring Dropdown (Accessible exclusively to Municipal Admin) */}
            {currentUser?.role === 'admin' && (
              <div className="relative shrink-0">
                <button
                  id="system-monitoring-btn"
                  onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isTechnicalView
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title={t('nav.systemMonitoring', 'System Monitoring')}
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">{t('nav.systemMonitoring', 'System Monitoring')}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSystemMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* System Monitoring Dropdown Menu */}
                {isSystemMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 border-b border-slate-700/80">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        {t('nav.adminModules', 'Admin / Technical Modules')}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveView('iot_scale');
                        setIsSystemMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-700/70 transition-colors cursor-pointer ${
                        activeView === 'iot_scale' ? 'text-emerald-400 font-bold bg-slate-700/40' : 'text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="font-semibold block">{t('nav.iotScaleTelemetry', 'IoT Scale Telemetry')}</span>
                          <span className="text-[10px] text-slate-400">{t('nav.iotScaleSub', 'ESP32 & HX711 Load Cell')}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">{scaleLiveWeight.toFixed(2)} kg</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('cnn_classifier');
                        setIsSystemMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-700/70 transition-colors cursor-pointer ${
                        activeView === 'cnn_classifier' ? 'text-emerald-400 font-bold bg-slate-700/40' : 'text-slate-200'
                      }`}
                    >
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <div>
                        <span className="font-semibold block">{t('nav.aiWasteVisionStudio', 'AI Waste Vision Studio')}</span>
                        <span className="text-[10px] text-slate-400">{t('nav.aiVisionSub', 'MobileNet CNN classification')}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('pricing_calc');
                        setIsSystemMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-700/70 transition-colors cursor-pointer ${
                        activeView === 'pricing_calc' ? 'text-emerald-400 font-bold bg-slate-700/40' : 'text-slate-200'
                      }`}
                    >
                      <Calculator className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="font-semibold block">{t('nav.dynamicPricingEngine', 'Dynamic Pricing Engine')}</span>
                        <span className="text-[10px] text-slate-400">{t('nav.pricingSub', 'Mathematical formulation')}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('code_explorer');
                        setIsSystemMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-700/70 transition-colors cursor-pointer ${
                        activeView === 'code_explorer' ? 'text-emerald-400 font-bold bg-slate-700/40' : 'text-slate-200'
                      }`}
                    >
                      <FolderCode className="w-4 h-4 text-indigo-400" />
                      <div>
                        <span className="font-semibold block">{t('nav.codeRepository', 'Code Repository')}</span>
                        <span className="text-[10px] text-slate-400">{t('nav.codeSub', 'Project files & specs')}</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Global Language Switcher */}
            <LanguagePicker variant="compact" />

            {/* Current User Session & Logout */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 border border-slate-700 rounded-xl p-1 sm:px-2.5 sm:py-1.5 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden md:block text-left min-w-0">
                    <span className="text-[11px] font-bold text-white block leading-tight truncate max-w-[85px] lg:max-w-[120px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[9px] text-slate-400 capitalize block leading-tight truncate">
                      {currentUser.role === 'resident' ? t('admin.roleResident', 'Resident') : currentUser.role === 'agent' ? t('admin.roleAgent', 'Agent') : t('admin.roleAdmin', 'Municipal Admin')}
                    </span>
                  </div>
                </div>

                {onLogout && (
                  <button
                    id="nav-logout-btn"
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/70 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-400 text-xs font-bold transition-all cursor-pointer shrink-0"
                    title={t('logout', 'Logout')}
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden md:inline">{t('logout', 'Logout')}</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                id="nav-login-btn"
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('resident')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>{t('login', 'Sign In')}</span>
              </button>
            )}

          </div>

        </div>

        {/* If in Technical View: Show Return Banner */}
        {isTechnicalView && (
          <div className="py-2 px-3 bg-blue-950/70 border-t border-blue-900/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-200">
              <span className="font-bold">{t('nav.systemMonitoring', 'System Monitoring')}:</span>
              <span className="text-slate-300 font-medium">
                {activeView === 'iot_scale' ? t('nav.iotScaleTelemetry', 'IoT Scale Telemetry') :
                 activeView === 'cnn_classifier' ? t('nav.aiWasteVisionStudio', 'AI Waste Vision Studio') :
                 activeView === 'pricing_calc' ? t('nav.dynamicPricingEngine', 'Dynamic Pricing Engine') :
                 activeView === 'code_explorer' ? t('nav.codeRepository', 'Code Repository') : activeView}
              </span>
            </div>
            <button
              onClick={() => setActiveView(currentUser?.role === 'agent' ? 'agent_app' : currentUser?.role === 'admin' ? 'admin_dashboard' : 'resident_app')}
              className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>
                {currentUser?.role === 'agent' 
                  ? `← ${t('agent.backToQueue', 'Back to Queue')}` 
                  : currentUser?.role === 'admin' 
                    ? `← ${t('admin.municipalAdminPortal', 'Municipal Admin Portal')}` 
                    : `← ${t('resident.portalTitle', 'Resident Portal')}`}
              </span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
