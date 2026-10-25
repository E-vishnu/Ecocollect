import React, { useState } from 'react';
import { 
  Scale, 
  RotateCcw, 
  Radio, 
  Send, 
  Battery, 
  Wifi, 
  Sliders, 
  Cpu, 
  CheckCircle2, 
  Zap,
  Info,
  Sparkles
} from 'lucide-react';
import { WeightLog } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface IotScaleSimulatorProps {
  currentScaleWeight: number;
  onUpdateScaleWeight: (weight: number) => void;
  onTareScale: () => void;
  onPostScaleTelemetry: (log: WeightLog) => void;
}

export const IotScaleSimulator: React.FC<IotScaleSimulatorProps> = ({
  currentScaleWeight,
  onUpdateScaleWeight,
  onTareScale,
  onPostScaleTelemetry
}) => {
  const { t } = useLanguage();
  const [calibrationFactor, setCalibrationFactor] = useState(2280.0);
  const [tareOffset, setTareOffset] = useState(45200);
  const [batteryVoltage, setBatteryVoltage] = useState(3.92);
  const [wifiRssi, setWifiRssi] = useState(-62);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);

  const rawADC = Math.round(tareOffset + (currentScaleWeight * calibrationFactor));

  const handleTare = () => {
    setTareOffset(rawADC);
    onTareScale();
  };

  const handleTransmit = () => {
    setIsTransmitting(true);
    setTimeout(() => {
      const log: WeightLog = {
        id: 'wlog_' + Date.now(),
        scaleId: 'ESP32-HX711-UNIT-01',
        weightKg: Math.round(currentScaleWeight * 100) / 100,
        rawADC,
        batteryVoltage,
        wifiRssi,
        timestamp: new Date().toISOString()
      };
      onPostScaleTelemetry(log);
      setIsTransmitting(false);
      setLastSentTime(new Date().toLocaleTimeString());
    }, 600);
  };

  const sampleWeights = [
    { label: 'PET Bottles (1.2 kg)', weight: 1.20 },
    { label: 'E-Waste Box (2.1 kg)', weight: 2.10 },
    { label: 'Standard Recyclables (4.85 kg)', weight: 4.85 },
    { label: 'Cardboard Bundle (6.4 kg)', weight: 6.40 },
    { label: 'Bulk Commercial (12.5 kg)', weight: 12.50 }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Hardware Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                {t('nav.iotTelemetry', 'IoT Scale Telemetry')}
              </span>
              <span className="text-xs text-slate-400">HX711 24-Bit ADC + 50KG Strain Gauge</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">{t('nav.iotScaleTelemetry', 'ESP32 Smart Scale Telemetry Node')}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-800 border border-slate-700 px-4 py-2 rounded-2xl text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Battery className="w-4 h-4" />
            <span className="font-mono font-bold">{batteryVoltage.toFixed(2)}V (88%)</span>
          </div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <Wifi className="w-4 h-4" />
            <span className="font-mono font-bold">{wifiRssi} dBm</span>
          </div>
        </div>
      </div>

      {/* Main Hardware Rig */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Scale Visualizer & Telemetry Sender */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Digital LCD Scale Display */}
          <div className="bg-slate-950 rounded-3xl p-8 border-4 border-slate-800 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-4 left-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-[10px] text-emerald-400 tracking-wider font-bold">
                {t('scaleLab.esp32RestActive', 'ESP32 REST STREAM ACTIVE')}
              </span>
            </div>

            <div className="my-6">
              <div className="text-5xl sm:text-7xl font-mono font-black text-emerald-400 tracking-tight drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                {currentScaleWeight.toFixed(2)}
                <span className="text-xl sm:text-2xl text-emerald-600 font-sans ml-2">KG</span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-2">
                {t('scaleLab.rawAdcLabel', 'Raw ADC:')} <span className="text-white font-bold">{rawADC.toLocaleString()}</span> counts • Tare: {tareOffset}
              </div>
            </div>

            {/* Quick Tare & Zero Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-900">
              <button
                onClick={handleTare}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('scaleLab.tareZeroPlatform', 'Tare / Zero Platform (0.00 kg)')}</span>
              </button>

              <button
                onClick={handleTransmit}
                disabled={isTransmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTransmitting ? t('scaleLab.transmitting', 'Transmitting to Cloud...') : t('scaleLab.transmitBtn', 'Transmit Telemetry Packet')}</span>
              </button>
            </div>

            {lastSentTime && (
              <p className="text-[11px] text-emerald-400 mt-3 font-mono">
                ✓ {t('scaleLab.lastTransmitted', 'Last Packet Transmitted:')} {lastSentTime} (/api/iot/weight-reading)
              </p>
            )}
          </div>

          {/* Continuous Weight Slider & Presets */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {t('scaleLab.simulatePhysicalLoad', 'Simulate Physical Load Weight')}
              </label>
              <span className="font-mono text-sm font-black text-emerald-600">
                {currentScaleWeight.toFixed(2)} KG
              </span>
            </div>

            <input
              type="range"
              min="0.0"
              max="25.0"
              step="0.05"
              value={currentScaleWeight}
              onChange={(e) => onUpdateScaleWeight(parseFloat(e.target.value))}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0.00 kg (Empty Tare)</span>
              <span>12.50 kg</span>
              <span>25.00 kg (Full Load)</span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500">{t('scaleLab.quickTestPresets', 'Quick Test Weight Presets:')}</span>
              <div className="flex flex-wrap gap-2">
                {sampleWeights.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => onUpdateScaleWeight(s.weight)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 transition-all"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Col: ESP32 Hardware Diagnostics & Calibration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>{t('scaleLab.firmwareCalibParams', 'Firmware Calibration Parameters')}</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>{t('scaleLab.calibFactorLabel', 'Calibration Factor:')}</span>
                <span className="font-mono font-bold text-slate-900">{calibrationFactor}</span>
              </div>
              <input
                type="range"
                min="2000"
                max="2500"
                step="5"
                value={calibrationFactor}
                onChange={(e) => setCalibrationFactor(parseFloat(e.target.value))}
                className="w-full accent-slate-700"
              />
              <span className="text-[10px] text-slate-400 block">{t('scaleLab.calibAgainstMass', 'Calibrated against 1.00 KG test mass')}</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>{t('scaleLab.batteryLevelLiIon', 'Battery Level (Li-Ion):')}</span>
                <span className="font-mono font-bold text-emerald-600">{batteryVoltage.toFixed(2)} V</span>
              </div>
              <input
                type="range"
                min="3.4"
                max="4.2"
                step="0.05"
                value={batteryVoltage}
                onChange={(e) => setBatteryVoltage(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>{t('scaleLab.wifiSignalRssi', 'Wi-Fi Signal (RSSI):')}</span>
                <span className="font-mono font-bold text-blue-600">{wifiRssi} dBm</span>
              </div>
              <input
                type="range"
                min="-90"
                max="-40"
                step="1"
                value={wifiRssi}
                onChange={(e) => setWifiRssi(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('scaleLab.hardwareSpecs', 'ESP32 & HX711 Architecture')}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {t('scaleLab.hardwareDescription', 'The ESP32 reads 24-bit strain delta over DOUT (GPIO 16) and SCK (GPIO 4), performs deadband noise rejection, and POSTs JSON payloads over Wi-Fi.')}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
