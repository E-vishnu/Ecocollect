import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Scale, 
  Camera, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  ArrowRight, 
  Radio, 
  RefreshCw, 
  Building2, 
  Zap,
  Phone,
  Navigation,
  UserCheck,
  Check,
  Eye,
  Sliders,
  Sparkles,
  DollarSign,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  User as UserIcon,
  ArrowLeft,
  Recycle,
  ShieldCheck
} from 'lucide-react';
import { Pickup, WasteCategory, WeightSource, User } from '../types';
import { SAMPLE_WASTE_PHOTOS, calculateDynamicPricing, WASTE_CATEGORIES_REGISTRY } from '../data/pricingConstants';
import { useLanguage } from '../i18n/LanguageContext';

interface AgentAppSimulatorProps {
  pickups: Pickup[];
  scaleLiveWeight: number;
  onScaleTare: () => void;
  onConfirmCollection: (pickupId: string, collectionData: {
    weightKg: number;
    weightSource: WeightSource;
    wastePhotoUrl: string;
    cnnCategory: WasteCategory;
    cnnConfidence: number;
    mismatchFlagged: boolean;
  }) => void;
  onNavigateToIoTScale: () => void;
  currentUser?: User;
  onOpenAuth?: () => void;
}

export type AgentStep = 'queue' | 'navigate' | 'verify_customer' | 'weigh' | 'ai_verify' | 'confirm_value' | 'completed';

export const AgentAppSimulator: React.FC<AgentAppSimulatorProps> = ({
  pickups,
  scaleLiveWeight,
  onScaleTare,
  onConfirmCollection,
  onNavigateToIoTScale,
  currentUser,
  onOpenAuth
}) => {
  const { t } = useLanguage();
  const [selectedPickupId, setSelectedPickupId] = useState<string | null>(pickups[0]?.id || null);
  const [activeStep, setActiveStep] = useState<AgentStep>('queue');
  const [isMobileStepsExpanded, setIsMobileStepsExpanded] = useState(false);
  
  // Weight Measurement States
  const [useManualWeight, setUseManualWeight] = useState(false);
  const [manualWeightInput, setManualWeightInput] = useState('4.85');
  const [lastReadingTime, setLastReadingTime] = useState<string>('Just now');

  // AI Inference Simulation States
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifiedData, setClassifiedData] = useState<{
    category: WasteCategory;
    confidence: number;
    mismatch: boolean;
    photoUrl: string;
  }>({
    category: 'plastic',
    confidence: 0.96,
    mismatch: false,
    photoUrl: SAMPLE_WASTE_PHOTOS[0].url
  });

  const selectedPickup = pickups.find(p => p.id === selectedPickupId);

  // Sync weights
  useEffect(() => {
    setLastReadingTime(new Date().toLocaleTimeString());
  }, [scaleLiveWeight]);

  const activeWeight = useManualWeight ? (parseFloat(manualWeightInput) || 0) : (scaleLiveWeight > 0 ? scaleLiveWeight : 4.85);

  const startJob = (pickup: Pickup) => {
    setSelectedPickupId(pickup.id);
    setActiveStep('navigate');
    
    // Auto-setup AI sample matching or mismatching the category
    const matchingPhotoIdx = SAMPLE_WASTE_PHOTOS.findIndex(p => p.category === pickup.category);
    const photoIdx = matchingPhotoIdx !== -1 ? matchingPhotoIdx : 0;
    setSelectedPhotoIndex(photoIdx);
    
    setClassifiedData({
      category: SAMPLE_WASTE_PHOTOS[photoIdx].category,
      confidence: SAMPLE_WASTE_PHOTOS[photoIdx].confidence,
      mismatch: SAMPLE_WASTE_PHOTOS[photoIdx].category !== pickup.category,
      photoUrl: SAMPLE_WASTE_PHOTOS[photoIdx].url
    });
  };

  const handleSimulateVisionInference = (sampleIdx: number) => {
    setSelectedPhotoIndex(sampleIdx);
    const preset = SAMPLE_WASTE_PHOTOS[sampleIdx];
    setIsClassifying(true);
    
    setTimeout(() => {
      const isMismatch = selectedPickup ? (preset.category !== selectedPickup.category) : false;
      setClassifiedData({
        category: preset.category,
        confidence: preset.confidence,
        mismatch: isMismatch,
        photoUrl: preset.url
      });
      setIsClassifying(false);
    }, 600);
  };

  const handleFinalSubmit = () => {
    if (!selectedPickup) return;
    onConfirmCollection(selectedPickup.id, {
      weightKg: activeWeight,
      weightSource: useManualWeight ? 'manual_override' : 'iot_loadcell',
      wastePhotoUrl: classifiedData.photoUrl,
      cnnCategory: classifiedData.category,
      cnnConfidence: classifiedData.confidence,
      mismatchFlagged: classifiedData.mismatch
    });
    setActiveStep('completed');
  };

  const currentCatConfig = selectedPickup 
    ? WASTE_CATEGORIES_REGISTRY.find(c => c.id === selectedPickup.category) || WASTE_CATEGORIES_REGISTRY[0]
    : WASTE_CATEGORIES_REGISTRY[0];

  const isVerifiedSegregated = !classifiedData.mismatch && Boolean(selectedPickup?.isSegregated);
  const pricing = selectedPickup ? calculateDynamicPricing({
    category: selectedPickup.category,
    pickupType: selectedPickup.pickupType,
    weightKg: activeWeight,
    isSegregated: isVerifiedSegregated
  }) : { processingFee: 0, recyclablePayout: 0, netSettlement: 0, isNetPayout: true, settlementAmount: 0 };

  // Material Value and On-Demand Breakdown
  const materialRate = currentCatConfig.buybackRate;
  const materialValue = activeWeight * materialRate;
  const incentiveAmount = isVerifiedSegregated ? 10.00 : 0.00;
  const verifiedBuyback = materialValue + incentiveAmount;
  const onDemandTripFee = pricing.processingFee;
  const netSettlementAmount = verifiedBuyback - onDemandTripFee;
  const isCashback = netSettlementAmount > 0;
  const isFeeDue = netSettlementAmount < 0;
  const finalSettlementDisplay = Math.abs(netSettlementAmount);
  const finalPayout = finalSettlementDisplay;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Agent HUD Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          {/* LEFT: Identity, Van & Ward */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex-shrink-0 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-black text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                  {t('agent.hudTitle', 'EcoCollect Agent Field HUD')}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {currentUser?.agentDetails?.assignedArea || t('agent.wardZone', 'Ward 84 • East Bangalore Zone')}
                </span>
              </div>
              <h1 className="text-xl font-black text-white mt-1 truncate">
                {currentUser?.name || 'Rajesh Kumar'}
                <span className="text-xs font-normal text-slate-400 ml-2">
                  ({currentUser?.agentDetails?.vehicleNumber || 'KA-01-EQ-1002 • EV Cargo Van'})
                </span>
              </h1>
            </div>
          </div>

          {/* RIGHT: IoT Status & Weight Telemetry */}
          <div className="flex flex-wrap items-center gap-3.5 bg-slate-800/90 border border-slate-700/80 px-4 py-2.5 rounded-2xl justify-between sm:justify-end flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                    {t('agent.connected', 'Connected')}
                  </span>
                  <span className="text-[9px] text-slate-400 bg-slate-700/80 px-1.5 py-0.5 rounded font-mono">
                    {t('agent.demoMode', 'Demo Mode')}
                  </span>
                </div>
                <div className="text-sm font-mono font-black text-white">
                  {t('agent.weight', 'Weight')}: {activeWeight.toFixed(2)} kg
                </div>
              </div>
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-700"></div>

            <div className="text-[11px] text-slate-400">
              <span className="block text-[9px] uppercase tracking-wider text-slate-500">
                {t('agent.lastReading', 'Last Reading')}
              </span>
              <span className="text-slate-300 font-mono font-medium">{lastReadingTime}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 1. PROMINENT CURRENT PICKUP INFORMATION CARD */}
      {selectedPickup && activeStep !== 'queue' && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-700/80 space-y-4">
          
          {/* Card Top: Pickup ID, Category & Current Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/90 px-3 py-1 rounded-lg border border-emerald-500/40">
                {t('agent.pickupPrefix', 'Pickup')} #{selectedPickup.pickupCode}
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                ID: {selectedPickup.id}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg flex items-center gap-1.5 border ${
                activeStep === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {activeStep === 'completed' 
                  ? t('agent.stepCompleted', 'Completed') 
                  : `${t('status.in_progress', 'In Progress')} • ${t(`agent.${
                      activeStep === 'navigate' ? 'stepNavTab' :
                      activeStep === 'verify_customer' ? 'stepVerifyTab' :
                      activeStep === 'weigh' ? 'stepWeighTab' :
                      activeStep === 'ai_verify' ? 'stepAiTab' :
                      activeStep === 'confirm_value' ? 'stepValueTab' : 'stepCompleteTab'
                    }`, activeStep)}`
                }
              </span>
            </div>
          </div>

          {/* Prominent 4-Column Pickup Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Resident */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-emerald-400" />
                {t('agent.residentNameAddress', 'Resident')}
              </span>
              <div className="text-sm font-black text-white truncate">
                {selectedPickup.residentName}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1 truncate">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{selectedPickup.residentPhone || '+91 98450 12345'}</span>
              </div>
            </div>

            {/* 2. Address */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {t('resident.address', 'Address')}
              </span>
              <div className="text-xs font-semibold text-slate-200 break-words leading-relaxed">
                {selectedPickup.residentAddress}
              </div>
            </div>

            {/* 3. Waste Category */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Recycle className="w-3 h-3 text-emerald-400" />
                {t('agent.wasteCategoryLabel', 'Waste Category')}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-emerald-300 uppercase">
                  {t(`categories.${selectedPickup.category}`, selectedPickup.category.replace('_', ' '))}
                </span>
                <span className="text-[10px] font-mono text-slate-300 bg-slate-700/80 px-1.5 py-0.5 rounded">
                  ~{selectedPickup.weightKg || 4.85} kg
                </span>
              </div>
              <div className="text-[11px]">
                {selectedPickup.isSegregated ? (
                  <span className="text-emerald-400 font-medium">✓ {t('agent.verifiedSegregated', 'Strictly Segregated')}</span>
                ) : (
                  <span className="text-amber-400 font-medium">⚠ {t('agent.unsegregatedMixed', 'Mixed')}</span>
                )}
              </div>
            </div>

            {/* 4. Scheduled Time */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                {t('agent.scheduledTime', 'Scheduled Time')}
              </span>
              <div className="text-xs font-black font-mono text-white">
                {selectedPickup.timeSlot}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <Navigation className="w-3 h-3 shrink-0" />
                <span>ETA: 4 mins • Sector 4</span>
              </div>
            </div>

          </div>

          {/* Resident Note if provided */}
          {selectedPickup.notes && (
            <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-xl">
              <span className="font-bold text-emerald-400 shrink-0">{t('agent.residentNote', 'Resident Note')}:</span>
              <span className="italic">"{selectedPickup.notes}"</span>
            </div>
          )}

        </div>
      )}

      {/* 2. GUIDED 6-STEP WORKFLOW STEPPER (STICKY & RESPONSIVE) */}
      {selectedPickup && activeStep !== 'queue' && (() => {
        const stepOrder: AgentStep[] = ['navigate', 'verify_customer', 'weigh', 'ai_verify', 'confirm_value', 'completed'];
        const curIdx = stepOrder.indexOf(activeStep);
        const progressPct = Math.round(((curIdx + 1) / stepOrder.length) * 100);

        const stepDefinitions = [
          { id: 'navigate', num: '1', label: t('agent.stepNavTab', 'Navigate'), desc: t('agent.step1ActionDesc', 'Navigate to resident address and confirm arrival.') },
          { id: 'verify_customer', num: '2', label: t('agent.stepVerifyTab', 'Verify Customer'), desc: t('agent.step2ActionDesc', 'Verify customer identity and waste segregation.') },
          { id: 'weigh', num: '3', label: t('agent.stepWeighTab', 'Weigh Waste'), desc: t('agent.step3ActionDesc', 'Weigh waste on ESP32 IoT load cell.') },
          { id: 'ai_verify', num: '4', label: t('agent.stepAiTab', 'AI Verification'), desc: t('agent.step4ActionDesc', 'Run MobileNet CNN classification on waste photo.') },
          { id: 'confirm_value', num: '5', label: t('agent.stepValueTab', 'Confirm Value'), desc: t('agent.step5ActionDesc', 'Review dynamic buyback formula and confirm receipt.') },
          { id: 'completed', num: '6', label: t('agent.stepCompleteTab', 'Complete Pickup'), desc: t('agent.step6ActionDesc', 'Pickup finalized and receipt dispatched.') }
        ];

        return (
          <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl p-3 sm:p-4 transition-all">
            
            {/* Stepper Header Bar */}
            <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
              
              {/* Active Step Indicator Badge */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100/90 text-emerald-900 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 border border-emerald-300/80">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span>{t('agent.stepOf', 'Step {{current}} of {{total}}').replace('{{current}}', String(curIdx + 1)).replace('{{total}}', '6')}</span>
                </span>
                
                <span className="text-xs font-extrabold text-slate-800 truncate hidden sm:inline">
                  {stepDefinitions[curIdx]?.label}
                </span>

                <span className="text-[11px] font-mono font-bold text-slate-400 hidden md:inline">
                  • {progressPct}% {t('agent.stepCompleted', 'Completed')}
                </span>
              </div>

              {/* Visually Less Prominent Secondary Action: Back to Route Queue */}
              <button
                onClick={() => setActiveStep('queue')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                title={t('agent.backToRouteQueue', '← Back to Route Queue')}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('agent.backToRouteQueue', '← Back to Route Queue')}</span>
                <span className="sm:hidden">{t('agent.backToQueue', 'Queue')}</span>
              </button>

            </div>

            {/* DESKTOP 6-STEP WORKFLOW STEPPER (sm and up) */}
            <div className="hidden sm:grid sm:grid-cols-6 gap-2 pt-2.5 text-xs">
              {stepDefinitions.map((s, idx) => {
                const isPast = curIdx > idx;
                const isCurrent = curIdx === idx;
                const isFuture = curIdx < idx;

                return (
                  <button
                    key={s.id}
                    onClick={() => idx <= curIdx && setActiveStep(s.id as AgentStep)}
                    disabled={isFuture}
                    className={`p-2.5 rounded-xl text-left transition-all relative ${
                      isCurrent
                        ? 'bg-emerald-600 text-white font-black border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/30 scale-[1.02]'
                        : isPast
                        ? 'bg-emerald-50/90 text-emerald-900 border border-emerald-200/90 font-bold hover:bg-emerald-100/90 cursor-pointer'
                        : 'bg-slate-50/60 text-slate-400 border border-slate-200/60 font-medium opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-black ${
                        isCurrent 
                          ? 'bg-emerald-700/80 text-white' 
                          : isPast 
                          ? 'bg-emerald-200/70 text-emerald-800' 
                          : 'bg-slate-200/80 text-slate-500'
                      }`}>
                        [{s.num}]
                      </span>
                      {isPast && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      {isCurrent && (
                        <span className="text-[9px] uppercase font-black tracking-wider bg-white text-emerald-700 px-1 py-0.2 rounded">
                          NOW
                        </span>
                      )}
                    </div>
                    <span className="text-xs block truncate leading-tight">
                      {s.label}
                    </span>
                    <span className="text-[10px] block mt-0.5 truncate font-normal opacity-80">
                      {isPast ? t('agent.stepCompleted', 'Done ✓') : isCurrent ? t('agent.stepInProgress', 'Active') : t('agent.stepPending', 'Pending')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* MOBILE CLEANLY STACKED WORKFLOW (below sm - NO horizontal overflow) */}
            <div className="block sm:hidden pt-2">
              
              {/* Segmented 6-step progress track */}
              <div className="grid grid-cols-6 gap-1.5 mb-2">
                {stepDefinitions.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all ${
                      idx < curIdx
                        ? 'bg-emerald-500'
                        : idx === curIdx
                        ? 'bg-emerald-600 ring-2 ring-emerald-300'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {/* Mobile Active Step Info & Toggle Drawer */}
              <div className="flex items-center justify-between text-xs">
                <div className="font-extrabold text-slate-900 truncate">
                  {curIdx + 1}. {stepDefinitions[curIdx]?.label}
                </div>
                <button
                  onClick={() => setIsMobileStepsExpanded(!isMobileStepsExpanded)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                >
                  <span>{isMobileStepsExpanded ? t('agent.hideSteps', 'Collapse') : t('agent.showAllSteps', 'All 6 Steps')}</span>
                  {isMobileStepsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Mobile Expanded Stacked Timeline (Clean vertical stack) */}
              {isMobileStepsExpanded && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                  {stepDefinitions.map((s, idx) => {
                    const isPast = curIdx > idx;
                    const isCurrent = curIdx === idx;
                    const isFuture = curIdx < idx;

                    return (
                      <div
                        key={s.id}
                        onClick={() => idx <= curIdx && setActiveStep(s.id as AgentStep)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 text-white font-black border-emerald-600 shadow-sm'
                            : isPast
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold cursor-pointer'
                            : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                            isCurrent ? 'bg-white text-emerald-700' : isPast ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {s.num}
                          </span>
                          <div>
                            <span className="font-extrabold block">{s.label}</span>
                            <span className="text-[10px] font-normal opacity-85 block">{s.desc}</span>
                          </div>
                        </div>

                        <div>
                          {isPast && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          {isCurrent && <span className="text-[10px] font-black bg-white text-emerald-700 px-2 py-0.5 rounded-full">ACTION</span>}
                          {isFuture && <span className="text-[10px] text-slate-400">{t('agent.stepPending', 'Pending')}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        );
      })()}

      {/* Step Content Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* STEP 0: ROUTE QUEUE */}
        {activeStep === 'queue' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">{t('agent.assignedRouteQueue', 'Assigned Route Queue')}</h2>
                <p className="text-xs text-slate-500">{t('agent.sectorScheduledSubtitle', 'Pickups scheduled for collection in your sector today.')}</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {t('agent.routeOptimized', 'Route Optimized')} ({pickups.length} {t('agent.stops', 'Stops')})
              </span>
            </div>

            <div className="space-y-3">
              {pickups.map((p) => {
                const isSelected = selectedPickupId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{p.pickupCode}</span>
                        <span className="text-xs font-bold text-emerald-800 uppercase px-2 py-0.5 rounded-md bg-emerald-100/80">
                          {t(`categories.${p.category}`, p.category.replace('_', ' '))}
                        </span>
                        <span className="text-[11px] text-slate-400">• {p.timeSlot}</span>
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 truncate">{p.residentName}</div>
                      <div className="flex items-start gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="break-words leading-relaxed">{p.residentAddress}</span>
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 break-words leading-relaxed">
                          {t('agent.residentNote', 'Resident Note')}: "{p.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('agent.status', 'Status')}</span>
                        <span className="text-xs font-bold text-slate-800 uppercase">{t(`status.${p.status}`, p.status.replace('_', ' '))}</span>
                      </div>

                      <button
                        onClick={() => startJob(p)}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer w-full sm:w-auto"
                      >
                        <span>{t('agent.startCollection', 'Start Collection')}</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1: NAVIGATE */}
        {activeStep === 'navigate' && selectedPickup && (
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Step Guidance Banner: What action is required now */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 text-sm shadow-sm">
                1
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  {t('agent.actionRequiredNow', 'Action Required Now')}
                </span>
                <p className="text-sm font-black text-emerald-950">
                  {t('agent.step1ActionDesc', 'Navigate to resident address and confirm arrival at pickup location.')}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                {t('agent.stepOf', 'Step {{current}} of {{total}}').replace('{{current}}', '1').replace('{{total}}', '6')}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">{t('agent.navigateLocation', 'Navigate to Resident Location')}</h2>
              <p className="text-xs text-slate-500">{t('agent.stepNavigateDesc', 'Follow the municipal route guidance to the pickup spot.')}</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block">{t('agent.residentNameAddress', 'Resident Name & Address')}</span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">{selectedPickup.residentName}</div>
                  <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{selectedPickup.residentAddress}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    ETA: 4 mins
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {t('auth.phone', 'Phone')}: <strong>{selectedPickup.residentPhone || '+91 98450 12345'}</strong>
                </span>
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {t('agent.scheduledTime', 'Scheduled Time')}: <strong>{selectedPickup.timeSlot}</strong>
                </span>
              </div>
            </div>

            {/* Bottom Action Footer with ONE Primary Action and Subdued Secondary Action */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep('queue')}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('agent.backToRouteQueue', '← Back to Route Queue')}</span>
              </button>

              <button
                onClick={() => setActiveStep('verify_customer')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all transform active:scale-95 cursor-pointer"
              >
                <span>{t('agent.arrivedAtLocationVerify', 'Arrived at Location → Verify Customer')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFY CUSTOMER */}
        {activeStep === 'verify_customer' && selectedPickup && (
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Step Guidance Banner: What action is required now */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 text-sm shadow-sm">
                2
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  {t('agent.actionRequiredNow', 'Action Required Now')}
                </span>
                <p className="text-sm font-black text-emerald-950">
                  {t('agent.step2ActionDesc', 'Verify resident identity, confirm declared waste category, and check segregation.')}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                {t('agent.stepOf', 'Step {{current}} of {{total}}').replace('{{current}}', '2').replace('{{total}}', '6')}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">{t('agent.stepVerifyCustomerTitle', 'Verify Customer & Waste Readiness')}</h2>
              <p className="text-xs text-slate-500">{t('agent.stepVerifyCustomerDesc', 'Confirm the resident identity and verify waste is sorted before loading.')}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase block">{t('agent.customerIdentity', 'Customer Identity')}</span>
                <div className="text-sm font-extrabold text-slate-900 capitalize">
                  {t('agent.declaredCategory', 'Declared Category')}: <span className="text-emerald-700">{t(`categories.${selectedPickup.category}`, selectedPickup.category.replace('_', ' '))}</span>
                </div>
                <div className="text-xs text-slate-600">
                  {t('resident.estWeightLabel', 'Estimated Waste Weight')}: <strong className="text-slate-900">{selectedPickup.weightKg || 4.85} KG</strong>
                </div>
                <div className="text-xs text-emerald-700 font-bold">
                  {t('agent.segregationStatus', 'Segregation Status')}: {selectedPickup.isSegregated ? t('agent.verifiedSegregated', 'Strictly Segregated') : t('agent.unsegregatedMixed', 'Unsegregated Mixed')}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase block">{t('agent.stepVerifyTab', 'Verify Customer')}</span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('agent.residentNameAddress', 'Resident Name & Address')}: <strong>{selectedPickup.residentName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('resident.pickupCode', 'Pickup Code')}: <strong>#{selectedPickup.pickupCode}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('agent.iotLoadCellPlatform', 'IoT Load Cell Platform')} Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Footer with ONE Primary Action and Subdued Secondary Action */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep('navigate')}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('agent.backToPreviousStep', '← Back to Previous Step')}</span>
              </button>

              <button
                onClick={() => setActiveStep('weigh')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all transform active:scale-95 cursor-pointer"
              >
                <span>{t('agent.confirmCustomerProceed', 'Confirm Customer & Proceed to Weighing →')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: WEIGH WASTE (ESP32 LOAD CELL) */}
        {activeStep === 'weigh' && selectedPickup && (
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Step Guidance Banner: What action is required now */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 text-sm shadow-sm">
                3
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  {t('agent.actionRequiredNow', 'Action Required Now')}
                </span>
                <p className="text-sm font-black text-emerald-950">
                  {t('agent.step3ActionDesc', 'Place waste container onto the IoT scale platform and record calibrated weight.')}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                {t('agent.stepOf', 'Step {{current}} of {{total}}').replace('{{current}}', '3').replace('{{total}}', '6')}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">{t('agent.stepWeighWasteTitle', 'Weigh Waste via ESP32 Scale')}</h2>
              <p className="text-xs text-slate-500">
                {t('agent.stepWeighWasteDesc', "Place the waste bag onto the vehicle's IoT load cell platform.")}
              </p>
            </div>

            {/* Scale Hardware Display Box */}
            <div className="bg-slate-900 rounded-3xl p-8 text-center text-white border-2 border-slate-800 shadow-inner relative overflow-hidden space-y-4">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-2">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>{t('scaleLab.title', 'ESP32 & HX711 Load Cell Telemetry Lab')}</span>
              </div>

              {useManualWeight ? (
                <div className="max-w-xs mx-auto my-2">
                  <span className="text-xs text-amber-400 block mb-1">{t('agent.manualWeightOverride', 'Manual Weight Override')}</span>
                  <input
                    type="number"
                    step="0.05"
                    value={manualWeightInput}
                    onChange={(e) => setManualWeightInput(e.target.value)}
                    className="w-full text-4xl font-mono font-black text-center bg-slate-800 text-white p-3 rounded-2xl border border-emerald-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 block mt-1">KG</span>
                </div>
              ) : (
                <div className="my-2">
                  <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white">
                    {activeWeight.toFixed(2)}
                    <span className="text-2xl text-emerald-400 ml-2">KG</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-mono">
                    {t('agent.connected', 'Connected')} ({t('agent.demoMode', 'Demo Mode')}) • {t('agent.lastReading', 'Last Reading')}: {lastReadingTime}
                  </p>
                </div>
              )}

              {/* Subdued Secondary Telemetry Controls (Zero Tare / Manual Toggle) */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onScaleTare}
                  className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('agent.zeroTareScale', 'Zero / Tare Scale')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUseManualWeight(!useManualWeight)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                >
                  {useManualWeight ? t('agent.useIotTelemetry', 'Use ESP32 Telemetry') : t('agent.manualWeightOverride', 'Manual Weight Override')}
                </button>
              </div>
            </div>

            {/* Bottom Action Footer with ONE Primary Action and Subdued Secondary Action */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep('verify_customer')}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('agent.backToPreviousStep', '← Back to Previous Step')}</span>
              </button>

              <button
                onClick={() => {
                  handleSimulateVisionInference(selectedPhotoIndex);
                  setActiveStep('ai_verify');
                }}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all transform active:scale-95 cursor-pointer"
              >
                <span>{t('agent.acceptWeightProceed', 'Accept {{weight}} KG & Proceed to AI Verification →').replace('{{weight}}', activeWeight.toFixed(2))}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: AI VERIFICATION */}
        {activeStep === 'ai_verify' && selectedPickup && (
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Step Guidance Banner: What action is required now */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 text-sm shadow-sm">
                4
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  {t('agent.actionRequiredNow', 'Action Required Now')}
                </span>
                <p className="text-sm font-black text-emerald-950">
                  {t('agent.step4ActionDesc', 'Capture waste photo and run MobileNet CNN classification to verify category.')}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                {t('agent.stepOf', 'Step {{current}} of {{total}}').replace('{{current}}', '4').replace('{{total}}', '6')}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">{t('agent.stepAiVerificationTitle', 'AI Verification (MobileNet CNN)')}</h2>
              <p className="text-xs text-slate-500">
                {t('agent.stepAiVerificationDesc', 'Neural network inspects the waste photo to cross-check category honesty.')}
              </p>
            </div>

            {/* Sample Capture Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {t('agent.capturePhotoPreset', 'Simulate Camera Capture / Photo Preset:')}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SAMPLE_WASTE_PHOTOS.map((preset, idx) => (
                  <div
                    key={preset.title}
                    onClick={() => handleSimulateVisionInference(idx)}
                    className={`p-2.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedPhotoIndex === idx
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-20 object-cover rounded-xl mb-1.5"
                    />
                    <div className="text-[11px] font-bold text-slate-900 truncate">
                      {preset.title}
                    </div>
                    <span className="text-[10px] uppercase font-mono text-emerald-700 font-bold block">
                      {t(`categories.${preset.category}`, preset.category)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Classification Results Box */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    {t('visionStudio.modelArchitecture', 'MobileNetV2 Transfer Learning Architecture')}
                  </span>
                </div>
                {isClassifying && (
                  <span className="text-xs text-amber-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t('agent.analyzingImage', 'Analyzing Image with MobileNet CNN...')}
                  </span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4 items-center">
                <div className="rounded-2xl overflow-hidden border border-slate-700 max-h-40">
                  <img
                    src={classifiedData.photoUrl}
                    alt="Captured Load"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('agent.aiDetectedClass', 'AI Detected Class')}</span>
                    <div className="text-lg font-black text-white capitalize">
                      {t(`categories.${classifiedData.category}`, classifiedData.category.replace('_', ' '))}
                    </div>
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      {(classifiedData.confidence * 100).toFixed(1)}% {t('agent.confidence', 'Confidence')}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('admin.declaredByResident', 'Resident Declared')}:</span>
                      <span className="font-bold text-slate-200 capitalize">{t(`categories.${selectedPickup.category}`, selectedPickup.category.replace('_', ' '))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('agent.status', 'Status')}:</span>
                      {classifiedData.mismatch ? (
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {t('agent.categoryMismatch', 'Category Mismatch Detected')}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t('agent.categoryMatch', 'Category Match Verified')} ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Footer with ONE Primary Action and Subdued Secondary Action */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep('weigh')}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('agent.backToPreviousStep', '← Back to Previous Step')}</span>
              </button>

              <button
                onClick={() => setActiveStep('confirm_value')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all transform active:scale-95 cursor-pointer"
              >
                <span>{t('agent.acceptAiProceed', 'Accept AI Classification & Proceed to Confirm Value →')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: CONFIRM VALUE & PRICING ENGINE */}
        {activeStep === 'confirm_value' && selectedPickup && (
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Step Guidance Banner: What action is required now */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 text-sm shadow-sm">
                5
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  {t('agent.actionRequiredNow', 'Action Required Now')}
                </span>
                <p className="text-sm font-black text-emerald-950">
                  {t('agent.step5ActionDesc', 'Review dynamic mathematical buyback formula and confirm final disbursement receipt.')}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                {t('agent.stepOf', 'Step {{current}} of {{total}}').replace('{{current}}', '5').replace('{{total}}', '6')}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">{t('agent.stepConfirmValueTitle', 'Confirm Dynamic Value & Payout')}</h2>
              <p className="text-xs text-slate-500">
                {t('agent.stepConfirmValueDesc', 'Review municipal mathematical pricing formula before generating receipt.')}
              </p>
            </div>

            {/* Connected Pipeline Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-5">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('admin.declaredByResident', 'Declared by Resident')}</span>
                  <span className="text-sm font-extrabold text-slate-900 capitalize mt-0.5 block">
                    {t(`categories.${selectedPickup.category}`, selectedPickup.category.replace('_', ' '))}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('agent.aiDetectedClass', 'AI Detected Class')}</span>
                  <span className="text-sm font-extrabold text-emerald-700 capitalize mt-0.5 block">
                    {t(`categories.${classifiedData.category}`, classifiedData.category)} ({(classifiedData.confidence * 100).toFixed(0)}%)
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('agent.verifiedWeight', 'Verified IoT Weight')}</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block">
                    {activeWeight.toFixed(2)} KG
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('agent.materialRate', 'Material Buyback Rate')}</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block">
                    ₹{materialRate.toFixed(2)}/kg
                  </span>
                </div>
              </div>

              {/* Transparent 3-Part Financial Formulation Breakdown */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">
                    1. {t('resident.onDemandTripFeeLabel', 'EcoCollect On-Demand Doorstep Pickup Fee (P)')}:
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    ₹{onDemandTripFee.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">
                    2. {t('resident.verifiedBuybackValueLabel', 'Verified Recyclable Buyback Value (Rp)')} ({activeWeight.toFixed(2)} kg × ₹{materialRate.toFixed(2)} {incentiveAmount > 0 ? `+ ₹${incentiveAmount.toFixed(2)} incentive` : ''}):
                  </span>
                  <span className="font-mono font-bold text-emerald-600">
                    +₹{verifiedBuyback.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 font-black text-sm">
                  <div>
                    <span className="text-slate-900 block">
                      3. {isCashback
                        ? t('agent.netDisbursement', 'Net Resident UPI Disbursement')
                        : isFeeDue
                        ? t('agent.netFeeDue', 'Net Municipal Fee Due')
                        : t('resident.netZeroBalance', 'Net Zero Balance (Fully Offset)')}:
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {isCashback
                        ? t('resident.buybackOffsetsFeeNotice', 'Recyclable buyback fully offsets the dedicated trip fee with net payout.')
                        : isFeeDue
                        ? t('resident.partialOffsetNotice', 'Buyback partially offsets the dedicated trip fee.')
                        : t('resident.exactOffsetNotice', 'Buyback exactly covers the dedicated trip fee.')}
                    </span>
                  </div>
                  <span className={`font-mono text-xl ${isCashback ? 'text-emerald-600' : isFeeDue ? 'text-amber-600' : 'text-slate-700'}`}>
                    {isCashback ? `+₹${finalSettlementDisplay.toFixed(2)}` : isFeeDue ? `₹${finalSettlementDisplay.toFixed(2)}` : '₹0.00'}
                  </span>
                </div>
              </div>

              {/* Checklist Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200">
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" /> {t('agent.stepAiTab', 'AI Verification')} ✓
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" /> {t('agent.stepWeighTab', 'Weigh Waste')} ✓
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" /> {t('agent.stepValueTab', 'Confirm Value')} ✓
                </span>
                <div className="ml-auto font-mono text-emerald-950 font-black">
                  {isCashback ? `+₹${finalSettlementDisplay.toFixed(2)} UPI` : isFeeDue ? `₹${finalSettlementDisplay.toFixed(2)} Fee` : '₹0.00'}
                </div>
              </div>

            </div>

            {/* Bottom Action Footer with ONE Primary Action and Subdued Secondary Action */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep('ai_verify')}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('agent.backToPreviousStep', '← Back to Previous Step')}</span>
              </button>

              <button
                onClick={handleFinalSubmit}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all transform active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {isCashback 
                    ? t('agent.confirmCollectionReceiptWithAmount', 'Confirm Collection & Dispatch Receipt (₹{{amount}})').replace('{{amount}}', finalSettlementDisplay.toFixed(2))
                    : isFeeDue
                    ? `Confirm Collection & Collect Service Fee (₹${finalSettlementDisplay.toFixed(2)})`
                    : 'Confirm Collection & Dispatch Zero-Balance Receipt'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: COMPLETED */}
        {activeStep === 'completed' && selectedPickup && (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">{t('agent.stepCompletedTitle', 'Pickup Successfully Completed!')}</h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                {t('agent.stepCompletedDesc', 'Weight logged to cloud, receipt dispatched to resident, and UPI payout queued.')}
              </p>
            </div>

            {/* Completed Pickup Summary Receipt Card with 3-Part Breakdown */}
            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between border-b border-slate-200/80 pb-2 font-mono">
                <span className="text-slate-500">{t('agent.pickupPrefix', 'Pickup')}:</span>
                <span className="font-bold text-slate-900">#{selectedPickup.pickupCode}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">{t('agent.residentNameAddress', 'Resident')}:</span>
                <span className="font-bold text-slate-900">{selectedPickup.residentName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">{t('agent.verifiedWeight', 'Verified Weight')}:</span>
                <span className="font-bold font-mono text-slate-900">{activeWeight.toFixed(2)} KG</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">{t('resident.onDemandServiceFee', 'On-Demand Service Fee')}:</span>
                <span className="font-bold font-mono text-slate-700">₹{onDemandTripFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">{t('resident.verifiedRecyclableBuyback', 'Verified Buyback Value')}:</span>
                <span className="font-bold font-mono text-emerald-600">+₹{verifiedBuyback.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-700 font-bold">
                  {isCashback ? t('agent.netDisbursement', 'Net Resident Payout') : isFeeDue ? t('agent.netFeeDue', 'Net Service Fee Due') : t('resident.netZeroBalance', 'Net Zero Balance')}:
                </span>
                <span className={`font-bold font-mono text-sm ${isCashback ? 'text-emerald-600' : isFeeDue ? 'text-amber-600' : 'text-slate-700'}`}>
                  {isCashback ? `+₹${finalSettlementDisplay.toFixed(2)} (Disbursed via UPI)` : isFeeDue ? `₹${finalSettlementDisplay.toFixed(2)} (Collected)` : '₹0.00 (Fully Offset)'}
                </span>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => setActiveStep('queue')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all transform active:scale-95 cursor-pointer mx-auto"
              >
                <span>{t('agent.returnToQueueNextStop', 'Return to Route Queue & Next Stop →')}</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
