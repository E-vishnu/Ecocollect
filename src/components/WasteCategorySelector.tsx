import React from 'react';
import { 
  Sparkles, 
  FileText, 
  Apple, 
  Layers, 
  Cpu, 
  Shirt, 
  AlertTriangle, 
  PackageCheck, 
  GlassWater,
  CheckCircle2,
  ShieldCheck,
  Building2,
  TreePine,
  Info
} from 'lucide-react';
import { WasteCategory, WasteCategoryConfig } from '../types';
import { WASTE_CATEGORIES_REGISTRY } from '../data/pricingConstants';
import { useLanguage } from '../i18n/LanguageContext';

interface WasteCategorySelectorProps {
  selectedCategory: WasteCategory;
  onSelectCategory: (cat: WasteCategory) => void;
  categoryDetails: Record<string, any>;
  onDetailChange: (key: string, value: any) => void;
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  organic: Apple,
  plastic: Sparkles,
  paper_cardboard: FileText,
  glass: GlassWater,
  metal: Layers,
  e_waste: Cpu,
  textile: Shirt,
  hazardous: AlertTriangle,
  other_recyclable: PackageCheck,
  biodegradable: Apple,
  dry_recyclable: FileText,
  mixed: PackageCheck
};

export const WasteCategorySelector: React.FC<WasteCategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryDetails,
  onDetailChange
}) => {
  const { t } = useLanguage();
  const [activeGroup, setActiveGroup] = React.useState<'all' | 'recyclables' | 'special' | 'organic' | 'other'>('all');

  const getCategoryGroup = (catId: WasteCategory): 'recyclables' | 'special' | 'organic' | 'other' => {
    if (['plastic', 'paper_cardboard', 'dry_recyclable', 'metal', 'glass'].includes(catId)) return 'recyclables';
    if (['e_waste', 'hazardous'].includes(catId)) return 'special';
    if (['organic', 'biodegradable'].includes(catId)) return 'organic';
    return 'other';
  };

  const filteredCategories = WASTE_CATEGORIES_REGISTRY.filter(cat => {
    if (activeGroup === 'all') return true;
    return getCategoryGroup(cat.id) === activeGroup;
  });

  const currentConfig = WASTE_CATEGORIES_REGISTRY.find(c => c.id === selectedCategory) || WASTE_CATEGORIES_REGISTRY[0];

  return (
    <div className="space-y-6">
      
      {/* Category Group Filter Tabs */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>{t('categories.whatRecycle', '1. What would you like to recycle?')}</span>
            <span className="text-[10px] font-normal text-slate-500">({filteredCategories.length} available)</span>
          </label>
          <span className="text-xs font-mono font-bold text-emerald-600">
            {currentConfig.buybackRate > 0 ? `${t('wasteSelector.selectedBuyback', 'Selected Buyback')}: ₹${currentConfig.buybackRate}/kg` : t('wasteSelector.subsidizedRoutine', 'Subsidized Routine Collection')}
          </span>
        </div>

        {/* Group Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3 bg-slate-100 p-1.5 rounded-2xl">
          {[
            { id: 'all', label: t('categories.allGroup', 'All Categories') },
            { id: 'recyclables', label: t('categories.recyclablesGroup', '♻️ Recyclables (Plastic, Paper, Metal, Glass)') },
            { id: 'special', label: t('categories.specialGroup', '⚡ Special Waste (E-Waste, Batteries)') },
            { id: 'organic', label: t('categories.organicGroup', '🌱 Organic (Wet / Food Waste)') },
            { id: 'other', label: t('categories.otherGroup', '📦 Other Waste (Textiles, Mixed)') }
          ].map((grp) => (
            <button
              key={grp.id}
              type="button"
              id={`cat-group-btn-${grp.id}`}
              onClick={() => setActiveGroup(grp.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeGroup === grp.id
                  ? 'bg-white text-emerald-950 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {grp.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredCategories.map((category) => {
            const isSelected = selectedCategory === category.id;
            const Icon = CATEGORY_ICONS[category.id] || Sparkles;

            return (
              <div
                key={category.id}
                id={`cat-card-${category.id}`}
                onClick={() => onSelectCategory(category.id)}
                className={`p-3 sm:p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between text-left relative min-w-0 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-900"
                      style={{ backgroundColor: `${category.colorHex}20`, color: category.colorHex }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="font-extrabold text-xs text-slate-900 leading-tight">
                    {t(`categories.${category.id}`, category.name)}
                  </div>

                  <div className="text-[11px] font-extrabold text-emerald-700 mt-1 font-mono">
                    {category.buybackRate > 0 ? `₹${category.buybackRate.toFixed(2)}/kg` : t('wasteSelector.subsidizedRoutineShort', 'Subsidized Routine')}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {category.tagline}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Category Dynamic Information & Specific Fields */}
      <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-5 space-y-4">
        
        {/* Category Header & Recycling Destination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${currentConfig.badgeClass}`}>
                {currentConfig.name}
              </span>
              {currentConfig.requiresSpecialHandling && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {t('wasteSelector.specialSafety', 'Special Safety Protocol')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {currentConfig.environmentalBenefit}
            </p>
          </div>

          <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-right flex items-center sm:flex-col sm:items-end justify-between gap-1 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-500" />
              {t('wasteSelector.destinedFacility', 'Destined Recycling Facility')}
            </span>
            <span className="font-semibold text-slate-800 text-[11px] max-w-xs text-right">
              {currentConfig.recyclingFacility}
            </span>
          </div>
        </div>

        {/* Accepted Items Chips */}
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            {t('wasteSelector.acceptedMaterials', 'Accepted Materials in this Category:')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {currentConfig.acceptedItems.map((item, idx) => (
              <span
                key={idx}
                className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium"
              >
                ✓ {item}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Input Fields */}
        <div className="pt-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">
            2. {t('wasteSelector.specificationsTitle', 'Category-Specific Waste Specifications')}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentConfig.fieldDefinitions.map((field) => {
              const currentValue = categoryDetails[field.key] !== undefined 
                ? categoryDetails[field.key] 
                : (field.options ? field.options[0] : '');

              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{field.label} {field.required && <span className="text-rose-500">*</span>}</span>
                    {field.unit && <span className="text-[10px] text-slate-400 uppercase font-mono">{field.unit}</span>}
                  </label>

                  {field.type === 'select' && field.options ? (
                    <select
                      id={`field-${field.key}`}
                      value={currentValue}
                      onChange={(e) => onDetailChange(field.key, e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'number' ? (
                    <input
                      id={`field-${field.key}`}
                      type="number"
                      step="0.1"
                      value={currentValue}
                      placeholder={field.placeholder}
                      onChange={(e) => onDetailChange(field.key, parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  ) : (
                    <input
                      id={`field-${field.key}`}
                      type="text"
                      value={currentValue}
                      placeholder={field.placeholder}
                      onChange={(e) => onDetailChange(field.key, e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  )}

                  {field.helperText && (
                    <span className="text-[10px] text-slate-500 block">{field.helperText}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
