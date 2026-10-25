import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Scale, 
  Users, 
  Search, 
  Radio, 
  Battery, 
  Wifi, 
  Check, 
  Sparkles,
  RefreshCw,
  TrendingUp,
  FileCheck,
  Leaf,
  Factory,
  Database,
  Truck,
  Coins,
  Cpu,
  Sliders,
  Terminal,
  ExternalLink,
  Clock,
  Server,
  Activity,
  UserCheck,
  DollarSign
} from 'lucide-react';
import { Pickup, User, WeightLog, WasteCategory, PickupStatus } from '../types';
import { calculateDynamicPricing, calculateEnvironmentalImpact, WASTE_CATEGORIES_REGISTRY } from '../data/pricingConstants';
import { EnvironmentalImpactCard } from './EnvironmentalImpactCard';
import { apiService } from '../services/apiService';
import { useLanguage } from '../i18n/LanguageContext';
import { IotScaleSimulator } from './IotScaleSimulator';
import { CnnClassifierStudio } from './CnnClassifierStudio';
import { PricingCalculator } from './PricingCalculator';
import { CodeExplorer } from './CodeExplorer';

interface AdminDashboardProps {
  pickups: Pickup[];
  users: User[];
  weightLogs: WeightLog[];
  onResolveMismatch: (pickupId: string, resolution: 'accept_resident' | 'enforce_penalty' | 'manual_adjust', overrideCategory?: WasteCategory) => void;
  onNavigateView?: (view: any) => void;
  scaleLiveWeight?: number;
  onUpdateScaleWeight?: (weight: number) => void;
  onTareScale?: () => void;
  onPostScaleTelemetry?: (log: WeightLog) => void;
}

type FunctionalGroup = 'group2_collection' | 'group3_financials' | 'group4_ai_iot' | 'group5_advanced';

type CollectionSubTab = 'all_pickups' | 'pickup_status' | 'resident_directory' | 'agent_directory' | 'waste_categories';
type FinancialsSubTab = 'recyclable_recovery' | 'buyback_transactions' | 'processing_fees' | 'net_settlement' | 'pricing_rules';
type AiIotSubTab = 'ai_mismatches' | 'ai_vision' | 'iot_scale' | 'device_logs';
type AdvancedSubTab = 'pricing_engine' | 'system_monitoring' | 'code_repo';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  pickups,
  users,
  weightLogs,
  onResolveMismatch,
  onNavigateView,
  scaleLiveWeight = 0,
  onUpdateScaleWeight,
  onTareScale,
  onPostScaleTelemetry
}) => {
  const { t } = useLanguage();
  
  // Navigation State
  const [activeGroup, setActiveGroup] = useState<FunctionalGroup>('group2_collection');
  const [collectionTab, setCollectionTab] = useState<CollectionSubTab>('all_pickups');
  const [financialsTab, setFinancialsTab] = useState<FinancialsSubTab>('recyclable_recovery');
  const [aiIotTab, setAiIotTab] = useState<AiIotSubTab>('ai_mismatches');
  const [advancedTab, setAdvancedTab] = useState<AdvancedSubTab>('pricing_engine');

  // Operational Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [, setServerMetrics] = useState<{
    totalPickups?: number;
    completedPickups?: number;
    totalWeightDivertedKg?: number;
    flaggedMismatches?: number;
    environmentalMetrics?: any;
  } | null>(null);

  // GROUP 1: Operational Metrics Calculations
  const flaggedPickups = pickups.filter(p => p.mismatchFlagged && !p.adminReviewed);
  const totalWeightKg = pickups.reduce((acc, p) => acc + (p.weightKg || 0), 0);
  
  const recyclableCategories: WasteCategory[] = [
    'plastic', 'paper_cardboard', 'metal', 'glass', 'e_waste', 'dry_recyclable', 'other_recyclable'
  ];
  const recyclablePickups = pickups.filter(p => recyclableCategories.includes(p.category));
  const totalRecyclableWeightKg = recyclablePickups.reduce((acc, p) => acc + (p.weightKg || 0), 0);
  const recyclablePercentage = totalWeightKg > 0 ? (totalRecyclableWeightKg / totalWeightKg) * 100 : 0;

  const totalDisbursed = pickups.reduce((acc, p) => acc + (p.recyclablePayout || 0), 0);
  const totalProcessingFees = pickups.reduce((acc, p) => acc + (p.processingFee || 0), 0);
  
  const activeResidents = users.filter(u => u.role === 'resident');
  const activeAgents = users.filter(u => u.role === 'agent');
  
  const environmentalImpact = calculateEnvironmentalImpact(pickups);

  const handleSyncBackend = async () => {
    setIsSyncing(true);
    try {
      const res = await apiService.getAdminMetrics();
      if (res.success && res.data) {
        setServerMetrics(res.data);
      }
    } catch (err) {
      console.error('Failed to sync backend metrics:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredPickups = pickups.filter(p => {
    const matchesSearch = p.pickupCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.residentAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || p.category === filterCategory;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const completedPickupsWithPayout = pickups.filter(p => (p.recyclablePayout || 0) > 0);
  const pickupsWithProcessingFee = pickups.filter(p => (p.processingFee || 0) > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Header: Dark EcoCollect Municipal Admin Hub Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                {t('admin.municipalAdminPortal', 'Municipal Admin Portal')}
              </span>
              <span className="text-xs text-slate-400">{t('admin.divisionName', 'BBMP Solid Waste Management Division')}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">{t('admin.auditorTitle', 'Dr. Ramesh Rao • Chief Waste Auditor')}</h1>
          </div>
        </div>

        {/* Backend Sync & Live Mismatch Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncBackend}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-200 transition-all shadow-sm cursor-pointer"
            title={t('admin.syncServerApi', 'Sync Server API')}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? t('admin.syncing', 'Syncing...') : t('admin.syncServerApi', 'Sync Server API')}</span>
          </button>

          <button
            onClick={() => {
              setActiveGroup('group4_ai_iot');
              setAiIotTab('ai_mismatches');
            }}
            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 px-4 py-2 rounded-2xl text-left transition-all cursor-pointer"
          >
            <AlertTriangle className={`w-5 h-5 shrink-0 ${flaggedPickups.length > 0 ? 'text-amber-400 animate-bounce' : 'text-emerald-400'}`} />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('admin.aiMismatchFlags', 'AI Mismatch Flags')}</span>
              <span className="font-mono text-white font-black text-sm">
                {flaggedPickups.length} {t('admin.pendingAudit', 'Pending Audit')}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* GROUP 1 – OPERATIONS OVERVIEW (Primary Prominence) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {t('admin.group1Title', 'Operations Overview')}
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
            {t('admin.thisWeek', 'Real-Time Municipal Telemetry')}
          </span>
        </div>

        {/* 7 Operational Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          
          {/* 1. Total Waste Collected */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight">
                {t('admin.totalWasteCollected', 'Total Waste')}
              </span>
              <Scale className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            </div>
            <div className="text-lg font-black text-slate-900 font-mono">{totalWeightKg.toFixed(1)} KG</div>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> 100% logged
            </span>
          </div>

          {/* 2. Total Recyclable Waste */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase leading-tight">
                {t('admin.totalRecyclableWaste', 'Recyclable')}
              </span>
              <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="text-lg font-black text-emerald-700 font-mono">{totalRecyclableWeightKg.toFixed(1)} KG</div>
            <span className="text-[10px] text-emerald-700 font-bold">
              {recyclablePercentage.toFixed(0)}% diverted
            </span>
          </div>

          {/* 3. Buyback Disbursed */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase leading-tight">
                {t('admin.buybackDisbursed', 'Buyback Disbursed')}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="text-lg font-black text-emerald-700 font-mono">₹{totalDisbursed.toFixed(0)}</div>
            <span className="text-[10px] text-slate-500 font-medium truncate block">
              {t('admin.instantUpiResidents', 'Instant UPI')}
            </span>
          </div>

          {/* 4. On-Demand Pickup/Processing Fees */}
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-800 uppercase leading-tight">
                {t('admin.onDemandFees', 'Pickup Fees')}
              </span>
              <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
            <div className="text-lg font-black text-blue-700 font-mono">₹{totalProcessingFees.toFixed(0)}</div>
            <span className="text-[10px] text-slate-500 font-medium truncate block">
              {t('admin.municipalCostRecovery', 'Cost Recovery')}
            </span>
          </div>

          {/* 5. Active Residents */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight">
                {t('admin.activeResidents', 'Residents')}
              </span>
              <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            </div>
            <div className="text-lg font-black text-slate-900 font-mono">{activeResidents.length}</div>
            <span className="text-[10px] text-slate-500 font-medium">Citizens registered</span>
          </div>

          {/* 6. Active Agents */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight">
                {t('admin.activeAgents', 'Agents')}
              </span>
              <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="text-lg font-black text-slate-900 font-mono">{activeAgents.length}</div>
            <span className="text-[10px] text-slate-500 font-medium">EV Fleet Active</span>
          </div>

          {/* 7. Pending AI Audits */}
          <div className={`p-4 rounded-2xl border space-y-1 col-span-2 sm:col-span-1 ${flaggedPickups.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50/80 border-slate-200/80'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase leading-tight ${flaggedPickups.length > 0 ? 'text-amber-900' : 'text-slate-500'}`}>
                {t('admin.pendingAiAudits', 'AI Audits')}
              </span>
              <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${flaggedPickups.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>
            <div className={`text-lg font-black font-mono ${flaggedPickups.length > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
              {flaggedPickups.length}
            </div>
            <span className={`text-[10px] font-bold ${flaggedPickups.length > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
              {flaggedPickups.length > 0 ? 'Needs Action' : 'All Clear ✓'}
            </span>
          </div>

        </div>
      </div>

      {/* CONTROL CENTER TABS: 4 Clear Functional Groups */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
        
        {/* Tier 1: Functional Groups Selector (cleanly scrolling/wrapping on smaller screens) */}
        <div className="border-b border-slate-200 bg-slate-900 p-2 sm:p-3 flex overflow-x-auto sm:flex-wrap gap-2 text-xs scrollbar-none min-w-0">
          
          <button
            onClick={() => setActiveGroup('group2_collection')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap sm:whitespace-normal ${
              activeGroup === 'group2_collection'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>GROUP 2: {t('admin.group2Title', 'Collection Operations')}</span>
            <span className="bg-slate-950/40 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {pickups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveGroup('group3_financials')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap sm:whitespace-normal ${
              activeGroup === 'group3_financials'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span>GROUP 3: {t('admin.group3Title', 'Recovery & Financials')}</span>
          </button>

          <button
            onClick={() => setActiveGroup('group4_ai_iot')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap sm:whitespace-normal ${
              activeGroup === 'group4_ai_iot'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4 shrink-0" />
            <span>GROUP 4: {t('admin.group4Title', 'AI & IoT')}</span>
            {flaggedPickups.length > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                {flaggedPickups.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveGroup('group5_advanced')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap sm:whitespace-normal ${
              activeGroup === 'group5_advanced'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>GROUP 5: {t('admin.group5Title', 'Advanced System Modules')}</span>
          </button>

        </div>

        {/* Tier 2: Sub-Tabs for Active Functional Group */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-4 py-2.5 flex overflow-x-auto sm:flex-wrap gap-1.5 text-xs scrollbar-none min-w-0">
          
          {/* Group 2 Sub-Tabs */}
          {activeGroup === 'group2_collection' && (
            <>
              <button
                onClick={() => setCollectionTab('all_pickups')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  collectionTab === 'all_pickups'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('admin.allPickupsTab', 'All Pickups')}</span>
                <span className="text-[10px] font-mono text-slate-400">({pickups.length})</span>
              </button>

              <button
                onClick={() => setCollectionTab('pickup_status')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  collectionTab === 'pickup_status'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('admin.pickupStatusTab', 'Pickup Status')}</span>
              </button>

              <button
                onClick={() => setCollectionTab('resident_directory')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  collectionTab === 'resident_directory'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>{t('admin.residentDirectoryTab', 'Resident Directory')}</span>
                <span className="text-[10px] font-mono text-slate-400">({activeResidents.length})</span>
              </button>

              <button
                onClick={() => setCollectionTab('agent_directory')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  collectionTab === 'agent_directory'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('admin.agentDirectoryTab', 'Agent Directory')}</span>
                <span className="text-[10px] font-mono text-slate-400">({activeAgents.length})</span>
              </button>

              <button
                onClick={() => setCollectionTab('waste_categories')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  collectionTab === 'waste_categories'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-teal-600" />
                <span>{t('admin.wasteCategoriesTab', 'Waste Categories')}</span>
                <span className="text-[10px] font-mono text-slate-400">({WASTE_CATEGORIES_REGISTRY.length})</span>
              </button>
            </>
          )}

          {/* Group 3 Sub-Tabs */}
          {activeGroup === 'group3_financials' && (
            <>
              <button
                onClick={() => setFinancialsTab('recyclable_recovery')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  financialsTab === 'recyclable_recovery'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('admin.recyclableRecoveryTab', 'Recyclable Recovery')}</span>
              </button>

              <button
                onClick={() => setFinancialsTab('buyback_transactions')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  financialsTab === 'buyback_transactions'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('admin.buybackTransactionsTab', 'Buyback Transactions')}</span>
                <span className="text-[10px] font-mono text-slate-400">({completedPickupsWithPayout.length})</span>
              </button>

              <button
                onClick={() => setFinancialsTab('processing_fees')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  financialsTab === 'processing_fees'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('admin.processingFeesTab', 'Processing Fees')}</span>
                <span className="text-[10px] font-mono text-slate-400">({pickupsWithProcessingFee.length})</span>
              </button>

              <button
                onClick={() => setFinancialsTab('net_settlement')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  financialsTab === 'net_settlement'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('admin.netSettlementTab', 'Net Settlement')}</span>
              </button>

              <button
                onClick={() => setFinancialsTab('pricing_rules')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  financialsTab === 'pricing_rules'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                <span>{t('admin.pricingRulesTab', 'Pricing Rules')}</span>
              </button>
            </>
          )}

          {/* Group 4 Sub-Tabs */}
          {activeGroup === 'group4_ai_iot' && (
            <>
              <button
                onClick={() => setAiIotTab('ai_mismatches')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  aiIotTab === 'ai_mismatches'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('admin.aiMismatchAuditsTab', 'AI Mismatch Audits')}</span>
                {flaggedPickups.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    {flaggedPickups.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAiIotTab('ai_vision')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  aiIotTab === 'ai_vision'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-purple-600" />
                <span>{t('admin.aiWasteVisionTab', 'AI Waste Vision')}</span>
              </button>

              <button
                onClick={() => setAiIotTab('iot_scale')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  aiIotTab === 'iot_scale'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('admin.iotScaleTelemetryTab', 'IoT Scale Telemetry')}</span>
              </button>

              <button
                onClick={() => setAiIotTab('device_logs')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  aiIotTab === 'device_logs'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('admin.deviceTelemetryLogsTab', 'Device / Telemetry Logs')}</span>
                <span className="text-[10px] font-mono text-slate-400">({weightLogs.length})</span>
              </button>
            </>
          )}

          {/* Group 5 Sub-Tabs */}
          {activeGroup === 'group5_advanced' && (
            <>
              <button
                onClick={() => setAdvancedTab('pricing_engine')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  advancedTab === 'pricing_engine'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('admin.dynamicPricingEngineTab', 'Dynamic Pricing Engine')}</span>
              </button>

              <button
                onClick={() => setAdvancedTab('system_monitoring')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  advancedTab === 'system_monitoring'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-slate-700" />
                <span>{t('admin.technicalMonitoringTab', 'Technical / System Monitoring')}</span>
              </button>

              <button
                onClick={() => setAdvancedTab('code_repo')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  advancedTab === 'code_repo'
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('admin.codeRepositoryTab', 'Code Repository')}</span>
              </button>
            </>
          )}

        </div>

        {/* CONTENT PANELS FOR EACH FUNCTIONAL GROUP & SUB-TAB */}
        <div className="p-6">
          
          {/* ========================================================================= */}
          {/* GROUP 2 – COLLECTION OPERATIONS */}
          {/* ========================================================================= */}
          {activeGroup === 'group2_collection' && (
            <div className="space-y-6">
              
              {/* SUB-TAB 2.1: ALL PICKUPS */}
              {collectionTab === 'all_pickups' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder={t('admin.searchCodeOrResident', 'Search code, resident, or address...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white shadow-2xs"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                      >
                        <option value="all">{t('categories.all', 'All Categories')}</option>
                        {WASTE_CATEGORIES_REGISTRY.map((c) => (
                          <option key={c.id} value={c.id}>
                            {t(`categories.${c.id}`, c.name)}
                          </option>
                        ))}
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                      >
                        <option value="all">All Statuses</option>
                        <option value="requested">Requested</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="verified">Verified</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs bg-white min-w-[720px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px]">
                          <th className="py-3 px-4">{t('resident.pickupCode', 'Code')}</th>
                          <th className="py-3 px-3">{t('admin.roleResident', 'Resident & Address')}</th>
                          <th className="py-3 px-3">{t('resident.selectWasteCategory', 'Category')}</th>
                          <th className="py-3 px-3">{t('agent.weight', 'Weight')}</th>
                          <th className="py-3 px-3">{t('admin.processingFees', 'Fee')} (P)</th>
                          <th className="py-3 px-3">{t('admin.buybackDisbursed', 'Buyback')} (Rp)</th>
                          <th className="py-3 px-3">{t('agent.netDisbursement', 'Net Settlement')}</th>
                          <th className="py-3 px-4">{t('agent.status', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPickups.length > 0 ? (
                          filteredPickups.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.pickupCode}</td>
                              <td className="py-3.5 px-3 min-w-[160px] max-w-xs">
                                <span className="font-semibold text-slate-900 block">{p.residentName}</span>
                                <span className="text-[11px] text-slate-500 break-words whitespace-normal block leading-relaxed">{p.residentAddress}</span>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className="capitalize font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                                  {t(`categories.${p.category}`, p.category.replace('_', ' '))}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                                {p.weightKg.toFixed(2)} KG
                              </td>
                              <td className="py-3.5 px-3 font-mono text-slate-700">₹{p.processingFee.toFixed(2)}</td>
                              <td className="py-3.5 px-3 font-mono text-emerald-600 font-semibold">+₹{p.recyclablePayout.toFixed(2)}</td>
                              <td className="py-3.5 px-3 font-mono font-black">
                                <span className={p.netSettlement >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                                  {p.netSettlement >= 0 ? `+₹${p.netSettlement.toFixed(2)}` : `₹${Math.abs(p.netSettlement).toFixed(2)}`}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`uppercase text-[10px] font-extrabold px-2.5 py-1 rounded-md border ${
                                  p.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                  p.status === 'in_progress' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                  p.status === 'verified' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                  'bg-slate-100 text-slate-800 border-slate-200'
                                }`}>
                                  {t(`status.${p.status}`, p.status)}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-500">
                              No pickups matching the search or category filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2.2: PICKUP STATUS PIPELINE */}
              {collectionTab === 'pickup_status' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('admin.pickupStatusTab', 'Pickup Dispatch Pipeline')}</h3>
                    <p className="text-xs text-slate-500">Real-time status progression across all active collection routes.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(['requested', 'assigned', 'in_progress', 'verified', 'completed'] as PickupStatus[]).map((st) => {
                      const count = pickups.filter(p => p.status === st).length;
                      return (
                        <button
                          key={st}
                          onClick={() => {
                            setStatusFilter(st);
                            setCollectionTab('all_pickups');
                          }}
                          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-left space-y-1 transition-all shadow-2xs cursor-pointer"
                        >
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">{st.replace('_', ' ')}</span>
                          <div className="text-2xl font-black text-slate-900 font-mono">{count}</div>
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            Click to inspect →
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                    <span className="font-bold text-slate-800 block">Dispatch Lifecycle Summary:</span>
                    <p>
                      Each on-demand pickup follows the rigorous 6-stage lifecycle:
                      (1) Booking Request & Address Validation → (2) Route Allocation to EV Fleet → (3) Doorstep Physical Inspection & Segregation Check → (4) ESP32 Load Cell Calibrated Weighing → (5) MobileNet CNN Vision Verification → (6) Instant UPI Cashback Disbursement.
                    </p>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2.3: RESIDENT DIRECTORY */}
              {collectionTab === 'resident_directory' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{t('admin.residentDirectoryTab', 'Resident Directory')}</h3>
                      <p className="text-xs text-slate-500">Registered citizen accounts participating in municipal segregation.</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                      {activeResidents.length} Citizens
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {activeResidents.map((u) => (
                      <div key={u.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-sm text-slate-900">{u.name}</div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {u.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 space-y-0.5 break-words">
                          <div><strong>Email:</strong> {u.email}</div>
                          <div><strong>Phone:</strong> {u.phone}</div>
                          <div><strong>Address:</strong> {u.address.street}, {u.address.area}</div>
                          {u.upiId && (
                            <div className="text-emerald-700 font-mono font-bold pt-1 break-all">
                              UPI VPA: {u.upiId}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="text-slate-500">Green Loyalty Points:</span>
                          <span className="font-mono font-bold text-emerald-600">{u.rewardPoints || 0} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2.4: AGENT DIRECTORY */}
              {collectionTab === 'agent_directory' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{t('admin.agentDirectoryTab', 'Agent Directory & EV Fleet')}</h3>
                      <p className="text-xs text-slate-500">Certified collection drivers equipped with calibrated ESP32 scales.</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                      {activeAgents.length} Agents
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {activeAgents.map((a) => (
                      <div key={a.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-sm text-slate-900">{a.name}</div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            Field Driver
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 space-y-0.5">
                          <div><strong>Assigned Vehicle:</strong> BBMP Electric Van #EV-84</div>
                          <div><strong>Sector:</strong> Ward 84 (East Bangalore Zone)</div>
                          <div><strong>Phone:</strong> {a.phone}</div>
                          <div><strong>IoT Scale Unit:</strong> ESP32-HX711-NODE-01 (Calibrated)</div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="text-slate-500">Fleet Status:</span>
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            On Active Patrol
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2.5: WASTE CATEGORIES REGISTRY */}
              {collectionTab === 'waste_categories' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('admin.wasteCategoriesTab', 'Waste Categories Registry')}</h3>
                    <p className="text-xs text-slate-500">Dynamic pricing configurations, buyback rates, and destination facilities for all supported categories.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {WASTE_CATEGORIES_REGISTRY.map((cat) => (
                      <div key={cat.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${cat.badgeClass}`}>
                            {t(`categories.${cat.id}`, cat.name)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold">
                            Base: ₹{cat.baseProcessingRate}/kg • Buyback: ₹{cat.buybackRate}/kg
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">{cat.recyclingFacility}</div>
                        <p className="text-[11px] text-slate-500">{cat.environmentalBenefit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* GROUP 3 – RECOVERY & FINANCIALS */}
          {/* ========================================================================= */}
          {activeGroup === 'group3_financials' && (
            <div className="space-y-6">
              
              {/* SUB-TAB 3.1: RECYCLABLE RECOVERY & ENVIRONMENTAL IMPACT */}
              {financialsTab === 'recyclable_recovery' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('admin.recyclableRecoveryTab', 'Material Recovery & Environmental Impact')}</h3>
                    <p className="text-xs text-slate-500">EPA Waste Reduction Model (WARM) metrics and stream diversion analytics.</p>
                  </div>

                  <EnvironmentalImpactCard 
                    impact={environmentalImpact} 
                    rewardPoints={users.reduce((acc, u) => acc + (u.rewardPoints || 0), 0)} 
                  />

                  {/* Waste Segregation by Stream */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                    <h4 className="text-sm font-extrabold text-slate-900">{t('admin.wasteSegregationByStream', 'Waste Segregation by Stream')}</h4>
                    <div className="space-y-3">
                      {WASTE_CATEGORIES_REGISTRY.map((cat) => {
                        const catPickups = pickups.filter(p => p.category === cat.id);
                        const catWeight = catPickups.reduce((acc, p) => acc + (p.weightKg || 0), 0);
                        const percentage = totalWeightKg > 0 ? (catWeight / totalWeightKg) * 100 : 0;
                        
                        return (
                          <div key={cat.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${cat.badgeClass}`}>
                                  {t(`categories.${cat.id}`, cat.name)}
                                </span>
                                <span className="text-slate-500 text-[11px] hidden sm:inline">{cat.tagline}</span>
                              </div>
                              <div className="font-mono text-xs font-bold text-slate-800">
                                {catWeight.toFixed(1)} KG <span className="text-slate-400 font-normal">({percentage.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ width: `${Math.max(percentage, 2)}%`, backgroundColor: cat.colorHex }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3.2: BUYBACK TRANSACTIONS */}
              {financialsTab === 'buyback_transactions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{t('admin.buybackTransactionsTab', 'Itemized Buyback Disbursements')}</h3>
                      <p className="text-xs text-slate-500">Verified cashbacks credited to resident UPI VPAs for segregated recyclables.</p>
                    </div>
                    <span className="font-mono text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      Total Disbursed: ₹{totalDisbursed.toFixed(2)}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs bg-white min-w-[580px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                          <th className="py-3 px-4">Pickup Code</th>
                          <th className="py-3 px-3">Resident</th>
                          <th className="py-3 px-3">Category</th>
                          <th className="py-3 px-3">Weight (KG)</th>
                          <th className="py-3 px-3">Buyback Payout (Rp)</th>
                          <th className="py-3 px-4">Disbursement Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {completedPickupsWithPayout.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.pickupCode}</td>
                            <td className="py-3 px-3 font-semibold text-slate-800">{p.residentName}</td>
                            <td className="py-3 px-3 capitalize">{p.category.replace('_', ' ')}</td>
                            <td className="py-3 px-3 font-mono">{p.weightKg.toFixed(2)}</td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-600">+₹{p.recyclablePayout.toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                UPI Disbursed ✓
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3.3: PROCESSING FEES */}
              {financialsTab === 'processing_fees' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{t('admin.processingFeesTab', 'Municipal Processing Fee Recovery')}</h3>
                      <p className="text-xs text-slate-500">On-demand trip fees and sorting cost recovery collected from requests.</p>
                    </div>
                    <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                      Total Fees: ₹{totalProcessingFees.toFixed(2)}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs bg-white min-w-[580px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                          <th className="py-3 px-4">Pickup Code</th>
                          <th className="py-3 px-3">Resident</th>
                          <th className="py-3 px-3">Service Type</th>
                          <th className="py-3 px-3">Weight (KG)</th>
                          <th className="py-3 px-3">Fee (P)</th>
                          <th className="py-3 px-4">Recovery Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pickupsWithProcessingFee.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.pickupCode}</td>
                            <td className="py-3 px-3 font-semibold text-slate-800">{p.residentName}</td>
                            <td className="py-3 px-3 capitalize">{p.pickupType}</td>
                            <td className="py-3 px-3 font-mono">{p.weightKg.toFixed(2)}</td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-800">₹{p.processingFee.toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Recovered ✓
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3.4: NET SETTLEMENT */}
              {financialsTab === 'net_settlement' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('admin.netSettlementTab', 'Net Financial Settlement Ledger')}</h3>
                    <p className="text-xs text-slate-500">Balanced cashflow ledger offsetting on-demand doorstep fees against recyclable buybacks.</p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Gross Buyback Owed</span>
                      <div className="text-xl font-black text-emerald-600 font-mono">₹{totalDisbursed.toFixed(2)}</div>
                      <span className="text-[11px] text-slate-500">Resident credits</span>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Gross Service Fees</span>
                      <div className="text-xl font-black text-blue-600 font-mono">₹{totalProcessingFees.toFixed(2)}</div>
                      <span className="text-[11px] text-slate-500">Municipal recovery</span>
                    </div>

                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase">Net Disbursed Cashflow</span>
                      <div className="text-xl font-black text-emerald-700 font-mono">
                        ₹{(totalDisbursed - totalProcessingFees).toFixed(2)}
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold">Net community dividend</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3.5: PRICING RULES */}
              {financialsTab === 'pricing_rules' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('admin.pricingRulesTab', 'Municipal Pricing Rules & Mathematical Formulation')}</h3>
                    <p className="text-xs text-slate-500">Formal regulatory rules governing processing cost and buyback subsidies.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="font-extrabold text-slate-900 block">Processing Fee Formula:</span>
                      <code className="bg-white p-2 rounded-lg block font-mono text-emerald-700 border border-slate-200">
                        P = (W_i × R_i × S_i) + F
                      </code>
                      <p className="text-slate-600 text-[11px]">
                        W_i = Weight in KG<br />
                        R_i = Base Processing Rate (₹/kg)<br />
                        S_i = Segregation Factor (0.8 segregated / 1.5 contaminated)<br />
                        F = Pickup Type Fixed Surcharge
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="font-extrabold text-slate-900 block">Recyclable Buyback Formula:</span>
                      <code className="bg-white p-2 rounded-lg block font-mono text-emerald-700 border border-slate-200">
                        R_p = W_i × V_j
                      </code>
                      <p className="text-slate-600 text-[11px]">
                        V_j = Daily Buyback Rate (₹/kg)<br />
                        Applies to: Plastic (₹18), Paper (₹12), Metal (₹35), E-Waste (₹45), Glass (₹4)
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="font-extrabold text-slate-900 block">Net Settlement Formula:</span>
                      <code className="bg-white p-2 rounded-lg block font-mono text-emerald-700 border border-slate-200">
                        Net = R_p - P
                      </code>
                      <p className="text-slate-600 text-[11px]">
                        Net &gt; 0: Instant UPI Cashback Payout<br />
                        Net &lt; 0: Service Fee Due<br />
                        Net = 0: Fully Offset Routine Balance
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* GROUP 4 – AI & IoT */}
          {/* ========================================================================= */}
          {activeGroup === 'group4_ai_iot' && (
            <div className="space-y-6">
              
              {/* SUB-TAB 4.1: AI MISMATCH AUDITS */}
              {aiIotTab === 'ai_mismatches' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('admin.flaggedCategoryMismatches', 'Flagged Category Mismatches')}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t('admin.flaggedSubtitle', 'MobileNet CNN vision model detected an anomaly between the declared category and collected waste photo.')}
                    </p>
                  </div>

                  {flaggedPickups.length > 0 ? (
                    <div className="space-y-4">
                      {flaggedPickups.map((pickup) => (
                        <div
                          key={pickup.id}
                          className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/40 space-y-4"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-amber-900">{pickup.pickupCode}</span>
                                <span className="text-xs font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md">
                                  {t('admin.contaminationRisk', 'Contamination Risk Flagged')}
                                </span>
                              </div>
                              <h4 className="text-sm font-black text-slate-900 mt-1">
                                {t('admin.roleResident', 'Resident')}: {pickup.residentName} • {pickup.residentAddress}
                              </h4>
                            </div>
                            <div className="font-mono text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                              {t('agent.weight', 'Weight')}: {pickup.weightKg} KG
                            </div>
                          </div>

                          {/* Comparison Box */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <span>{t('admin.declaredByResident', 'Resident Declared')}:</span>
                                <span className="uppercase text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                  {t(`categories.${pickup.category}`, pickup.category)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600">
                                Resident declared 100% segregated recyclables to claim Si = 0.8 subsidy discount.
                              </p>
                            </div>

                            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{t('admin.aiCnnDetection', 'MobileNet AI Detected')}:</span>
                                  <span className="uppercase text-white bg-amber-600 px-2 py-0.5 rounded">
                                    {t(`categories.${pickup.cnnCategory || 'biodegradable'}`, pickup.cnnCategory || 'biodegradable')}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-400">
                                  {t('agent.confidence', 'Confidence')}: {((pickup.cnnConfidence || 0.88) * 100).toFixed(1)}%
                                </span>
                              </div>
                              {pickup.wastePhotoUrl && (
                                <div className="relative rounded-xl overflow-hidden h-32 border border-slate-700 mt-2">
                                  <img
                                    src={pickup.wastePhotoUrl}
                                    alt="Waste evidence"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute bottom-1 left-2 text-[10px] font-mono text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded">
                                    {t('admin.evidenceSample', 'Evidence Sample')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Admin Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-200/80">
                            <span className="text-xs text-amber-900 font-medium">
                              Resolve audit to finalize bill settlement:
                            </span>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => onResolveMismatch(pickup.id, 'accept_resident')}
                                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{t('admin.acceptResident', 'Approve Resident Category (Si = 0.8)')}</span>
                              </button>
                              <button
                                onClick={() => onResolveMismatch(pickup.id, 'enforce_penalty')}
                                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{t('admin.enforcePenalty', 'Enforce Contamination Penalty (Si = 1.5)')}</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{t('admin.noFlagsTitle', 'All Mismatches Resolved')}</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {t('admin.noFlagsDesc', 'All collection photos match declared waste classes. No pending audits in queue.')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 4.2: AI WASTE VISION STUDIO */}
              {aiIotTab === 'ai_vision' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{t('admin.aiWasteVisionTab', 'MobileNet CNN Waste Vision Studio')}</h3>
                      <p className="text-xs text-slate-500">Live inference model test bench and transfer learning feature inspector.</p>
                    </div>
                    {onNavigateView && (
                      <button
                        onClick={() => onNavigateView('cnn_classifier')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Full Studio</span>
                      </button>
                    )}
                  </div>
                  <CnnClassifierStudio />
                </div>
              )}

              {/* SUB-TAB 4.3: IOT SCALE TELEMETRY */}
              {aiIotTab === 'iot_scale' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{t('admin.iotScaleTelemetryTab', 'ESP32 & HX711 Load Cell Telemetry')}</h3>
                      <p className="text-xs text-slate-500">Direct hardware scale test bench, tare platform, and 24-bit ADC telemetry stream.</p>
                    </div>
                    {onNavigateView && (
                      <button
                        onClick={() => onNavigateView('iot_scale')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Full Scale Lab</span>
                      </button>
                    )}
                  </div>
                  <IotScaleSimulator
                    currentScaleWeight={scaleLiveWeight}
                    onUpdateScaleWeight={onUpdateScaleWeight || (() => {})}
                    onTareScale={onTareScale || (() => {})}
                    onPostScaleTelemetry={onPostScaleTelemetry || (() => {})}
                  />
                </div>
              )}

              {/* SUB-TAB 4.4: DEVICE / TELEMETRY LOGS */}
              {aiIotTab === 'device_logs' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('admin.deviceTelemetryLogsTab', 'ESP32 Raw Packet Feed')}</h3>
                    <p className="text-xs text-slate-500">Real-time weight recordings, ADC counts, and battery voltage transmitted by field scales.</p>
                  </div>

                  <div className="space-y-3">
                    {weightLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                            ESP
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-slate-900">{log.scaleId}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              ADC: {log.rawADC.toLocaleString()} counts • {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Battery className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{log.batteryVoltage.toFixed(2)}V</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Wifi className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>{log.wifiRssi} dBm</span>
                          </div>

                          <div className="font-mono text-base font-black text-emerald-600 ml-auto sm:ml-0">
                            {log.weightKg.toFixed(2)} KG
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* GROUP 5 – ADVANCED SYSTEM MODULES */}
          {/* ========================================================================= */}
          {activeGroup === 'group5_advanced' && (
            <div className="space-y-6">
              
              {/* SUB-TAB 5.1: DYNAMIC PRICING ENGINE */}
              {advancedTab === 'pricing_engine' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{t('admin.dynamicPricingEngineTab', 'Dynamic Municipal Pricing Engine')}</h3>
                      <p className="text-xs text-slate-500">Interactive mathematical simulation of processing fees, buybacks, and segregation factors.</p>
                    </div>
                    {onNavigateView && (
                      <button
                        onClick={() => onNavigateView('pricing_calc')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Full Calculator</span>
                      </button>
                    )}
                  </div>
                  <PricingCalculator />
                </div>
              )}

              {/* SUB-TAB 5.2: TECHNICAL / SYSTEM MONITORING */}
              {advancedTab === 'system_monitoring' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{t('admin.technicalMonitoringTab', 'Technical / System Monitoring')}</h3>
                    <p className="text-xs text-slate-500">Express server operational telemetry, endpoint health, database metrics, and hardware connectivity.</p>
                  </div>

                  {/* System Architecture Health Cards */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Node.js Express API</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <div className="text-lg font-mono font-bold text-emerald-400">PORT 3000 ONLINE</div>
                      <div className="text-[11px] text-slate-400 font-mono">Uptime: 99.98% • Latency: 14ms</div>
                    </div>

                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">ESP32 Telemetry Hub</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                      </div>
                      <div className="text-lg font-mono font-bold text-blue-400">REST ACTIVE</div>
                      <div className="text-[11px] text-slate-400 font-mono">1 Active Scale Node Connected</div>
                    </div>

                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">AI Inference Engine</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                      </div>
                      <div className="text-lg font-mono font-bold text-purple-400">MobileNet CNN v2</div>
                      <div className="text-[11px] text-slate-400 font-mono">FastAPI / In-Memory Transfer</div>
                    </div>

                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Security & RBAC</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      </div>
                      <div className="text-lg font-mono font-bold text-amber-400">STRICT RBAC</div>
                      <div className="text-[11px] text-slate-400 font-mono">JWT Bearer & Role Enforced</div>
                    </div>
                  </div>

                  {/* REST API Endpoints Status Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                      Production REST API Health & Telemetry Routes
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[540px]">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                            <th className="py-2.5 px-4">Method</th>
                            <th className="py-2.5 px-3">Endpoint</th>
                            <th className="py-2.5 px-3">Purpose</th>
                            <th className="py-2.5 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          <tr>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold">POST</td>
                            <td className="py-2.5 px-3 text-slate-800">/api/auth/login</td>
                            <td className="py-2.5 px-3 font-sans text-slate-600">Strict Role Verification & JWT Session</td>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold">200 OK</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-blue-600 font-bold">GET</td>
                            <td className="py-2.5 px-3 text-slate-800">/api/pickups</td>
                            <td className="py-2.5 px-3 font-sans text-slate-600">Active municipal pickup streams</td>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold">200 OK</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold">POST</td>
                            <td className="py-2.5 px-3 text-slate-800">/api/scale/telemetry</td>
                            <td className="py-2.5 px-3 font-sans text-slate-600">ESP32 24-bit strain ADC ingest</td>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold">200 OK</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold">POST</td>
                            <td className="py-2.5 px-3 text-slate-800">/api/classify</td>
                            <td className="py-2.5 px-3 font-sans text-slate-600">MobileNet CNN waste inference</td>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold">200 OK</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-blue-600 font-bold">GET</td>
                            <td className="py-2.5 px-3 text-slate-800">/api/admin/metrics</td>
                            <td className="py-2.5 px-3 font-sans text-slate-600">Municipal aggregated metrics</td>
                            <td className="py-2.5 px-4 text-emerald-600 font-bold">200 OK</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 5.3: CODE REPOSITORY */}
              {advancedTab === 'code_repo' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{t('admin.codeRepositoryTab', 'EcoCollect Source Code Repository')}</h3>
                      <p className="text-xs text-slate-500">Inspect verified React components, Express server, and ESP32 hardware firmware.</p>
                    </div>
                    {onNavigateView && (
                      <button
                        onClick={() => onNavigateView('code_explorer')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Full Explorer</span>
                      </button>
                    )}
                  </div>
                  <CodeExplorer />
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
