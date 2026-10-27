import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  PlusCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Wallet, 
  Award, 
  Sparkles, 
  ArrowRight, 
  Radio,
  FileText,
  CreditCard,
  Zap,
  Info,
  Phone,
  Navigation,
  Check,
  UserCheck,
  Globe,
  Bell,
  Camera,
  Layers,
  Building2,
  Scale,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Home,
  User as UserIcon,
  Leaf,
  Tag,
  Gift,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Pickup, User, WasteCategory, PickupType, PickupStatus, AppNotification } from '../types';
import { 
  calculateDynamicPricing, 
  BASE_PROCESSING_RATES, 
  RECYCLABLE_BUYBACK_RATES, 
  PICKUP_SURCHARGES, 
  WASTE_CATEGORIES_REGISTRY,
  SAMPLE_WASTE_PHOTOS,
  calculateEnvironmentalImpact
} from '../data/pricingConstants';
import { RazorpayModal } from './RazorpayModal';
import { WasteCategorySelector } from './WasteCategorySelector';
import { EnvironmentalImpactCard } from './EnvironmentalImpactCard';
import { NotificationDrawer } from './NotificationDrawer';
import { WasteCameraModal } from './WasteCameraModal';

export type ResidentNavTab = 'home' | 'book' | 'pickups' | 'wallet' | 'points' | 'impact' | 'profile';

interface ResidentAppSimulatorProps {
  currentUser: User;
  pickups: Pickup[];
  onCreatePickup: (pickupData: Partial<Pickup>) => void;
  onSettlePayment: (pickupId: string, txnId: string, isPayout: boolean) => void;
  onOpenScaleView?: () => void;
  onOpenAuth?: () => void;
  activeResidentTab?: ResidentNavTab;
  onResidentTabChange?: (tab: ResidentNavTab) => void;
}

export const ResidentAppSimulator: React.FC<ResidentAppSimulatorProps> = ({
  currentUser,
  pickups,
  onCreatePickup,
  onSettlePayment,
  onOpenScaleView,
  onOpenAuth,
  activeResidentTab,
  onResidentTabChange
}) => {
  const { t } = useLanguage();
  
  // Internal tab state synced with optional prop
  const [activeTab, setActiveTab] = useState<ResidentNavTab>(activeResidentTab || 'home');

  useEffect(() => {
    if (activeResidentTab && activeResidentTab !== activeTab) {
      setActiveTab(activeResidentTab);
    }
  }, [activeResidentTab]);

  const handleTabSwitch = (tab: ResidentNavTab) => {
    setActiveTab(tab);
    if (onResidentTabChange) {
      onResidentTabChange(tab);
    }
  };

  // Booking Wizard State
  const [bookingStep, setBookingStep] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<WasteCategory>('plastic');
  const [categoryDetails, setCategoryDetails] = useState<Record<string, any>>({
    plasticType: 'PET (#1) Bottles',
    cleanliness: 'Clean, rinsed and dry',
    approxWeight: 4.85
  });
  const [pickupType, setPickupType] = useState<PickupType>('routine');
  const [scheduledDate, setScheduledDate] = useState('2026-08-30');
  const [timeSlot, setTimeSlot] = useState('09:00 AM - 11:00 AM');
  const [isSegregated, setIsSegregated] = useState(true);
  const [notes, setNotes] = useState('');
  const [estWeight, setEstWeight] = useState(4.85);
  const [pickupAddress, setPickupAddress] = useState(
    currentUser.savedAddresses && currentUser.savedAddresses.length > 0
      ? `${currentUser.savedAddresses[0].street}, ${currentUser.savedAddresses[0].area}, ${currentUser.savedAddresses[0].city}`
      : `${currentUser.address.street}, ${currentUser.address.area}, ${currentUser.address.city}`
  );

  // Resident AI Detection State (Friendly Resident Experience)
  const [aiScanIndex, setAiScanIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [aiDetectionResult, setAiDetectionResult] = useState<{
    detectedItem: string;
    category: WasteCategory;
    confidence: number;
    confirmed: boolean;
  }>({
    detectedItem: 'PET Beverage Bottle',
    category: 'plastic',
    confidence: 96,
    confirmed: true
  });

  // Settlement & Scanner Modal State
  const [settlementPickup, setSettlementPickup] = useState<Pickup | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isWardScheduleModalOpen, setIsWardScheduleModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Notifications State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif_init_1',
      userId: currentUser.id,
      title: 'Welcome to EcoCollect',
      message: 'Schedule your doorstep recyclable pickup and earn instant transparent UPI buyback!',
      type: 'info',
      timestamp: 'Just now',
      read: false
    }
  ]);

  // Vouchers / Green Points State
  const [userPoints, setUserPoints] = useState(currentUser.rewardPoints || 340);
  const [redeemedVouchers, setRedeemedVouchers] = useState<Array<{ id: string; title: string; code: string; date: string }>>([]);
  const [voucherNotice, setVoucherNotice] = useState<string | null>(null);

  // Filter pickups for current user
  const residentPickups = pickups.filter(p => p.residentId === currentUser.id || !p.residentId);
  const activePickup = residentPickups.find(p => p.status !== 'completed' && p.status !== 'cancelled') || residentPickups[0];
  const completedPickups = residentPickups.filter(p => p.status === 'completed');

  // Computed Financials
  const currentCatConfig = WASTE_CATEGORIES_REGISTRY.find(c => c.id === selectedCategory) || WASTE_CATEGORIES_REGISTRY[0];
  const estimatedPricing = calculateDynamicPricing({
    weightKg: estWeight,
    category: selectedCategory,
    pickupType: pickupType,
    isSegregated: isSegregated
  });
  const estimatedBuyback = estimatedPricing.recyclablePayout + (isSegregated ? 10 : 0);
  const estimatedOnDemandFee = estimatedPricing.processingFee;
  const estimatedNetDiff = estimatedBuyback - estimatedOnDemandFee;
  const isEstimatedCashback = estimatedNetDiff > 0;
  const isEstimatedFeeDue = estimatedNetDiff < 0;
  const totalWeightDiverted = completedPickups.reduce((sum, p) => sum + (p.weightKg || 0), 0);
  const totalEarnedPayout = completedPickups.reduce((sum, p) => sum + (p.recyclablePayout || 0), 0);
  const pendingAmount = residentPickups
    .filter(p => p.status !== 'completed' && p.status !== 'cancelled' && p.netSettlement > 0)
    .reduce((sum, p) => sum + p.netSettlement, 0);

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  const handleSelectCategory = (cat: WasteCategory) => {
    setSelectedCategory(cat);
    const config = WASTE_CATEGORIES_REGISTRY.find(c => c.id === cat);
    if (config && config.fieldDefinitions.length > 0) {
      const firstField = config.fieldDefinitions[0];
      setCategoryDetails(prev => ({
        ...prev,
        [firstField.key]: firstField.options ? firstField.options[0] : ''
      }));
    }
  };

  const handleCategoryDetailChange = (key: string, value: any) => {
    setCategoryDetails(prev => ({ ...prev, [key]: value }));
    if (key === 'approxWeight') {
      const w = parseFloat(value);
      if (!isNaN(w) && w > 0) setEstWeight(w);
    }
  };

  // Run AI Waste Detection Simulation
  const handleRunAiDetection = (index: number) => {
    setAiScanIndex(index);
    setIsScanning(true);
    const sample = SAMPLE_WASTE_PHOTOS[index] || SAMPLE_WASTE_PHOTOS[0];

    setTimeout(() => {
      setIsScanning(false);
      setAiDetectionResult({
        detectedItem: sample.title,
        category: sample.category,
        confidence: Math.round(sample.confidence * 100),
        confirmed: false
      });
    }, 600);
  };

  const handleConfirmAiDetection = () => {
    setSelectedCategory(aiDetectionResult.category);
    setAiDetectionResult(prev => ({ ...prev, confirmed: true }));
  };

  const handleApplyCameraAnalysis = (category: WasteCategory, details: {
    detectedItem: string;
    estimatedWeightKg: number;
    photoUrl?: string;
    condition?: string;
    confidence?: number;
    topGuesses?: any[];
    userCorrection?: {
      originalCategory: WasteCategory;
      correctedCategory: WasteCategory;
      timestamp: string;
    };
  }) => {
    if (category === 'not_waste_or_unclear') {
      return;
    }
    handleSelectCategory(category);
    if (details.estimatedWeightKg && details.estimatedWeightKg > 0) {
      setEstWeight(details.estimatedWeightKg);
    }
    if (details.condition || details.userCorrection) {
      setCategoryDetails(prev => ({
        ...prev,
        cleanliness: details.condition || (prev as any).cleanliness,
        specialNotes: details.userCorrection 
          ? `[AI Correction]: User corrected from ${details.userCorrection.originalCategory} to ${details.userCorrection.correctedCategory}`
          : (prev as any).specialNotes
      }));
    }
    setAiDetectionResult({
      detectedItem: details.detectedItem,
      category: category,
      confidence: details.confidence || 90,
      confirmed: true
    });
    // Switch to book tab and advance to step 2 so user can review details
    handleTabSwitch('book');
    setBookingStep(2);
  };

  const handleRedeemReward = (reward: { title: string; cost: number }) => {
    if (userPoints < reward.cost) {
      alert(`Insufficient Green Points. You need ${reward.cost} points to redeem this.`);
      return;
    }
    const voucherCode = `ECO-${Math.floor(100000 + Math.random() * 900000)}`;
    setUserPoints(prev => prev - reward.cost);
    setRedeemedVouchers(prev => [
      { id: Date.now().toString(), title: reward.title, code: voucherCode, date: new Date().toLocaleDateString() },
      ...prev
    ]);
    setVoucherNotice(`Redeemed ${reward.title}! Your voucher code is ${voucherCode}`);
    setTimeout(() => setVoucherNotice(null), 7000);
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreatePickup({
      category: selectedCategory,
      pickupType: pickupType,
      scheduledDate: scheduledDate,
      timeSlot: timeSlot,
      isSegregated: isSegregated,
      weightKg: estWeight,
      notes: notes,
      residentAddress: pickupAddress,
      itemDetails: categoryDetails,
      wastePhotoUrl: SAMPLE_WASTE_PHOTOS[aiScanIndex]?.url
    });

    // Reset and switch to pickups view
    setBookingStep(1);
    handleTabSwitch('pickups');

    // Add confirmation notification
    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        userId: currentUser.id,
        title: 'Doorstep Pickup Scheduled',
        message: `Your ${selectedCategory.replace('_', ' ')} collection is confirmed for ${scheduledDate} (${timeSlot}).`,
        type: 'success',
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Resident Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 border border-emerald-800/40 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {t('resident.portalTitle', 'EcoCollect Resident Portal')}
              </span>
              <span className="text-xs text-slate-300">{t('resident.verifiedNetwork', 'Verified Municipal Recycling Network')}</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">
              {t('resident.welcomeBack', 'Welcome back, {{name}}').replace('{{name}}', currentUser.name)}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              {currentUser.address.area}, {currentUser.address.city} • UPI: {currentUser.upiId || 'priya@okhdfcbank'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Balance & Points Pill */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 rounded-2xl flex items-center gap-4 text-left">
              <div>
                <span className="text-[10px] text-slate-300 uppercase font-bold block">{t('resident.walletBalance', 'Wallet Balance')}</span>
                <span className="text-sm font-black text-emerald-300 font-mono">
                  ₹{currentUser.walletBalance.toFixed(2)}
                </span>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div>
                <span className="text-[10px] text-slate-300 uppercase font-bold block">{t('resident.rewardPoints', 'Green Points')}</span>
                <span className="text-sm font-black text-amber-300 font-mono flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {userPoints}
                </span>
              </div>
            </div>

            {/* Notification Bell */}
            <button
              id="resident-notif-bell-btn"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition-colors cursor-pointer"
              title={t('resident.notifications', 'Notifications')}
            >
              <Bell className="w-5 h-5 text-emerald-100" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation Bar */}
      <nav
        aria-label="Resident Portal Navigation"
        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-1.5 sm:p-2 flex items-center overflow-x-auto scrollbar-none"
      >
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          {[
            { id: 'home', label: t('resident.homeTab', 'Home'), icon: Home },
            { id: 'book', label: t('resident.bookPickupTab', 'Book On-Demand'), icon: PlusCircle },
            { id: 'pickups', label: t('resident.myPickupsTab', 'My Pickups'), icon: Clock },
            { id: 'wallet', label: t('resident.walletTab', 'Wallet'), icon: Wallet },
            { id: 'points', label: t('resident.greenPointsTab', t('resident.pointsTab', 'Green Points')), icon: Award },
            { id: 'impact', label: t('resident.impactTab', 'Impact'), icon: Leaf },
            { id: 'profile', label: t('resident.profileTab', 'Profile'), icon: UserIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`resident-nav-${tab.id}`}
                onClick={() => handleTabSwitch(tab.id as ResidentNavTab)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 lg:px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* TAB 1: HOME */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          
          {/* Welcome & Value Proposition Hero Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="max-w-2xl relative z-10">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {t('resident.heroBadge', 'Smart Waste Collection, Made Simple.')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 tracking-tight">
                {t('resident.heroHeading', 'Recycle Responsibly. Get Verified. Earn Instant UPI Value.')}
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {t('resident.heroSubtitle', 'Request a dedicated doorstep pickup, verify your waste on our IoT scale, and earn transparent UPI cashback.')}
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-6">
                <button
                  id="home-primary-schedule-btn"
                  onClick={() => handleTabSwitch('book')}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t('resident.schedulePickup', 'Book On-Demand Pickup')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  id="home-scan-waste-btn"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-emerald-500/40"
                  title="Scan Waste with AI Camera"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>{t('resident.scanWasteBtn', 'Scan Waste (AI)')}</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </button>
                <button
                  id="home-secondary-pickups-btn"
                  onClick={() => handleTabSwitch('pickups')}
                  className="px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>{t('resident.viewMyPickups', 'View My Pickups')}</span>
                </button>
                <button
                  id="home-ward-schedule-btn"
                  onClick={() => setIsWardScheduleModalOpen(true)}
                  className="px-4 py-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{t('resident.viewWardScheduleBtn', 'View Regular Ward Schedule')}</span>
                </button>
              </div>
            </div>

            <div className="absolute -right-8 -bottom-8 w-60 h-60 rounded-full bg-emerald-500/10 pointer-events-none"></div>
          </div>

          {/* AI Waste Camera Scanner Feature Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 border border-emerald-800/40 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  AI Waste Camera Scanner
                </span>
                <span className="text-[11px] text-slate-300">Instant Material & Buyback Check</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {t('resident.scanWasteCardTitle', 'Unsure how to segregate or what your recyclables are worth?')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('resident.scanWasteCardSubtitle', 'Use your camera or upload a photo to identify plastic, paper, metal, e-waste, or hazardous scrap. Get instant recyclability status, segregation guidelines, and auto-route to verified recyclers.')}
              </p>
            </div>
            <button
              id="home-callout-scan-btn"
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="shrink-0 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>{t('resident.launchScannerBtn', 'Scan Waste with Camera')}</span>
            </button>
          </div>

          {/* CRITICAL SERVICE SEPARATION: Regular Municipal vs EcoCollect On-Demand Pickup */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-700">
                  {t('resident.serviceClarityTitle', 'Service Framework & Separation')}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {t('resident.chooseServiceType', 'Regular Municipal Collection vs. EcoCollect On-Demand Pickup')}
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {t('resident.allCategoriesSupported', 'All waste categories supported across Bengaluru wards')}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Option A: Regular Municipal Collection */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {t('resident.regularMunicipalFree', '100% Free Public Service (No Booking Fee)')}
                    </span>
                    <Building2 className="w-5 h-5 text-slate-600" />
                  </div>

                  <h4 className="text-base font-black text-slate-900">
                    {t('resident.regularMunicipalTitle', 'Regular Municipal Waste Collection')}
                  </h4>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('resident.regularMunicipalNoBooking', 'No special booking required.')}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('resident.regularMunicipalDesc', 'Normal municipal collection schedule for wet and dry household waste. No special booking is required. Residents do not pay an EcoCollect special pickup fee for this regular routine. Hand over segregated waste during scheduled van arrival.')}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 block">{t('resident.scheduleHeading', 'Ward Schedule:')}</span>
                    <p className="text-slate-600 leading-tight">
                      {t('resident.regularMunicipalTiming', 'Indiranagar Ward 84 • Wet Waste: Daily 07:00 - 09:30 AM | Dry Recyclables: Wed & Sat 10:00 AM - 12:30 PM')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWardScheduleModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>{t('resident.viewWardScheduleBtn', 'View Ward Schedule & Guidelines')}</span>
                </button>
              </div>

              {/* Option B: EcoCollect On-Demand Doorstep Pickup */}
              <div className="bg-emerald-950 text-white rounded-2xl p-5 border border-emerald-800/80 flex flex-col justify-between space-y-4 shadow-md relative overflow-hidden">
                <div className="relative z-10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {t('resident.onDemandPickupRequestSpecial', 'Special Doorstep Request')}
                    </span>
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>

                  <h4 className="text-base font-black text-white">
                    {t('resident.onDemandPickupTitle', 'EcoCollect On-Demand Doorstep Pickup')}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t('resident.onDemandPickupDesc', 'Special doorstep pickup requested by the resident outside the normal municipal collection schedule. The collection agent makes a dedicated trip. An on-demand service fee applies, which can be partially or fully offset by verified recyclable buyback.')}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-emerald-200 space-y-1">
                    <span className="font-bold text-emerald-400 block">{t('resident.keyBenefitsHeading', 'Dedicated Doorstep Features:')}</span>
                    <p className="text-slate-300 leading-tight">
                      {t('resident.onDemandPickupHighlights', 'Dedicated EV Cargo Van • Digital IoT Weighing • Buyback Offsets Fee • Direct UPI Payout')}
                    </p>
                    <div className="pt-1 text-[10px] text-amber-300 font-mono">
                      {t('resident.netSettlementFormula', 'Net = Verified Buyback Value - On-Demand Pickup Fee')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  id="book-on-demand-from-card-btn"
                  onClick={() => handleTabSwitch('book')}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer relative z-10"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t('resident.schedulePickup', 'Book On-Demand Doorstep Pickup')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Wallet Card */}
            <div 
              onClick={() => handleTabSwitch('wallet')}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs cursor-pointer hover:border-emerald-300 transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('resident.walletBalance', 'Wallet Balance')}</span>
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{currentUser.walletBalance.toFixed(2)}
              </div>
              <div className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                <span>{t('resident.instantUpiCredited', 'Instant UPI credited')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Green Points Card */}
            <div 
              onClick={() => handleTabSwitch('points')}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs cursor-pointer hover:border-amber-300 transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('resident.rewardPoints', 'Green Points')}</span>
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {userPoints}
              </div>
              <div className="text-[11px] text-amber-700 font-bold mt-1 flex items-center gap-1">
                <span>{t('resident.redeemVouchers', 'Redeem vouchers')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Total Recycled Card */}
            <div 
              onClick={() => handleTabSwitch('impact')}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs cursor-pointer hover:border-emerald-300 transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('resident.wasteRecycled', 'Waste Recycled')}</span>
                <Leaf className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {(totalWeightDiverted || 24.8).toFixed(1)} KG
              </div>
              <div className="text-[11px] text-teal-700 font-bold mt-1">
                {t('resident.co2SavedEst', 'Estimated 45.1 kg CO₂ saved')}
              </div>
            </div>

            {/* Active Request Card */}
            <div 
              onClick={() => handleTabSwitch('pickups')}
              className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-xs cursor-pointer hover:border-emerald-300 transition-all"
            >
              <div className="flex items-center justify-between text-emerald-800 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">{t('resident.activePickup', 'Active Pickup')}</span>
                <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
              </div>
              <div className="text-base font-black text-slate-900 font-mono">
                {activePickup ? activePickup.pickupCode : 'None Active'}
              </div>
              <div className="text-[11px] text-emerald-800 font-bold mt-1 capitalize">
                {activePickup ? t(`status.${activePickup.status}`, activePickup.status.replace('_', ' ')) : t('resident.readyToSchedule', 'Ready to schedule')}
              </div>
            </div>

          </div>

          {/* Active Pickup Live Progress (if available) */}
          {activePickup && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {activePickup.pickupCode}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {activePickup.category.replace('_', ' ')} Collection
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Scheduled: {activePickup.scheduledDate} ({activePickup.timeSlot})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {t(`status.${activePickup.status}`, activePickup.status.replace('_', ' '))}
                  </span>
                  <button
                    onClick={() => handleTabSwitch('pickups')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <span>{t('resident.track', 'Track')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lifecycle Progress Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                {[
                  { key: 'requested', label: t('resident.stepRequested', '1. Requested') },
                  { key: 'assigned', label: t('resident.stepAssigned', '2. Assigned') },
                  { key: 'en_route', label: t('resident.stepEnRoute', '3. En Route') },
                  { key: 'collected', label: t('resident.stepWeighed', '4. IoT Weighed') },
                  { key: 'verified', label: t('resident.stepVerified', '5. AI Verified') },
                  { key: 'completed', label: t('resident.stepSettled', '6. Settled') }
                ].map((step, idx) => {
                  const statusOrder: PickupStatus[] = ['requested', 'assigned', 'en_route', 'in_progress', 'collected', 'verified', 'priced', 'recycling_processing', 'completed'];
                  const curIdx = statusOrder.indexOf(activePickup.status);
                  const stepIdx = statusOrder.indexOf(step.key as PickupStatus);
                  const isDone = curIdx >= stepIdx;

                  return (
                    <div 
                      key={step.key}
                      className={`p-2.5 rounded-xl border text-left text-xs ${
                        isDone
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{step.label}</span>
                        {isDone && <Check className="w-3 h-3 text-emerald-600" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Transparent Material Value Rates Ticker */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400">
                  {t('resident.dailyMarketIndex', 'Daily Municipal Market Index')}
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {t('resident.verifiedBuybackRates', "Today's Verified Recyclable Buyback Rates")}
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {t('resident.updatedDailyBbmp', 'Updated Daily • BBMP Solid Waste Division')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { name: t('category.plastic', 'PET Plastic (#1)'), rate: '₹18.00 / kg', note: t('resident.cleanBottlesNote', 'Clean beverage bottles'), icon: '🍶' },
                { name: t('category.paper', 'Paper & Cardboard'), rate: '₹12.00 / kg', note: t('resident.cartonsNote', 'Corrugated cartons'), icon: '📦' },
                { name: t('category.metal', 'Metal & Aluminum'), rate: '₹32.00 / kg', note: t('resident.cansScrapNote', 'Beverage cans & scrap'), icon: '🥫' },
                { name: t('category.ewaste', 'E-Waste Devices'), rate: '₹45.00 / kg', note: t('resident.laptopsScrapNote', 'Laptops, phones & PCBs'), icon: '💻' }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-2xl text-left">
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="font-bold text-xs text-white">{item.name}</div>
                  <div className="font-mono font-extrabold text-emerald-400 text-sm mt-0.5">{item.rate}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: BOOK PICKUP (GUIDED WIZARD) */}
      {activeTab === 'book' && (
        <form onSubmit={handleBookSubmit} className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Booking Flow Stepper Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                  {t('resident.pickupWizard', 'Dedicated Doorstep Wizard')}
                </span>
                <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {t('resident.onDemandSpecialService', 'On-Demand Service')}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                {t('resident.scheduleDoorstepPickup', 'Book On-Demand Doorstep Pickup')}
              </h2>
            </div>

            {/* Progress Indicator: Waste -> Details & AI -> Schedule -> Confirm */}
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {[
                { step: 1, label: t('resident.step1WasteType', '1. Waste Type') },
                { step: 2, label: t('resident.step2DetailsAi', '2. Details & AI') },
                { step: 3, label: t('resident.step3ValueSchedule', '3. Value & Schedule') },
                { step: 4, label: t('resident.step4Confirm', '4. Confirm') }
              ].map((s, idx) => (
                <React.Fragment key={s.step}>
                  <span className={`px-2.5 py-1 rounded-xl transition-all ${
                    bookingStep === s.step
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : bookingStep > s.step
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {s.label}
                  </span>
                  {idx < 3 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* On-Demand Doorstep Pickup Context Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-emerald-950 block">
                  {t('resident.onDemandBannerTitle', 'EcoCollect On-Demand Doorstep Pickup Service')}
                </span>
                <p className="text-emerald-800 leading-relaxed mt-0.5 text-[11px]">
                  {t('resident.onDemandBannerDesc', 'You are booking a dedicated doorstep pickup outside the normal municipal collection schedule. A collection agent makes a special trip. The on-demand service fee is offset by verified recyclable buyback. (For free regular municipal collection, check your ward schedule — no booking required).')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsWardScheduleModalOpen(true)}
              className="shrink-0 px-3 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('resident.viewWardScheduleBtn', 'Check Free Ward Schedule')}</span>
            </button>
          </div>

          {/* STEP 1: Waste Type Selection */}
          {bookingStep === 1 && (
            <div className="space-y-6">
              {/* AI Camera Assist Banner */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                    <Camera className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {t('resident.aiCameraAssistTitle', 'Unsure which waste category to pick?')}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {t('resident.aiCameraAssistDesc', 'Scan your waste item using your camera or gallery to auto-detect category, recyclability, and buyback value.')}
                    </p>
                  </div>
                </div>
                <button
                  id="book-step1-scan-waste-btn"
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t('resident.scanWasteBtn', 'Scan Waste with Camera')}</span>
                </button>
              </div>

              <WasteCategorySelector
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
                categoryDetails={categoryDetails}
                onDetailChange={handleCategoryDetailChange}
              />

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  id="book-step1-next-btn"
                  onClick={() => setBookingStep(2)}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <span>{t('resident.continueDetailsAi', 'Continue to Details & AI Detection')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Subcategory & Resident AI Detection */}
          {bookingStep === 2 && (
            <div className="space-y-6">
              
              {/* Material Subcategory & Condition */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('resident.materialDetailsFor', 'Material Details for')} {currentCatConfig.name}
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {t('resident.estimatedWeightLabel', 'Estimated Weight (KG)')}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="50"
                        value={estWeight}
                        onChange={(e) => setEstWeight(parseFloat(e.target.value) || 1)}
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800 bg-white"
                      />
                      <span className="text-xs font-bold text-slate-500 font-mono">KG</span>
                    </div>

                    {/* Quick weight presets */}
                    <div className="flex gap-1.5 mt-2">
                      {[1, 3, 4.85, 10, 20].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setEstWeight(w)}
                          className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                            estWeight === w
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {w}kg
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {t('resident.materialCondition', 'Material Condition')}
                    </label>
                    <select
                      value={categoryDetails.cleanliness || 'Clean, rinsed and dry'}
                      onChange={(e) => handleCategoryDetailChange('cleanliness', e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                    >
                      <option value="Clean, rinsed and dry">{t('resident.cleanRinsedDry', 'Clean, rinsed and dry (Max Value)')}</option>
                      <option value="Lightly soiled">{t('resident.lightlySoiled', 'Lightly soiled')}</option>
                      <option value="Broken / Scrap parts">{t('resident.brokenScrap', 'Broken / Scrap parts')}</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {t('resident.cleanWasteNote', 'Properly cleaned & dry waste gets verified without deductions.')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resident AI Waste Detection (Friendly, Non-Technical UI) */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        {t('resident.aiVisionStudioTitle', 'AI Waste Detection (Optional Verification)')}
                      </h4>
                      <p className="text-xs text-slate-300">
                        {t('resident.aiVisionStudioSubtitle', 'Capture or pick a sample photo to verify material category.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="book-step2-scan-real-waste-btn"
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{t('resident.scanRealWasteBtn', 'Scan Real Waste')}</span>
                    </button>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 hidden sm:inline-block">
                      {t('resident.smartVisionAssistant', 'Smart Vision Assistant')}
                    </span>
                  </div>
                </div>

                {/* Sample Photo Thumbnails */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {SAMPLE_WASTE_PHOTOS.map((sample, idx) => (
                    <button
                      key={sample.title || idx}
                      type="button"
                      onClick={() => handleRunAiDetection(idx)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                        aiScanIndex === idx
                          ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                          : 'border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={sample.url}
                        alt={sample.title}
                        className="w-full h-14 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[9px] font-bold block p-1 bg-slate-950/90 text-slate-200 truncate">
                        {sample.category}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Friendly AI Detection Output Card */}
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {isScanning ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t('resident.analyzingTexture', 'Analyzing material texture and classification...')}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{t('resident.detectedWaste', 'Detected Waste')}:</span>
                        <span className="text-xs font-extrabold text-white">{aiDetectionResult.detectedItem}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">{t('resident.category', 'Category')}:</span>
                        <span className="text-xs font-bold text-emerald-400 capitalize">{t(`category.${aiDetectionResult.category}`, aiDetectionResult.category.replace('_', ' '))}</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs font-mono font-bold text-emerald-300">
                          {aiDetectionResult.confidence}% {t('resident.confidenceText', 'confidence')}
                        </span>
                      </div>

                      {aiDetectionResult.confidence < 80 ? (
                        <div className="text-[11px] text-amber-300 flex items-center gap-1.5 mt-2 bg-amber-950/60 p-2 rounded-lg border border-amber-500/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{t('resident.lowConfidenceWarning', 'AI confidence is low. Please confirm the waste category manually.')}</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-300 mt-1.5">
                          {t('resident.looksCorrect', 'Does this look correct?')}
                        </p>
                      )}
                    </div>
                  )}

                  {!isScanning && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmAiDetection}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('resident.yesContinue', 'Yes, Continue')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingStep(1)}
                        className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs"
                      >
                        {t('resident.changeCategory', 'Change Category')}
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Back and Forward Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  {t('resident.backToWasteType', '← Back to Waste Type')}
                </button>
                <button
                  type="button"
                  id="book-step2-next-btn"
                  onClick={() => setBookingStep(3)}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
                >
                  <span>{t('resident.continueToValueSchedule', 'Continue to Value & Schedule')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: Transparent Value Estimation & Pickup Schedule */}
          {bookingStep === 3 && (
            <div className="space-y-6">
              
              {/* Transparent Estimated Value Breakdown */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                      {t('resident.transparentPricing', 'Transparent On-Demand Pricing Formulation')}
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      {t('resident.onDemandFeeNotice', 'On-Demand Doorstep Pickup Fee offset by Recyclable Buyback')}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-md border border-emerald-300 w-fit">
                    {t('resident.estimatedValue', 'Estimated Formulation')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('resident.selectedMaterial', 'Selected Material')}</span>
                    <span className="text-xs font-extrabold text-slate-900 capitalize">
                      {t(`category.${selectedCategory}`, selectedCategory.replace('_', ' '))}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('resident.weight', 'Weight')}</span>
                    <span className="text-xs font-extrabold text-slate-900 font-mono">
                      {estWeight} KG
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('resident.baseRate', 'Base Buyback Rate')}</span>
                    <span className="text-xs font-extrabold text-slate-900 font-mono">
                      ₹{currentCatConfig.buybackRate.toFixed(2)}/kg
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('resident.segregationBonus', 'Segregation Bonus')}</span>
                    <span className="text-xs font-extrabold text-emerald-600 font-mono">
                      {isSegregated ? '+₹10.00' : '₹0.00'}
                    </span>
                  </div>
                </div>

                {/* 3-Part Detailed Financial Breakdown */}
                <div className="p-4 rounded-xl bg-white border border-emerald-200 text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">
                      1. {t('resident.onDemandTripFeeLabel', 'EcoCollect On-Demand Doorstep Pickup Fee (P)')}:
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      ₹{estimatedOnDemandFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">
                      2. {t('resident.verifiedBuybackValueLabel', 'Verified Recyclable Buyback Value (Rp)')} ({estWeight} kg × ₹{currentCatConfig.buybackRate.toFixed(2)} + bonus):
                    </span>
                    <span className="font-mono font-bold text-emerald-600">
                      +₹{estimatedBuyback.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 font-black text-sm">
                    <div>
                      <span className="text-slate-900 block">
                        3. {isEstimatedCashback 
                          ? t('resident.netCashbackPayout', 'Net Instant Cashback Payout to Resident (UPI):') 
                          : isEstimatedFeeDue 
                          ? t('resident.netServiceFeePayable', 'Net Service Fee Payable by Resident:') 
                          : t('resident.netZeroBalance', 'Net Zero Balance (Fully Offset):')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {isEstimatedCashback 
                          ? t('resident.buybackOffsetsFeeNotice', 'Recyclable buyback fully offsets the dedicated trip fee with net payout.') 
                          : isEstimatedFeeDue 
                          ? t('resident.partialOffsetNotice', 'Buyback partially offsets the dedicated trip fee.') 
                          : t('resident.exactOffsetNotice', 'Buyback exactly covers the dedicated trip fee.')}
                      </span>
                    </div>
                    <span className={`text-xl font-mono ${isEstimatedCashback ? 'text-emerald-600' : isEstimatedFeeDue ? 'text-amber-600' : 'text-slate-700'}`}>
                      {isEstimatedCashback ? `+₹${estimatedNetDiff.toFixed(2)}` : isEstimatedFeeDue ? `₹${Math.abs(estimatedNetDiff).toFixed(2)}` : '₹0.00'}
                    </span>
                  </div>
                </div>

                {/* Separation Reminder Callout */}
                <div className="p-3 rounded-xl bg-emerald-100/60 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>{t('resident.municipalReminderTitle', 'Reminder')}:</strong> {t('resident.municipalReminderText', 'Regular Municipal Collection for household waste operates daily with ₹0 fee and requires no booking. On-demand doorstep pickup sends a dedicated agent and vehicle outside the regular schedule.')}
                  </p>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  {t('resident.estimatedNote', '* Note: This is an Estimated Value. The final payout will be confirmed upon physical IoT scale weighing during pickup.')}
                </p>
              </div>

              {/* Address & Slot Selection */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    {t('resident.pickupAddressLabel', 'Pickup Address')}
                  </label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                    placeholder={t('resident.enterAddressPlaceholder', 'Enter full flat / street address')}
                    required
                  />
                  {currentUser.savedAddresses && (
                    <div className="flex gap-1.5 flex-wrap">
                      {currentUser.savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => setPickupAddress(`${addr.street}, ${addr.area}, ${addr.city}`)}
                          className="text-[10px] bg-slate-100 hover:bg-emerald-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium"
                        >
                          📍 {addr.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    {t('resident.scheduleDateLabel', 'Collection Date & Time Slot')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                      required
                    />
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                    >
                      <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                      <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                      <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                      <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Segregation Guarantee Toggle */}
              <div 
                onClick={() => setIsSegregated(!isSegregated)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  isSegregated ? 'bg-emerald-50/70 border-emerald-400' : 'bg-amber-50/70 border-amber-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isSegregated ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {isSegregated ? t('resident.segregatedGuaranteeLabel', '✓ Segregated Waste Guarantee') : t('resident.mixedWasteLabel', '✕ Mixed Waste (Processing Fee Applies)')}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isSegregated ? t('resident.segregatedIncentiveNote', 'Qualifies for full buyback + ₹10 segregation incentive') : t('resident.mixedWasteNote', 'Higher sorting cost applied')}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {isSegregated ? t('resident.subsidyBonus', '20% Subsidy Bonus') : t('resident.noBonus', 'No Bonus')}
                </span>
              </div>

              {/* Back and Forward Controls */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 text-center cursor-pointer"
                >
                  {t('resident.backToDetailsAi', '← Back to Details & AI')}
                </button>
                <button
                  type="button"
                  id="book-step3-next-btn"
                  onClick={() => setBookingStep(4)}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <span>{t('resident.reviewConfirmPickup', 'Review & Confirm Pickup')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: Review & Final Confirmation */}
          {bookingStep === 4 && (
            <div className="space-y-6">
              
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {t('resident.confirmSummaryTitle', 'Please Confirm Your Pickup Summary')}
                </h3>

                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">{t('resident.wasteCategoryLabel', 'Waste Category:')}</span>
                      <span className="font-bold text-slate-900 capitalize">{t(`category.${selectedCategory}`, selectedCategory.replace('_', ' '))}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">{t('resident.estimatedWeightLabel', 'Estimated Weight:')}</span>
                      <span className="font-mono font-bold text-slate-900">{estWeight} KG</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">{t('resident.cleanlinessLabel', 'Cleanliness:')}</span>
                      <span className="font-semibold text-emerald-700">
                        {categoryDetails.cleanliness 
                          ? (categoryDetails.cleanliness === 'Clean, rinsed and dry' 
                              ? t('resident.cleanRinsedDry', 'Clean, rinsed and dry') 
                              : categoryDetails.cleanliness === 'Lightly soiled' 
                              ? t('resident.lightlySoiled', 'Lightly soiled') 
                              : t('resident.brokenScrap', 'Broken / Scrap parts')) 
                          : t('resident.cleanAndDry', 'Clean & Dry')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">{t('resident.destinedFacilityLabel', 'Destined Facility:')}</span>
                      <span className="font-semibold text-slate-800">{currentCatConfig.recyclingFacility}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">{t('resident.pickupDateLabel', 'Pickup Date:')}</span>
                      <span className="font-bold text-slate-900">{scheduledDate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">{t('resident.timeSlotSummaryLabel', 'Time Slot:')}</span>
                      <span className="font-bold text-slate-900">{timeSlot}</span>
                    </div>
                    <div className="flex justify-between items-start py-1 border-b border-slate-200/60 gap-3">
                      <span className="text-slate-500 shrink-0">{t('resident.addressLabel', 'Address:')}</span>
                      <span className="font-medium text-slate-800 text-right break-words whitespace-normal">{pickupAddress}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">{t('resident.payoutUpiLabel', 'Payout UPI ID:')}</span>
                      <span className="font-mono font-bold text-emerald-600">{currentUser.upiId || 'priya@okhdfcbank'}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Net Settlement Breakdown Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                    <span className="font-bold text-slate-700">
                      {t('resident.serviceTypeSummary', 'Selected Service:')}
                    </span>
                    <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {t('resident.onDemandDoorstepPickup', 'EcoCollect On-Demand Doorstep Pickup')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>{t('resident.onDemandTripFeeLabel', 'On-Demand Doorstep Pickup Fee (P)')}:</span>
                      <span className="font-mono font-bold text-slate-800">₹{estimatedOnDemandFee.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>{t('resident.verifiedBuybackValueLabel', 'Verified Recyclable Buyback Value (Rp)')}:</span>
                      <span className="font-mono font-bold text-emerald-600">+₹{estimatedBuyback.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-extrabold text-sm">
                      <div>
                        <span className="text-slate-900 block">
                          {isEstimatedCashback 
                            ? t('resident.netCashbackPayout', 'Net Instant Cashback Payout to Resident (UPI):') 
                            : isEstimatedFeeDue 
                            ? t('resident.netServiceFeePayable', 'Net Service Fee Payable by Resident:') 
                            : t('resident.netZeroBalance', 'Net Zero Balance (Fully Offset):')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {t('resident.subjectToIot', 'Subject to IoT scale verification during collection')}
                        </span>
                      </div>
                      <span className={`text-xl font-mono ${isEstimatedCashback ? 'text-emerald-600' : isEstimatedFeeDue ? 'text-amber-600' : 'text-slate-700'}`}>
                        {isEstimatedCashback ? `+₹${estimatedNetDiff.toFixed(2)}` : isEstimatedFeeDue ? `₹${Math.abs(estimatedNetDiff).toFixed(2)}` : '₹0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookingStep(3)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 text-center cursor-pointer"
                >
                  {t('resident.backToSchedule', '← Back to Schedule')}
                </button>
                <button
                  type="submit"
                  id="confirm-schedule-pickup-btn"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{t('resident.confirmAndScheduleBtn', 'Confirm & Schedule Pickup')}</span>
                </button>
              </div>

            </div>
          )}

        </form>
      )}

      {/* TAB 3: MY PICKUPS */}
      {activeTab === 'pickups' && (
        <div className="space-y-6">
          
          {/* Active Pickup Section */}
          {activePickup ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {activePickup.pickupCode}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {t(`category.${activePickup.category}`, activePickup.category.replace('_', ' '))} {t('resident.collectionSuffix', 'Collection')}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    {t('resident.doorstepPickupStatus', 'Doorstep Pickup Status')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('resident.slotLabel', 'Slot:')} {activePickup.scheduledDate} ({activePickup.timeSlot}) • {activePickup.residentAddress}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('resident.currentStage', 'Current Stage')}</span>
                  <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {t(`status.${activePickup.status}`, activePickup.status.replace('_', ' '))}
                  </span>
                </div>
              </div>

              {/* Complete 6-Step Visual Progression Stepper */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {t('resident.lifecycleProgression', 'Collection Lifecycle Progression')}
                </span>
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {[
                    { key: 'requested', label: t('resident.stepRequested', '1. Requested'), desc: t('resident.slotRegistered', 'Slot Registered') },
                    { key: 'assigned', label: t('resident.stepAssigned', '2. Assigned'), desc: t('resident.agentAllocated', 'Agent Allocated') },
                    { key: 'en_route', label: t('resident.stepEnRoute', '3. En Route'), desc: t('resident.vanApproaching', 'Van Approaching') },
                    { key: 'collected', label: t('resident.stepWeighed', '4. Weighed'), desc: t('resident.iotLoadCell', 'IoT Load Cell') },
                    { key: 'verified', label: t('resident.stepVerified', '5. AI Verified'), desc: t('resident.mobilenetCheck', 'MobileNet Check') },
                    { key: 'completed', label: t('resident.stepSettled', '6. Settled'), desc: t('resident.upiCredited', 'UPI Credited') }
                  ].map((st) => {
                    const statusOrder: PickupStatus[] = ['requested', 'assigned', 'en_route', 'in_progress', 'collected', 'verified', 'priced', 'recycling_processing', 'completed'];
                    const curIdx = statusOrder.indexOf(activePickup.status);
                    const stIdx = statusOrder.indexOf(st.key as PickupStatus);
                    const isPassed = curIdx >= stIdx;

                    return (
                      <div
                        key={st.key}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isPassed
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-black">{st.label}</span>
                          {isPassed && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <span className="text-[10px] text-slate-500 block leading-tight">{st.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Agent & Facility Info */}
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
                    AK
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('resident.assignedAgent', 'Assigned Collection Agent')}</span>
                    <span className="font-extrabold text-xs text-slate-900">{activePickup.agentName || 'Arjun Kumar (Van 84)'}</span>
                    <span className="text-[11px] text-emerald-700 font-medium block">{t('resident.ratingContact', '★ 4.9 Rating • Contact: +91 97410 88990')}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('resident.authorizedFacility', 'Authorized Recycling Facility')}</span>
                    <span className="font-extrabold text-xs text-slate-900">{activePickup.recyclingFacility || currentCatConfig.recyclingFacility}</span>
                    <span className="text-[11px] text-blue-700 font-medium block">{t('resident.certifiedFacility', 'CPCB Zero-Landfill Certified')}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-10 bg-white border border-slate-200/80 rounded-3xl space-y-3">
              <Calendar className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">{t('resident.noActivePickup', 'No Active Collection Request')}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t('resident.noActivePickupDesc', 'Ready to recycle? Book a doorstep pickup to receive verified UPI buyback.')}
              </p>
              <button
                onClick={() => handleTabSwitch('book')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                {t('resident.scheduleDoorstepPickup', 'Schedule Doorstep Waste Pickup')}
              </button>
            </div>
          )}

          {/* Past Pickups History */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">
                {t('resident.pastPickups', 'Past Completed Pickups')} ({completedPickups.length})
              </h3>
              <span className="text-xs text-slate-400">{t('resident.allSettlementsRecorded', 'All verified settlements recorded')}</span>
            </div>

            <div className="space-y-3">
              {completedPickups.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{p.pickupCode}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        {t(`category.${p.category}`, p.category.replace('_', ' '))}
                      </span>
                      <span className="text-xs text-slate-400">{p.scheduledDate}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {t('resident.verifiedWeight', 'Verified Weight:')} <strong className="text-slate-900">{p.weightKg} KG</strong> ({p.weightSource === 'iot_loadcell' ? 'ESP32 HX711' : 'Manual'}) • Destined: {p.recyclingFacility || 'Recycling Center'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('resident.settlement', 'Settlement')}</span>
                      <span className="font-mono text-xs font-extrabold text-emerald-600">
                        + ₹{p.recyclablePayout.toFixed(2)}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {t('resident.settled', 'Settled ✓')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: WALLET */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          
          {/* Wallet Summary Header */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
                  {t('resident.cashBalance', 'Resident Cash Balance')}
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-2">
                  ₹{currentUser.walletBalance.toFixed(2)}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {t('resident.availableWithdrawal', 'Available for instant withdrawal to UPI:')} <strong className="text-emerald-400">{currentUser.upiId || 'priya@okhdfcbank'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert(`Initiated instant withdrawal of ₹${currentUser.walletBalance.toFixed(2)} to ${currentUser.upiId || 'priya@okhdfcbank'}`)}
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{t('resident.withdrawUpi', 'Withdraw to Bank / UPI')}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('resident.lifetimePayouts', 'Lifetime Payouts')}</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">₹{(totalEarnedPayout || 342.5).toFixed(2)}</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('resident.pendingCollections', 'Pending Collections')}</span>
                <span className="font-mono font-bold text-amber-400 text-sm">₹{pendingAmount.toFixed(2)}</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('resident.completedSettlements', 'Completed Settlements')}</span>
                <span className="font-mono font-bold text-white text-sm">{completedPickups.length} {t('resident.pickupsCount', 'Pickups')}</span>
              </div>
            </div>
          </div>

          {/* Recent Transactions List */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              {t('resident.transactionHistory', 'Transaction History')}
            </h3>

            <div className="space-y-3">
              {[
                { id: 'TXN-UPI-984210', date: '2026-08-28', desc: 'Recycling Payout #ECO-709997 • 4.85 kg PET Plastic', amount: '+ ₹87.30', status: t('resident.settled', 'Settled ✓') },
                { id: 'TXN-UPI-981104', date: '2026-08-21', desc: 'Recycling Payout #ECO-708452 • 8.20 kg Cardboard Boxes', amount: '+ ₹98.40', status: t('resident.settled', 'Settled ✓') },
                { id: 'TXN-UPI-976521', date: '2026-08-14', desc: 'Recycling Payout #ECO-707129 • 2.50 kg E-Waste Components', amount: '+ ₹112.50', status: t('resident.settled', 'Settled ✓') }
              ].map((tx) => (
                <div key={tx.id} className="p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{tx.id}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{tx.date}</span>
                    </div>
                    <p className="text-slate-700 font-medium mt-0.5">{tx.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-emerald-600 text-sm">{tx.amount}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 ml-2">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: GREEN POINTS */}
      {activeTab === 'points' && (
        <div className="space-y-6">
          
          {/* Green Points Header */}
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-emerald-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-black bg-white/20 px-2 py-0.5 rounded">
                  {t('resident.loyaltyEngine', 'Municipal Eco-Loyalty Engine')}
                </span>
                <div className="text-4xl font-black font-mono mt-2 flex items-center gap-2">
                  <Sparkles className="w-8 h-8 text-amber-200" />
                  <span>{userPoints} {t('resident.points', 'Points')}</span>
                </div>
                <p className="text-xs text-amber-100 mt-1">
                  {t('resident.pointsDesc', 'Earned through verified waste segregation and routine recycling participation.')}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl max-w-xs text-xs">
                <span className="font-bold uppercase text-[10px] text-amber-200 block mb-1">{t('resident.tierStatus', 'Citizen Tier Status')}</span>
                <span className="font-extrabold text-sm text-white block">{t('resident.ecoChampion', 'Eco Champion • Level 3')}</span>
                <span className="text-[11px] text-amber-100 mt-0.5 block">{t('resident.nextRewardTier', 'Next reward tier at 500 points')}</span>
              </div>
            </div>

            {/* How Points Are Earned */}
            <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-white/20 text-xs">
              <div className="bg-white/10 p-3 rounded-xl">
                <span className="font-bold block">+25 {t('resident.points', 'Points')}</span>
                <span className="text-[11px] text-amber-100">{t('resident.pickupReward', 'Every completed recycling pickup')}</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <span className="font-bold block">+15 {t('resident.bonusPoints', 'Bonus Points')}</span>
                <span className="text-[11px] text-amber-100">{t('resident.weightBonus', 'For loads over 5.0 kg weight')}</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <span className="font-bold block">+20 {t('resident.bonusPoints', 'Bonus Points')}</span>
                <span className="text-[11px] text-amber-100">{t('resident.segregationGuarantee', '100% Segregated waste guarantee')}</span>
              </div>
            </div>
          </div>

          {/* Toast Notice for Voucher Redemption */}
          {voucherNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-600" />
                <span>{voucherNotice}</span>
              </div>
            </div>
          )}

          {/* Reward Catalog */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              {t('resident.voucherCatalog', 'Redemption & Eco Vouchers Catalog')}
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: '₹100 BESCOM Electricity Bill Rebate', cost: 500, desc: 'Municipal green energy subsidy coupon', icon: '⚡' },
                { title: '5 kg Organic Vermicompost Bag', cost: 300, desc: 'Direct from Biomethanation Facility 4', icon: '🌱' },
                { title: 'BMTC / Namma Metro Green Travel Pass', cost: 400, desc: '1-Day unlimited public transit pass', icon: '🚇' },
                { title: 'Plant a Native Tree in Your Name', cost: 250, desc: 'Includes Geo-tagged certificate & location', icon: '🌳' }
              ].map((reward, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{reward.icon}</span>
                      <span className="font-mono font-bold text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {reward.cost} {t('resident.points', 'Points')}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mt-2">{reward.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{reward.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRedeemReward(reward)}
                    disabled={userPoints < reward.cost}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                      userPoints >= reward.cost
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {userPoints >= reward.cost ? t('resident.redeemVoucher', 'Redeem Voucher') : `${t('resident.needMore', 'Need')} ${reward.cost - userPoints} ${t('resident.morePts', 'more pts')}`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Redeemed Vouchers History */}
          {redeemedVouchers.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900">{t('resident.activeVouchers', 'Your Active Vouchers')}</h3>
              <div className="space-y-2">
                {redeemedVouchers.map((v) => (
                  <div key={v.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{v.title}</span>
                      <span className="text-[10px] text-slate-500 block">{t('resident.redeemedOn', 'Redeemed on')} {v.date}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                      {v.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 6: IMPACT */}
      {activeTab === 'impact' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {t('resident.environmentalStewardship', 'Environmental Stewardship')}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {t('resident.myEcoImpact', 'My Eco Impact')}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {t('resident.warmStandards', 'Calculations based on EPA Waste Reduction Model (WARM) standards. All metrics labeled as Estimated.')}
              </p>
            </div>

            {/* Impact Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('resident.totalRecycled', 'Total Recycled')}</span>
                <span className="text-2xl font-black font-mono text-emerald-700">
                  {(totalWeightDiverted || 24.8).toFixed(1)} KG
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">{t('resident.zeroLandfill', 'Zero landfill diversion')}</span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('resident.co2Prevented', 'CO₂ Prevented')}</span>
                <span className="text-2xl font-black font-mono text-blue-700">
                  {((totalWeightDiverted || 24.8) * 1.82).toFixed(1)} kg
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">{t('resident.ghgReduction', 'Greenhouse gas reduction')}</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('resident.treesConserved', 'Trees Conserved')}</span>
                <span className="text-2xl font-black font-mono text-amber-700">
                  {((totalWeightDiverted || 24.8) * 0.017).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">{t('resident.matureTreeEq', 'Mature tree equivalent')}</span>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('resident.waterConserved', 'Water Conserved')}</span>
                <span className="text-2xl font-black font-mono text-teal-700">
                  {Math.round((totalWeightDiverted || 24.8) * 38)} L
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">{t('resident.industrialSavings', 'Industrial process savings')}</span>
              </div>
            </div>

            {/* Waste Category Breakdown */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('resident.diversionBreakdown', 'Recycling Diversion Breakdown')}
              </h3>
              
              <div className="space-y-2">
                {[
                  { name: t('category.plastic', 'Plastic Waste (#1 PET & #2 HDPE)'), kg: 14.5, pct: 58, color: 'bg-cyan-500' },
                  { name: t('category.paper', 'Paper & Corrugated Cardboard'), kg: 6.2, pct: 25, color: 'bg-blue-500' },
                  { name: t('category.ewaste', 'Electronic Scrap (WEEE)'), kg: 2.5, pct: 10, color: 'bg-purple-500' },
                  { name: t('category.metal', 'Scrap Metal & Cans'), kg: 1.6, pct: 7, color: 'bg-emerald-500' }
                ].map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                      <span className="font-mono font-bold text-slate-600">{cat.kg} KG ({cat.pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 7: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">{t('resident.citizenAccount', 'Citizen Account')}</span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">{currentUser.name}</h2>
              <p className="text-xs text-slate-500">{currentUser.email} • {currentUser.phone}</p>
            </div>
            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>{t('resident.switchUser', 'Switch User')}</span>
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="font-bold text-slate-800 uppercase text-[10px] block">{t('resident.defaultAddress', 'Default Pickup Address')}</span>
              <p className="font-medium text-slate-700">
                {currentUser.address.street}, {currentUser.address.area}, {currentUser.address.city} - {currentUser.address.pincode}
              </p>
              <span className="text-[11px] text-emerald-700 font-bold block">Ward 84 • East Bangalore Zone</span>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="font-bold text-slate-800 uppercase text-[10px] block">{t('resident.verifiedUpi', 'Verified Payout UPI ID')}</span>
              <p className="font-mono font-bold text-emerald-600 text-sm">
                {currentUser.upiId || 'priya@okhdfcbank'}
              </p>
              <span className="text-[11px] text-slate-500 block">{t('resident.instantCashbackNote', 'Instant buyback cashback deposited on verification')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        notifications={notifications}
        onClose={() => setIsNotificationsOpen(false)}
        onMarkRead={(id) => {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        }}
        onSelectPickup={() => {
          setIsNotificationsOpen(false);
          handleTabSwitch('pickups');
        }}
      />

      {/* Regular Municipal Ward Collection Schedule & Guidelines Modal */}
      {isWardScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {t('resident.regularMunicipalFree', '100% Free Public Service')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      BBMP Ward 84
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    {t('resident.wardScheduleModalTitle', 'Regular Municipal Waste Collection Schedule')}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWardScheduleModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Crucial Distinctions Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 block flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {t('resident.noSpecialBookingTitle', 'No Special Booking Required • ₹0 Service Fee')}
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {t('resident.noSpecialBookingDesc', 'Regular municipal collection is your statutory municipal civic service. Ti-pper autos and compactors arrive according to the routine schedule below. Residents do NOT need to book an EcoCollect pickup or pay any special trip fee for this routine.')}
              </p>
            </div>

            {/* Weekly Timetable */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                {t('resident.routineTimetable', 'Ward 84 Weekly Routine Timetable:')}
              </span>

              {/* Wet Waste Daily */}
              <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  🌱
                </div>
                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{t('resident.wetWasteDaily', 'Wet & Organic Waste (Green Bin)')}</span>
                    <span className="font-mono font-bold text-emerald-800 text-[11px]">Daily: 07:00 AM - 09:30 AM</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Food scraps, vegetable peels, fruit waste, coffee grounds. Must be handed over in green segregated bins without plastic liners.
                  </p>
                </div>
              </div>

              {/* Dry Recyclables */}
              <div className="p-3 rounded-2xl border border-blue-200 bg-blue-50/40 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  📦
                </div>
                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{t('resident.dryWasteSchedule', 'Dry Recyclables (Blue Bin)')}</span>
                    <span className="font-mono font-bold text-blue-800 text-[11px]">Wed & Sat: 10:00 AM - 12:30 PM</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Plastic containers, paper, clean cardboard cartons, metal cans. Secondary collection by Dry Waste Collection Center (DWCC).
                  </p>
                </div>
              </div>

              {/* Sanitary / Hazardous */}
              <div className="p-3 rounded-2xl border border-rose-200 bg-rose-50/40 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ⚠️
                </div>
                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{t('resident.sanitaryWasteDaily', 'Domestic Hazardous & Sanitary')}</span>
                    <span className="font-mono font-bold text-rose-800 text-[11px]">Daily: 07:00 AM - 09:30 AM</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Sanitary pads, bandages, expired medicines. Must be securely wrapped in newspaper with a red cross marking.
                  </p>
                </div>
              </div>
            </div>

            {/* When to use EcoCollect On-Demand */}
            <div className="p-4 rounded-2xl bg-emerald-950 text-white text-xs space-y-2">
              <span className="font-extrabold text-emerald-400 block flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {t('resident.whenUseOnDemandTitle', 'When Should You Book an EcoCollect On-Demand Pickup?')}
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {t('resident.whenUseOnDemandDesc', 'If you missed the regular municipal collection morning van, have heavy or bulk recyclables (electronics, appliances, scrap metal, large cardboard batches), or need immediate doorstep pickup, EcoCollect sends a dedicated EV cargo van to your doorstep. You receive transparent buyback value that offsets the dedicated trip fee.')}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                {t('resident.bbmpHelpline', 'BBMP Sanitation Helpline: 1533')}
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsWardScheduleModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  {t('common.close', 'Close')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsWardScheduleModalOpen(false);
                    handleTabSwitch('book');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{t('resident.bookOnDemandNow', 'Book On-Demand Doorstep Pickup')}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* AI Waste Camera Scanner Modal */}
      <WasteCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onApplyCategory={handleApplyCameraAnalysis}
        initialCategory={selectedCategory}
      />

    </div>
  );
};
