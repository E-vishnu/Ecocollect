import React, { useState } from 'react';
import { 
  Calculator, 
  Sparkles, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  RotateCcw, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { WasteCategory, PickupType } from '../types';
import { calculateDynamicPricing, BASE_PROCESSING_RATES, RECYCLABLE_BUYBACK_RATES, PICKUP_SURCHARGES } from '../data/pricingConstants';
import { useLanguage } from '../i18n/LanguageContext';

export const PricingCalculator: React.FC = () => {
  const { t } = useLanguage();
  const [category, setCategory] = useState<WasteCategory>('plastic');
  const [pickupType, setPickupType] = useState<PickupType>('routine');
  const [weightKg, setWeightKg] = useState<number>(4.85);
  const [isSegregated, setIsSegregated] = useState<boolean>(true);
  const [customSegregationFactor, setCustomSegregationFactor] = useState<number>(0.8);

  const result = calculateDynamicPricing({
    category,
    pickupType,
    weightKg,
    isSegregated,
    segregationFactorOverride: customSegregationFactor
  });

  const handleSegregationToggle = (segregated: boolean) => {
    setIsSegregated(segregated);
    setCustomSegregationFactor(segregated ? 0.8 : 1.5);
  };

  const presetScenarios = [
    {
      name: t('pricingCalc.scenario1', '5 KG Clean PET Plastic (Segregated)'),
      cat: 'plastic' as WasteCategory,
      type: 'routine' as PickupType,
      weight: 5.0,
      seg: true,
      factor: 0.8
    },
    {
      name: t('pricingCalc.scenario2', '8 KG Mixed Wet/Dry (Contaminated)'),
      cat: 'mixed' as WasteCategory,
      type: 'routine' as PickupType,
      weight: 8.0,
      seg: false,
      factor: 1.5
    },
    {
      name: t('pricingCalc.scenario3', '2.5 KG E-Waste (Specialized Pickup)'),
      cat: 'e_waste' as WasteCategory,
      type: 'e_waste_special' as PickupType,
      weight: 2.5,
      seg: true,
      factor: 0.8
    },
    {
      name: t('pricingCalc.scenario4', '15 KG Bulk Cardboard Cleanout'),
      cat: 'dry_recyclable' as WasteCategory,
      type: 'bulk' as PickupType,
      weight: 15.0,
      seg: true,
      factor: 0.8
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                {t('nav.pricingEngine', 'Dynamic Pricing Engine')}
              </span>
              <span className="text-xs text-slate-400">{t('pricingCalc.engineTitle', 'Dynamic Pricing & Recyclable Buyback Formulation')}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">{t('nav.pricingEngine', 'EcoCollect Pricing Formulation Engine')}</h1>
          </div>
        </div>

        <div className="font-mono text-xs text-emerald-300 bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl break-words">
          P = Σ(Wi × Ri × Si) + F • Rp = Σ(Wj × Vj)
        </div>
      </div>

      {/* Distinction Banner: Regular Municipal vs On-Demand Pickup */}
      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/90 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 block text-xs">
              {t('pricingCalc.distinctionTitle', 'Service Separation: Regular Municipal Collection vs. On-Demand Pickup')}
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">
              <strong>Regular Municipal Collection</strong> is 100% free and requires no booking. 
              The engine below calculates <strong>EcoCollect On-Demand Doorstep Pickups</strong>, where a dedicated trip fee (P) is offset by recyclable buyback value (Rp), resulting in a net settlement (Net = Rp - P).
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
            Municipal: ₹0 Fee
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            On-Demand: Net = Rp - P
          </span>
        </div>
      </div>

      {/* Preset Scenarios */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <span className="text-xs font-black text-slate-900 uppercase">{t('pricingCalc.testScenarios', 'Test Quick Policy Scenarios:')}</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {presetScenarios.map((sc) => (
            <button
              key={sc.name}
              onClick={() => {
                setCategory(sc.cat);
                setPickupType(sc.type);
                setWeightKg(sc.weight);
                setIsSegregated(sc.seg);
                setCustomSegregationFactor(sc.factor);
              }}
              className="p-3 text-left rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-xs"
            >
              <div className="font-bold text-slate-900">{sc.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {sc.weight}kg • Si = {sc.factor}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Calculator Grid */}
      <div className="grid md:grid-cols-12 gap-6">
        
        {/* Left 6 Cols: Variable Input Controls */}
        <div className="md:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="font-black text-sm text-slate-900 uppercase">1. {t('pricingCalc.paramConfig', 'Parameter Configuration')}</div>

          {/* Weight Wi */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">{t('pricingCalc.totalWeightWi', 'Total Waste Weight (Wi):')}</span>
              <span className="font-mono font-black text-emerald-600 text-sm">{weightKg} KG</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="50"
              step="0.25"
              value={weightKg}
              onChange={(e) => setWeightKg(parseFloat(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Category Ri & Vj */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">{t('pricingCalc.wasteCategoryBaseRates', 'Waste Category & Base Rates:')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WasteCategory)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="plastic">{t('pricingCalc.catPlasticRate', 'Plastic (Ri = ₹3.5/kg, Buyback Vj = ₹18.0/kg)')}</option>
              <option value="dry_recyclable">{t('pricingCalc.catDryPaperRate', 'Dry Paper & Metal (Ri = ₹2.0/kg, Buyback Vj = ₹12.0/kg)')}</option>
              <option value="e_waste">{t('pricingCalc.catEWasteRate', 'E-Waste (Ri = ₹8.0/kg, Buyback Vj = ₹45.0/kg)')}</option>
              <option value="biodegradable">{t('pricingCalc.catBioRate', 'Biodegradable / Wet (Ri = ₹1.5/kg, Buyback Vj = ₹0.0/kg)')}</option>
              <option value="mixed">{t('pricingCalc.catMixedRate', 'Mixed Waste (Ri = ₹12.0/kg, Buyback Vj = ₹0.0/kg)')}</option>
            </select>
          </div>

          {/* Pickup Type Surcharge F */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">{t('pricingCalc.pickupTypeSurcharge', 'Pickup Type & Surcharge (F):')}</label>
            <select
              value={pickupType}
              onChange={(e) => setPickupType(e.target.value as PickupType)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="routine">{t('pricingCalc.pickupRoutineRate', 'Routine Municipal Household (F = ₹0)')}</option>
              <option value="bulk">{t('pricingCalc.pickupBulkRate', 'Bulk / Deep Cleanout (F = ₹150)')}</option>
              <option value="e_waste_special">{t('pricingCalc.pickupEWasteSpecialRate', 'Specialized E-Waste Collection (F = ₹50)')}</option>
              <option value="off_schedule">{t('pricingCalc.pickupOffScheduleRate', 'Off-Schedule Priority Request (F = ₹100)')}</option>
              <option value="commercial">{t('pricingCalc.pickupCommercialRate', 'Commercial / Retail Establishment (F = ₹250)')}</option>
            </select>
          </div>

          {/* Segregation Factor Si */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">{t('pricingCalc.segregationMultiplierSi', 'Segregation Multiplier (Si):')}</span>
              <span className="font-mono font-black text-slate-900">Si = {customSegregationFactor.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSegregationToggle(true)}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  customSegregationFactor < 1.0
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('pricingCalc.strictlySegregated', 'Segregated (Si = 0.8)')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSegregationToggle(false)}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  customSegregationFactor >= 1.0
                    ? 'bg-amber-50 border-amber-400 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t('pricingCalc.unsegregated', 'Mixed Penalty (Si = 1.5)')}</span>
              </button>
            </div>

            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={customSegregationFactor}
              onChange={(e) => setCustomSegregationFactor(parseFloat(e.target.value))}
              className="w-full accent-slate-700 mt-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Si = 0.5 ({t('pricingCalc.maxSubsidy', 'Maximum Subsidy')})</span>
              <span>Si = 1.0 ({t('pricingCalc.neutral', 'Neutral')})</span>
              <span>Si = 2.0 ({t('pricingCalc.doublePenalty', 'Double Penalty')})</span>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Mathematical Proof & Net Breakdown */}
        <div className="md:col-span-6 space-y-4">
          
          {/* Step-by-Step Substitution Proof */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-400">
                {t('pricingCalc.mathematicalEval', 'Mathematical Evaluation')}
              </span>
              <span className="text-xs font-mono text-slate-400">{t('pricingCalc.precisionDecimals', 'Precision: 2 Decimal Places')}</span>
            </div>

            {/* Formula Block 1: Processing Fee P */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 font-mono text-xs space-y-2">
              <div className="text-[11px] text-slate-400 font-sans font-bold">1. {t('pricingCalc.processingFeeFormula', 'Processing Fee Formula:')}</div>
              <div className="text-emerald-300">P = Σ(Wi × Ri × Si) + F</div>
              <div className="text-slate-300">
                P = ({result.weightKg}kg × ₹{result.baseProcessingRate} × {result.segregationFactor}) + ₹{result.fixedSurcharge}
              </div>
              <div className="text-rose-400 font-bold border-t border-slate-700 pt-1">
                = ₹{result.processingFee.toFixed(2)} ({t('pricingCalc.processingCost', 'Processing Cost')})
              </div>
            </div>

            {/* Formula Block 2: Buyback Payout Rp */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 font-mono text-xs space-y-2">
              <div className="text-[11px] text-slate-400 font-sans font-bold">2. {t('pricingCalc.buybackFormula', 'Recyclable Buyback Formula:')}</div>
              <div className="text-emerald-300">Rp = Σ(Wj × Vj)</div>
              <div className="text-slate-300">
                Rp = {result.weightKg}kg × ₹{result.buybackRate}/kg
              </div>
              <div className="text-emerald-400 font-bold border-t border-slate-700 pt-1">
                = ₹{result.recyclablePayout.toFixed(2)} ({t('pricingCalc.grossBuybackValue', 'Gross Buyback Value')})
              </div>
            </div>

            {/* Formula Block 3: Net Settlement */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 font-mono text-xs space-y-2">
              <div className="text-[11px] text-slate-400 font-sans font-bold">3. {t('pricingCalc.netSettlementEq', 'Net Settlement Equation:')}</div>
              <div className="text-emerald-300">Net = Rp - P</div>
              <div className="text-slate-300">
                Net = ₹{result.recyclablePayout.toFixed(2)} - ₹{result.processingFee.toFixed(2)}
              </div>
              <div className={`text-base font-bold border-t border-slate-700 pt-1.5 ${result.isNetPayout ? 'text-emerald-400' : 'text-amber-400'}`}>
                = {result.isNetPayout ? `+ ₹${result.settlementAmount} (${t('pricingCalc.cashbackPayoutResident', 'Cashback Payout to Resident')})` : `- ₹${result.settlementAmount} (${t('pricingCalc.residentPaysFee', 'Resident Pays Processing Charge')})`}
              </div>
            </div>

            {/* Final Highlight Card */}
            <div className={`p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              result.isNetPayout
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-blue-950/60 border-blue-500/50 text-blue-200'
            }`}>
              <div>
                <span className="text-[11px] uppercase font-bold block opacity-80">
                  {result.isNetPayout ? t('pricingCalc.disbursementUpi', 'Disbursement to Resident (UPI)') : t('pricingCalc.paymentCollectionRazorpay', 'Payment Collection (Razorpay)')}
                </span>
                <span className="text-2xl font-black font-mono mt-0.5">
                  ₹{result.settlementAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-left sm:text-right text-xs">
                <span className="block font-bold">
                  {result.isNetPayout ? `✓ ${t('pricingCalc.routineSubsidy', 'Routine Recyclable Subsidy')}` : `⚠️ ${t('pricingCalc.surchargeContaminationApplied', 'Surcharge / Contamination Applied')}`}
                </span>
                <span className="text-[11px] opacity-75">
                  {result.isSegregated ? t('pricingCalc.segregatedRewardActive', 'Segregated reward active') : t('pricingCalc.unsegregatedSortingFee', 'Unsegregated sorting fee')}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
