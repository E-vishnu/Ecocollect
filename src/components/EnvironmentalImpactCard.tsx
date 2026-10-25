import React from 'react';
import { Leaf, TreePine, Droplets, Award, ArrowUpRight } from 'lucide-react';
import { EnvironmentalImpact } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface EnvironmentalImpactCardProps {
  impact: EnvironmentalImpact;
  rewardPoints: number;
}

export const EnvironmentalImpactCard: React.FC<EnvironmentalImpactCardProps> = ({
  impact,
  rewardPoints
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 text-white rounded-3xl p-5 border border-emerald-500/30 shadow-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Leaf className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">{t('environmentalImpact.cardTitle', 'Your Environmental Conservation')}</h3>
            <p className="text-[11px] text-emerald-200/80">{t('environmentalImpact.cardSubtitle', 'EPA WARM Verified Diverted Metric Calculation')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 rounded-full text-xs font-black text-emerald-300 self-start sm:self-auto shrink-0">
          <Award className="w-3.5 h-3.5" />
          <span>{rewardPoints} {t('environmentalImpact.greenCredits', 'Green Credits')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('residentApp.wasteDiverted', 'Waste Diverted')}</span>
          <span className="text-xl font-mono font-black text-white mt-0.5 block">
            {impact.wasteDivertedKg} <span className="text-xs font-normal text-slate-400">KG</span>
          </span>
          <span className="text-[9px] text-emerald-400">{t('environmentalImpact.keptFromLandfills', 'Kept from landfills')}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('environmentalImpact.co2Prevented', 'CO₂ Prevented')}</span>
          <span className="text-xl font-mono font-black text-emerald-400 mt-0.5 block">
            {impact.co2PreventedKg} <span className="text-xs font-normal text-slate-400">KG</span>
          </span>
          <span className="text-[9px] text-slate-300">{t('environmentalImpact.emissionAbatement', 'Emission abatement')}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('environmentalImpact.treesEquivalent', 'Trees Equivalent')}</span>
          <span className="text-xl font-mono font-black text-teal-300 mt-0.5 block flex items-center justify-center gap-1">
            <TreePine className="w-4 h-4 text-emerald-400" />
            <span>{impact.treesSavedEquivalent}</span>
          </span>
          <span className="text-[9px] text-slate-300">{t('environmentalImpact.forestConservation', 'Forest conservation')}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('environmentalImpact.waterConserved', 'Water Conserved')}</span>
          <span className="text-xl font-mono font-black text-cyan-300 mt-0.5 block flex items-center justify-center gap-1">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span>{impact.waterSavedLiters}</span> <span className="text-xs font-normal text-slate-400">L</span>
          </span>
          <span className="text-[9px] text-slate-300">{t('environmentalImpact.industrialSavings', 'Industrial savings')}</span>
        </div>
      </div>
    </div>
  );
};
