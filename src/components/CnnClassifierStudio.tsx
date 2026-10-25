import React, { useState } from 'react';
import { 
  Cpu, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  BookOpen, 
  Code,
  Image as ImageIcon
} from 'lucide-react';
import { WasteCategory } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface SampleItem {
  id: string;
  name: string;
  declaredCategory: WasteCategory;
  trueCategory: WasteCategory;
  url: string;
  probabilities: {
    biodegradable: number;
    dry_recyclable: number;
    plastic: number;
    e_waste: number;
  };
  notes: string;
}

const SAMPLES: SampleItem[] = [
  {
    id: 's1',
    name: 'PET Water Bottles & Soda Cans',
    declaredCategory: 'plastic',
    trueCategory: 'plastic',
    url: 'https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=600&q=80',
    probabilities: { plastic: 0.96, dry_recyclable: 0.03, biodegradable: 0.005, e_waste: 0.005 },
    notes: 'Clean translucent polymer bottles. Matches resident declaration.'
  },
  {
    id: 's2',
    name: 'Corrugated Packing Box & Newspapers',
    declaredCategory: 'dry_recyclable',
    trueCategory: 'dry_recyclable',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
    probabilities: { dry_recyclable: 0.98, plastic: 0.015, biodegradable: 0.003, e_waste: 0.002 },
    notes: 'Brown fibrous pulp texture with sharp edge geometry.'
  },
  {
    id: 's3',
    name: 'Printed Circuit Boards & Lithium Battery',
    declaredCategory: 'e_waste',
    trueCategory: 'e_waste',
    url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=600&q=80',
    probabilities: { e_waste: 0.94, dry_recyclable: 0.04, plastic: 0.015, biodegradable: 0.005 },
    notes: 'Green solder mask with semiconductor IC surface mounts.'
  },
  {
    id: 's4',
    name: 'Vegetable Peels & Kitchen Waste (Contamination Example)',
    declaredCategory: 'plastic', // Resident falsely declared plastic to get buyback
    trueCategory: 'biodegradable',
    url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
    probabilities: { biodegradable: 0.91, plastic: 0.05, dry_recyclable: 0.03, e_waste: 0.01 },
    notes: 'Wet organic matter detected. Triggers mismatch flag & penalty Si = 1.5.'
  }
];

export const CnnClassifierStudio: React.FC = () => {
  const { t } = useLanguage();
  const [selectedSample, setSelectedSample] = useState<SampleItem>(SAMPLES[0]);
  const [declaredCategory, setDeclaredCategory] = useState<WasteCategory>(SAMPLES[0].declaredCategory);
  const [isInferring, setIsInferring] = useState(false);

  const handleSelectSample = (sample: SampleItem) => {
    setSelectedSample(sample);
    setDeclaredCategory(sample.declaredCategory);
    setIsInferring(true);
    setTimeout(() => {
      setIsInferring(false);
    }, 450);
  };

  const isMismatch = declaredCategory !== selectedSample.trueCategory;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Studio Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-purple-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-500/30">
                {t('nav.aiWasteStudio', 'AI Waste Vision Studio')}
              </span>
              <span className="text-xs text-slate-400">4-Class Transfer Learning Head</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">{t('nav.aiWasteStudio', 'Computer Vision Classifier Studio')}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-2xl text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 font-mono">{t('visionStudio.fastApiOnline', 'FastAPI :8000/classify Online')}</span>
        </div>
      </div>

      {/* Main Vision Interface */}
      <div className="grid md:grid-cols-12 gap-6 min-w-0">
        
        {/* Left 5 Cols: Sample Gallery & Image Preview */}
        <div className="md:col-span-5 space-y-4 min-w-0">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-900 uppercase">{t('visionStudio.testDatasetSamples', 'Test Dataset Samples')}</span>
              <span className="text-[11px] text-slate-500">{t('visionStudio.tapToRun', 'Tap to run inference')}</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {SAMPLES.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className={`p-2 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedSample.id === sample.id
                      ? 'border-purple-500 bg-purple-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <img
                    src={sample.url}
                    alt={sample.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-20 object-cover rounded-xl mb-1.5"
                  />
                  <div className="text-[11px] font-bold text-slate-900 truncate leading-tight">
                    {sample.name}
                  </div>
                  <span className="text-[10px] uppercase font-mono text-purple-700 font-bold block mt-0.5">
                    {sample.trueCategory}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Declared Category Simulator Controls */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-black text-slate-900 uppercase block">
              {t('visionStudio.simulateResidentDeclared', 'Simulate Resident Declared Category')}
            </label>
            <select
              value={declaredCategory}
              onChange={(e) => setDeclaredCategory(e.target.value as WasteCategory)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="plastic">Plastic (Declared for ₹18/kg Buyback)</option>
              <option value="dry_recyclable">Dry Recyclable (Declared for ₹12/kg Buyback)</option>
              <option value="e_waste">E-Waste (Declared for ₹45/kg Buyback)</option>
              <option value="biodegradable">{t('visionStudio.biodegradableRoutine', 'Biodegradable (Routine Household)')}</option>
            </select>
            <span className="text-[11px] text-slate-500 block">
              {t('visionStudio.testMismatchExpl', 'Test how the backend flags mismatches when residents declare recyclables for contaminated wet bags.')}
            </span>
          </div>
        </div>

        {/* Right 7 Cols: Softmax Probabilities & Cross-Check Matrix */}
        <div className="md:col-span-7 space-y-4 min-w-0">
          <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-6">
            
            {/* Top Inference State */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                  {t('visionStudio.layerOutput', 'MobileNetV2 Layer Output')}
                </span>
                <h3 className="text-lg font-black text-white capitalize mt-0.5">
                  {t('visionStudio.predictedClass', 'Predicted Class:')} {t(`categories.${selectedSample.trueCategory}`, selectedSample.trueCategory.replace('_', ' '))}
                </h3>
              </div>
              {isInferring ? (
                <span className="text-xs text-amber-300 flex items-center gap-1.5 font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t('visionStudio.forwardPass', 'Forward Pass...')}
                </span>
              ) : (
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 w-fit">
                  {t('agent.confidence', 'Confidence')}: {((selectedSample.probabilities[selectedSample.trueCategory] || 0.95) * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {/* 4-Class Softmax Probability Bar Charts */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('visionStudio.softmaxDistribution', 'Softmax Normalized Distribution:')}
              </span>

              {[
                { key: 'plastic', label: `1. ${t('categories.plastic', 'Plastic')} (PET/HDPE)`, color: 'bg-cyan-500' },
                { key: 'dry_recyclable', label: `2. ${t('categories.dry_recyclable', 'Dry Recyclable')} (Paper/Cardboard)`, color: 'bg-blue-500' },
                { key: 'e_waste', label: `3. ${t('categories.e_waste', 'E-Waste')} (PCBs/Cells)`, color: 'bg-purple-500' },
                { key: 'biodegradable', label: `4. ${t('categories.biodegradable', 'Biodegradable')} (Food Scraps)`, color: 'bg-emerald-500' }
              ].map((item) => {
                const prob = selectedSample.probabilities[item.key as keyof typeof selectedSample.probabilities] || 0.01;
                const isTop = selectedSample.trueCategory === item.key;
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className={isTop ? 'text-white font-bold' : 'text-slate-400'}>{item.label}</span>
                      <span className="font-mono font-bold text-slate-300">{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(prob * 100, 3)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cross-Check Flag Matrix */}
            <div className={`p-4 rounded-2xl border ${isMismatch ? 'bg-amber-950/60 border-amber-500/40 text-amber-200' : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'} space-y-2`}>
              <div className="flex items-center gap-2 font-bold text-xs">
                {isMismatch ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                <span>
                  {isMismatch
                    ? t('visionStudio.crossCheckAlert', 'Cross-Check Alert: Category Mismatch Flagged')
                    : t('visionStudio.crossCheckVerified', 'Cross-Check Verified: Declared Category Matches Vision Classifier')}
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {isMismatch
                  ? `${t('admin.declaredByResident', 'Resident declared')} '${t(`categories.${declaredCategory}`, declaredCategory)}' ${t('admin.aiClassifiedCategory', 'but CNN recognized')} '${t(`categories.${selectedSample.trueCategory}`, selectedSample.trueCategory)}'. ${t('admin.overridePenalty', 'System triggers Admin Audit and overrides Si = 1.5.')}`
                  : `${t('admin.declaredByResident', 'Resident declared')} '${t(`categories.${declaredCategory}`, declaredCategory)}' ${t('admin.statusApproved', 'which aligns with CNN classification at')} ${(selectedSample.probabilities[selectedSample.trueCategory] * 100).toFixed(1)}% ${t('agent.confidence', 'confidence')}.`}
              </p>
            </div>

          </div>

          {/* Model Transfer Learning Summary */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-xs space-y-2 text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>{t('visionStudio.hyperparameters', 'Training Hyperparameters (train.py)')}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {t('visionStudio.backbone', 'Backbone:')} <strong>MobileNetV2</strong> with frozen weights, customized with a 2-layer MLP head (Dropout 0.2, Linear 1280 → 4), trained with CrossEntropyLoss and AdamW (lr=1e-4) over municipal dataset.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
