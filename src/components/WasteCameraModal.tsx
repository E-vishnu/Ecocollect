import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  ArrowRight, 
  RotateCcw, 
  Image as ImageIcon,
  ShieldCheck,
  Info,
  Scale,
  Recycle,
  Video,
  VideoOff,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { WasteCategory } from '../types';
import { WASTE_CATEGORIES_REGISTRY } from '../data/pricingConstants';
import { apiService } from '../services/apiService';
import { useLanguage } from '../i18n/LanguageContext';

export interface CategoryGuess {
  category: WasteCategory;
  confidence: number;
}

export const CATEGORY_EXAMPLE_ITEMS: Record<string, string> = {
  organic: 'food scraps, peels, garden waste',
  plastic: 'bottles, bags, containers, wrappers',
  paper_cardboard: 'newspapers, boxes, books',
  glass: 'bottles, jars',
  metal: 'cans, utensils, scrap',
  e_waste: 'phones, chargers, laptops, batteries, cables',
  textile: 'clothes, bags, shoes, fabric',
  hazardous: 'paint, chemicals, medicines, sprays',
  not_waste_or_unclear: 'people, rooms, screens, blurry or dark images'
};

export interface WasteAnalysisResult {
  mainObjectDescription?: string;
  materialDescription?: string;
  detectedItem: string;
  category: WasteCategory;
  condition: string;
  confidence: number;
  rawConfidence: number;
  topGuesses: CategoryGuess[];
  estimatedWeightKg: number;
  isRecyclable: boolean;
  recyclabilityGrade: string;
  disposalGuideline: string;
  declaredMatch: boolean;
  source: string;
  isRealAi: boolean;
  userCorrection?: {
    originalCategory: WasteCategory;
    correctedCategory: WasteCategory;
    timestamp: string;
  };
}

interface WasteCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCategory: (category: WasteCategory, details: {
    detectedItem: string;
    estimatedWeightKg: number;
    photoUrl?: string;
    condition?: string;
    confidence?: number;
    topGuesses?: CategoryGuess[];
    userCorrection?: {
      originalCategory: WasteCategory;
      correctedCategory: WasteCategory;
      timestamp: string;
    };
  }) => void;
  initialCategory?: WasteCategory;
}

/**
 * Client-side image compression & downscaling helper
 * Resizes image to maximum 1024px on the longest side and compresses to JPEG quality 0.7
 */
export async function compressAndResizeImage(file: File, maxDimension = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsDataURL(file);
  });
}

export const WasteCameraModal: React.FC<WasteCameraModalProps> = ({
  isOpen,
  onClose,
  onApplyCategory,
  initialCategory
}) => {
  const { t } = useLanguage();

  // Hidden file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Live video element & stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLiveStreamActive, setIsLiveStreamActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<WasteAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live status text and elapsed seconds for fast scan feedback
  const [scanStatusText, setScanStatusText] = useState<'Waking server…' | 'Analyzing…' | 'Trying backup model…'>('Waking server…');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Active / Confirmed Category for booking & user corrections
  const [confirmedCategory, setConfirmedCategory] = useState<WasteCategory | null>(null);
  const [isUserConfirmed, setIsUserConfirmed] = useState(false);
  const [showCorrectionPicker, setShowCorrectionPicker] = useState(false);
  const [userCorrection, setUserCorrection] = useState<{
    originalCategory: WasteCategory;
    correctedCategory: WasteCategory;
    timestamp: string;
  } | null>(null);

  // Stop live camera stream
  const stopLiveStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsLiveStreamActive(false);
  }, []);

  // Clean up on close/unmount
  useEffect(() => {
    if (!isOpen) {
      stopLiveStream();
      setImagePreview(null);
      setAnalysisResult(null);
      setErrorMessage(null);
      setIsAnalyzing(false);
      setScanStatusText('Waking server…');
      setElapsedSeconds(0);
      setConfirmedCategory(null);
      setIsUserConfirmed(false);
      setShowCorrectionPicker(false);
      setUserCorrection(null);
    }
  }, [isOpen, stopLiveStream]);

  if (!isOpen) return null;

  // Handle direct file selection (camera or gallery)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      setAnalysisResult(null);
      stopLiveStream();

      // Compress client-side
      const compressedBase64 = await compressAndResizeImage(file);
      setImagePreview(compressedBase64);
    } catch (err: any) {
      setErrorMessage('Could not process image file. Please try another image.');
    } finally {
      // Clear input so same file can be chosen again if needed
      e.target.value = '';
    }
  };

  // Start live camera stream (optional interactive viewfinder)
  const startLiveStream = async () => {
    setStreamError(null);
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Live camera is not supported on this browser. Please use standard photo capture.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsLiveStreamActive(true);
      }
    } catch (err: any) {
      console.warn('Live camera permission error:', err);
      setIsLiveStreamActive(false);
      setStreamError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera access was denied. You can still use the "Take Photo" button or upload an image from your gallery.'
          : 'Unable to start live camera viewfinder. Please use standard capture or upload.'
      );
    }
  };

  // Capture frame from live video stream (resized to max 1024px, JPEG quality 0.7)
  const captureLiveFrame = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;
      const maxDim = 1024;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setImagePreview(dataUrl);
      stopLiveStream();
    } catch (err) {
      setErrorMessage('Failed to capture frame from video.');
    }
  };

  // Send image to backend for AI analysis with live status, 15-second timeout & instant model fallback
  const handleAnalyzeWaste = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setElapsedSeconds(0);
    setScanStatusText('Waking server…');

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed < 2) {
        setScanStatusText('Waking server…');
      } else if (elapsed < 5) {
        setScanStatusText('Analyzing…');
      } else {
        setScanStatusText('Trying backup model…');
      }
    }, 250);

    try {
      const response = await apiService.analyzeWasteWithAI({
        imageBase64: imagePreview,
        declaredCategory: initialCategory
      });

      if (!response || !response.success || !response.analysis) {
        setAnalysisResult(null);
        setErrorMessage(
          response?.error || 'AI unavailable. Please choose the category manually and let the agent verify.'
        );
        return;
      }

      const analysis = response.analysis;
      const rawGuesses = analysis.topGuesses || [];
      const topGuesses: CategoryGuess[] = rawGuesses.length > 0
        ? rawGuesses.map((g: any) => ({
            category: g.category as WasteCategory,
            confidence: Math.round(Number(g.confidence) <= 1 ? Number(g.confidence) * 100 : Number(g.confidence))
          }))
        : [
            {
              category: (analysis.category || 'not_waste_or_unclear') as WasteCategory,
              confidence: Math.round(Number(analysis.confidence || 0) <= 1 ? Number(analysis.confidence || 0) * 100 : Number(analysis.confidence || 0))
            }
          ];

      const topConfidence = topGuesses[0]?.confidence ?? Math.round(Number(analysis.confidence || 0) * 100);
      const secondConfidence = topGuesses[1]?.confidence ?? 0;
      const diffConfidence = Math.abs(topConfidence - secondConfidence);

      const isBelow70 = topConfidence < 70;
      const isWithin15 = topGuesses.length >= 2 && diffConfidence <= 15;
      const needsConfirmation = (isBelow70 || isWithin15) && analysis.category !== 'not_waste_or_unclear';

      setAnalysisResult({
        mainObjectDescription: analysis.mainObjectDescription,
        materialDescription: analysis.materialDescription,
        detectedItem: analysis.detectedItem || 'Identified Material',
        category: analysis.category || 'not_waste_or_unclear',
        condition: analysis.condition || 'Inspected',
        confidence: topConfidence,
        rawConfidence: Number(analysis.confidence || 0),
        topGuesses,
        estimatedWeightKg: Number(analysis.estimatedWeightKg || 0),
        isRecyclable: Boolean(analysis.isRecyclable),
        recyclabilityGrade: analysis.recyclabilityGrade || 'N/A',
        disposalGuideline: analysis.disposalGuideline || 'Please choose the category manually and let the agent verify.',
        declaredMatch: Boolean(analysis.declaredMatch),
        source: response.source || 'Gemini',
        isRealAi: Boolean(response.isRealAi)
      });

      setConfirmedCategory(analysis.category || 'not_waste_or_unclear');
      setIsUserConfirmed(!needsConfirmation);
      setShowCorrectionPicker(false);
      setUserCorrection(null);
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setAnalysisResult(null);
      setErrorMessage('AI unavailable. Please choose the category manually and let the agent verify.');
    } finally {
      clearInterval(intervalId);
      setIsAnalyzing(false);
    }
  };

  // Retake or choose another photo
  const handleRetake = () => {
    setImagePreview(null);
    setAnalysisResult(null);
    setErrorMessage(null);
    setConfirmedCategory(null);
    setIsUserConfirmed(false);
    setShowCorrectionPicker(false);
    setUserCorrection(null);
    setScanStatusText('Waking server…');
    setElapsedSeconds(0);
    // trigger camera directly
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleChooseAnother = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  // User confirms category choice
  const handleConfirmCategoryChoice = (chosen: WasteCategory) => {
    setConfirmedCategory(chosen);
    setIsUserConfirmed(true);
    if (analysisResult && chosen !== analysisResult.category) {
      setUserCorrection({
        originalCategory: analysisResult.category,
        correctedCategory: chosen,
        timestamp: new Date().toISOString()
      });
    }
  };

  // User selects manual correction from category list
  const handleSelectCorrection = (selected: WasteCategory) => {
    if (!analysisResult) return;
    setConfirmedCategory(selected);
    setIsUserConfirmed(true);
    setUserCorrection({
      originalCategory: analysisResult.category,
      correctedCategory: selected,
      timestamp: new Date().toISOString()
    });
    setShowCorrectionPicker(false);
  };

  // Apply to booking (strictly guarded against not_waste_or_unclear and requires confirmation if low confidence or close guesses)
  const handleApplyResult = () => {
    if (!analysisResult) return;
    const finalCategory = confirmedCategory || analysisResult.category;
    if (finalCategory === 'not_waste_or_unclear') {
      return;
    }

    const topConfidence = analysisResult.topGuesses[0]?.confidence ?? analysisResult.confidence;
    const secondConfidence = analysisResult.topGuesses[1]?.confidence ?? 0;
    const diffConfidence = Math.abs(topConfidence - secondConfidence);
    const isBelow70 = topConfidence < 70;
    const isWithin15 = analysisResult.topGuesses.length >= 2 && diffConfidence <= 15;
    const requiresConfirmation = (isBelow70 || isWithin15) && analysisResult.category !== 'not_waste_or_unclear';

    if (requiresConfirmation && !isUserConfirmed) {
      return;
    }

    onApplyCategory(finalCategory, {
      detectedItem: analysisResult.detectedItem,
      estimatedWeightKg: analysisResult.estimatedWeightKg,
      photoUrl: imagePreview || undefined,
      condition: analysisResult.condition,
      confidence: finalCategory === analysisResult.category ? analysisResult.confidence : 100,
      topGuesses: analysisResult.topGuesses,
      userCorrection: userCorrection || undefined
    });
    onClose();
  };

  const categoryMeta = analysisResult 
    ? WASTE_CATEGORIES_REGISTRY.find(c => c.id === analysisResult.category) || WASTE_CATEGORIES_REGISTRY[1]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="waste-scanner-modal-title"
      >
        {/* Hidden mobile camera & file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id="native-camera-input"
          aria-label="Capture photo with camera"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="native-gallery-input"
          aria-label="Upload photo from gallery"
        />

        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 id="waste-scanner-modal-title" className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>{t('scanner.modalTitle', 'AI Waste Camera Scanner')}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Multimodal
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {t('scanner.modalSubtitle', 'Capture or upload waste for automated category detection & recycling value')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-left flex-1">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>AI Waste Scanner</span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-bold border border-slate-300">
                  Source: Unavailable
                </span>
              </div>
              <p className="text-amber-900 text-xs font-semibold leading-relaxed">
                {errorMessage}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  Choose Category Manually
                </button>
                <button
                  onClick={handleAnalyzeWaste}
                  className="px-3 py-2 rounded-xl border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 cursor-pointer transition-colors"
                >
                  Retry Analysis
                </button>
                <button
                  onClick={handleRetake}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
                >
                  Retake Photo
                </button>
              </div>
            </div>
          )}

          {/* Stream Permission Error */}
          {streamError && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">{streamError}</p>
            </div>
          )}

          {/* STATE 1: No image captured yet (Prompt to take photo / upload) */}
          {!imagePreview && !isLiveStreamActive && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 sm:p-10 text-center bg-slate-50/70 hover:bg-slate-50 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {t('scanner.capturePromptTitle', 'Point Camera at Your Waste Item')}
                </h3>
                {/* Camera Screen Hint */}
                <div className="mt-2.5 mb-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Place one item in the frame, close up, in good light.</span>
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                  {t('scanner.capturePromptDesc', 'Ensure the item is well-lit and clearly visible. EcoCollect AI will detect the material category, recyclability grade, and buyback value.')}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                  {/* Primary: Rear Camera Photo Capture */}
                  <button
                    id="scanner-camera-capture-btn"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t('scanner.takePhotoBtn', 'Take Photo (Camera)')}</span>
                  </button>

                  {/* Secondary: Choose from Gallery */}
                  <button
                    id="scanner-gallery-upload-btn"
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>{t('scanner.uploadGalleryBtn', 'Choose from Gallery')}</span>
                  </button>
                </div>

                {/* Optional Live Viewfinder Link */}
                <div className="mt-4 pt-4 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={startLiveStream}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer transition-colors"
                  >
                    <Video className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('scanner.openLiveViewfinder', 'Or open live camera viewfinder in browser')}</span>
                  </button>
                </div>
              </div>

              {/* Tips */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-800 block">💡 Good Lighting</span>
                  <span className="text-[10px] text-slate-500">Avoid harsh shadows</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-800 block">🔍 Single Item</span>
                  <span className="text-[10px] text-slate-500">Frame item in center</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-800 block">⚡ Instant Pricing</span>
                  <span className="text-[10px] text-slate-500">Auto-routes to recycler</span>
                </div>
              </div>
            </div>
          )}

          {/* STATE 1B: Live Video Viewfinder Stream */}
          {isLiveStreamActive && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Viewfinder reticle overlay */}
                <div className="absolute inset-8 border-2 border-emerald-400/70 border-dashed rounded-2xl pointer-events-none flex flex-col items-center justify-between p-3">
                  <span className="bg-black/75 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-xs border border-emerald-500/40 text-center">
                    Place one item in the frame, close up, in good light.
                  </span>
                  <span className="bg-black/60 text-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Align waste inside box
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={stopLiveStream}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  {t('scanner.cancelLive', 'Cancel')}
                </button>

                <button
                  type="button"
                  onClick={captureLiveFrame}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t('scanner.snapPhoto', 'Snap Photo')}</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 2: Image Preview captured, ready for analysis or displaying results */}
          {imagePreview && (
            <div className="space-y-4">
              
              {/* Image Preview Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner group">
                <img
                  src={imagePreview}
                  alt="Waste capture preview"
                  className="w-full max-h-72 object-contain mx-auto bg-slate-950"
                />

                {/* Scanning Beam Overlay during analysis */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg animate-bounce">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                    <div className="text-center px-4">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/85 border border-emerald-400/40 text-emerald-300 font-mono text-xs font-bold shadow-lg">
                        <span className="animate-pulse">{scanStatusText}</span>
                        <span className="text-emerald-400 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {elapsedSeconds}s
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-300 mt-2 block font-medium">
                        {t('scanner.analyzingSubtitle', 'Inspecting texture, recyclability grade & composition')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Overlay Badge when analyzed */}
                {analysisResult && !isAnalyzing && (
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{analysisResult.detectedItem}</span>
                  </div>
                )}
              </div>

              {/* Live Status indicator during analysis */}
              {isAnalyzing && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{scanStatusText}</span>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          {elapsedSeconds}s
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {elapsedSeconds < 2 ? 'Waking server and preparing vision request...' : elapsedSeconds < 5 ? 'Analyzing image material & composition...' : 'Switching to backup vision model...'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-700 font-bold px-2.5 py-1 bg-emerald-100/70 rounded-lg border border-emerald-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live Scan</span>
                  </div>
                </div>
              )}

              {/* Action Buttons for Preview (Before Analysis) */}
              {!analysisResult && !isAnalyzing && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <button
                      id="scanner-analyze-btn"
                      onClick={handleAnalyzeWaste}
                      className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{t('scanner.analyzeWasteBtn', 'Analyze Waste')}</span>
                    </button>

                    <button
                      id="scanner-retake-btn"
                      onClick={handleRetake}
                      className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('scanner.retakePhotoBtn', 'Retake Photo')}</span>
                    </button>

                    <button
                      id="scanner-choose-another-btn"
                      onClick={handleChooseAnother}
                      className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{t('scanner.chooseAnotherBtn', 'Choose Another Image')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 3: Identification Results Display */}
              {analysisResult && !isAnalyzing && (
                <div className="space-y-4">
                  {(() => {
                    const activeCat = confirmedCategory || analysisResult.category;
                    const activeCategoryMeta = WASTE_CATEGORIES_REGISTRY.find(c => c.id === activeCat) || WASTE_CATEGORIES_REGISTRY[1];
                    const isNotWaste = activeCat === 'not_waste_or_unclear';

                    const topConfidence = analysisResult.topGuesses[0]?.confidence ?? analysisResult.confidence;
                    const secondConfidence = analysisResult.topGuesses[1]?.confidence ?? 0;
                    const diffConfidence = Math.abs(topConfidence - secondConfidence);

                    const isLowConfidence = topConfidence < 70;
                    const isWithin15 = analysisResult.topGuesses.length >= 2 && diffConfidence <= 15;
                    const requiresConfirmation = (isLowConfidence || isWithin15) && activeCat !== 'not_waste_or_unclear';

                    const canApplyBooking = !isNotWaste && (!requiresConfirmation || isUserConfirmed);

                    return (
                      <>
                        {/* Results Card */}
                        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 shadow-md">
                          
                          {/* Header with Source & Correction Transparency */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                {t('scanner.identificationResults', 'Visual Identification Results')}
                              </span>
                              <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
                                {analysisResult.detectedItem}
                              </h4>
                            </div>

                            {/* Real Source Badge (Gemini / Unavailable) */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>Source: {analysisResult.source}</span>
                              </span>
                            </div>
                          </div>

                          {/* Object & Material Visual Description */}
                          {(analysisResult.mainObjectDescription || analysisResult.materialDescription) && (
                            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
                              <span className="text-[10px] font-black uppercase text-emerald-400 block tracking-wider">
                                Visual Observation & Material Composition
                              </span>
                              <p className="text-slate-200 mt-1 leading-relaxed text-[11px]">
                                {analysisResult.mainObjectDescription && (
                                  <span><strong className="text-white">Object:</strong> {analysisResult.mainObjectDescription} </span>
                                )}
                                {analysisResult.materialDescription && (
                                  <span>• <strong className="text-white">Material:</strong> {analysisResult.materialDescription}</span>
                                )}
                              </p>
                            </div>
                          )}

                          {/* Warning Banner for Not Waste / Unclear */}
                          {isNotWaste && (
                            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-extrabold text-rose-300 block text-xs">
                                  Not Waste or Unclear Photo
                                </span>
                                <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
                                  Visual inspector detected: <strong className="text-white">{analysisResult.detectedItem}</strong>. This item is not accepted as discarded scrap/waste, or the photo is too dark or blurry to identify.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Low Confidence Warning (< 70%) */}
                          {!isNotWaste && isLowConfidence && (
                            <div className="p-3.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-extrabold text-amber-300 block text-xs">
                                  Low confidence: agent must verify
                                </span>
                                <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                                  Visual confidence is {topConfidence}% (below 70%). Please confirm your category below; your collection agent will physically verify the waste on arrival.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* TOP 2 CATEGORY GUESSES DISPLAY */}
                          <div className="space-y-2.5 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>Top 2 Category Predictions</span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {isWithin15 ? 'Predictions close (within 15%)' : 'Ranked by visual match'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {analysisResult.topGuesses.slice(0, 2).map((guess, idx) => {
                                const guessMeta = WASTE_CATEGORIES_REGISTRY.find(c => c.id === guess.category);
                                const isTop = idx === 0;
                                const isSelected = activeCat === guess.category;

                                return (
                                  <div
                                    key={guess.category + idx}
                                    className={`p-3.5 rounded-xl border transition-all ${
                                      isSelected
                                        ? 'bg-emerald-950/40 border-emerald-500/70 shadow-sm'
                                        : 'bg-slate-800/80 border-slate-700/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                        isTop ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
                                      }`}>
                                        {isTop ? '#1 Primary Guess' : '#2 Alternative'}
                                      </span>
                                      <span className="text-xs font-mono font-black text-amber-300">
                                        {guess.confidence}%
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div className="font-black text-sm text-white capitalize">
                                        {guessMeta?.name || guess.category.replace('_', ' ')}
                                      </div>
                                      {isSelected && (
                                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                          Selected
                                        </span>
                                      )}
                                    </div>

                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {CATEGORY_EXAMPLE_ITEMS[guess.category] || 'Scrap material'}
                                    </p>

                                    <div className="mt-2 h-1.5 bg-slate-700/80 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${guess.confidence < 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                        style={{ width: `${Math.min(100, Math.max(5, guess.confidence))}%` }}
                                      />
                                    </div>

                                    {/* Confirmation button if user needs to confirm */}
                                    {requiresConfirmation && !isUserConfirmed && (
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmCategoryChoice(guess.category)}
                                        className="mt-2.5 w-full py-1.5 px-2.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Confirm as {guessMeta?.name || guess.category.replace('_', ' ')}</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* USER CONFIRMATION BANNER (If below 70% or within 15% and not confirmed) */}
                          {requiresConfirmation && !isUserConfirmed && (
                            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-100 text-xs space-y-2">
                              <div className="flex items-center gap-2 font-bold text-amber-300">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>Please confirm your category before applying to booking:</span>
                              </div>
                              <p className="text-[11px] text-amber-100/90 leading-relaxed">
                                {isLowConfidence 
                                  ? `Top confidence is ${topConfidence}% (below 70%).`
                                  : `Top two predictions are within 15% (${topConfidence}% vs ${secondConfidence}%).`}
                                {' '}Tap one of the predictions above to confirm, or click &quot;Wrong result? Correct it&quot; below.
                              </p>
                            </div>
                          )}

                          {/* Confirmed / User Correction Notice */}
                          {userCorrection && (
                            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
                              <span className="flex items-center gap-1.5 font-bold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>User Correction Saved: {userCorrection.originalCategory.replace('_', ' ')} → {userCorrection.correctedCategory.replace('_', ' ')}</span>
                              </span>
                              <span className="text-[10px] text-emerald-300/80 font-mono">
                                Will save with scan
                              </span>
                            </div>
                          )}

                          {/* WRONG RESULT? CORRECT IT BUTTON & CATEGORY PICKER */}
                          <div className="pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">
                                Not what you have?
                              </span>
                              <button
                                id="scanner-correct-result-btn"
                                type="button"
                                onClick={() => setShowCorrectionPicker(prev => !prev)}
                                className="px-3 py-1.5 rounded-xl border border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                                <span>Wrong result? Correct it</span>
                              </button>
                            </div>

                            {/* Expandable Manual Category Correction Panel */}
                            {showCorrectionPicker && (
                              <div className="mt-3 p-3.5 rounded-2xl bg-slate-800 border border-slate-700 space-y-2.5 animate-fadeIn">
                                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                                  <span className="text-xs font-black text-amber-300">
                                    Pick the correct category (saves with scan result):
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowCorrectionPicker(false)}
                                    className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                                  >
                                    Close
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {[
                                    'organic',
                                    'plastic',
                                    'paper_cardboard',
                                    'glass',
                                    'metal',
                                    'e_waste',
                                    'textile',
                                    'hazardous'
                                  ].map(catId => {
                                    const meta = WASTE_CATEGORIES_REGISTRY.find(c => c.id === catId);
                                    const isCurrent = activeCat === catId;
                                    return (
                                      <button
                                        key={catId}
                                        type="button"
                                        onClick={() => handleSelectCorrection(catId as WasteCategory)}
                                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                          isCurrent
                                            ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow-xs'
                                            : 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-slate-200'
                                        }`}
                                      >
                                        <div className="text-xs font-black truncate">{meta?.name || catId}</div>
                                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                          {CATEGORY_EXAMPLE_ITEMS[catId] || ''}
                                        </div>
                                        <div className="text-[10px] font-mono text-amber-300 font-bold mt-1">
                                          ₹{meta?.buybackRate.toFixed(2) || '0.00'}/kg
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Key Attributes Grid for Active / Confirmed Category */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            
                            {/* 1. Category */}
                            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {t('scanner.category', 'Selected Category')}
                              </span>
                              <span className={`text-xs font-black capitalize mt-0.5 block truncate ${
                                isNotWaste ? 'text-rose-400' : 'text-emerald-400'
                              }`}>
                                {isNotWaste ? 'Not Waste / Unclear' : (activeCategoryMeta?.name || activeCat.replace('_', ' '))}
                              </span>
                            </div>

                            {/* 2. Confidence */}
                            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {t('scanner.confidence', 'Confidence')}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-xs font-mono font-black ${
                                  isLowConfidence ? 'text-amber-400' : 'text-emerald-300'
                                }`}>
                                  {userCorrection ? '100% (User)' : `${topConfidence}%`}
                                </span>
                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      userCorrection ? 'bg-emerald-400' : isLowConfidence ? 'bg-amber-400' : 'bg-emerald-400'
                                    }`}
                                    style={{ width: userCorrection ? '100%' : `${Math.min(100, Math.max(5, topConfidence))}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 3. Recyclability */}
                            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {t('scanner.recyclability', 'Recyclability')}
                              </span>
                              <span className={`text-xs font-black mt-0.5 block truncate ${
                                isNotWaste 
                                  ? 'text-slate-400' 
                                  : analysisResult.isRecyclable ? 'text-emerald-300' : 'text-amber-400'
                              }`}>
                                {isNotWaste ? 'N/A' : (analysisResult.recyclabilityGrade || (analysisResult.isRecyclable ? 'Recyclable' : 'Non-Recyclable'))}
                              </span>
                            </div>

                            {/* 4. Est. Weight & Buyback */}
                            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {t('scanner.rateBuyback', 'Buyback Rate')}
                              </span>
                              <span className="text-xs font-mono font-black text-amber-300 mt-0.5 block truncate">
                                {isNotWaste ? '₹0.00' : `₹${activeCategoryMeta?.buybackRate.toFixed(2) || '0.00'}/kg`}
                              </span>
                            </div>
                          </div>

                          {/* Declared Match Check */}
                          <div className="flex items-center justify-between text-[11px] px-3.5 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                            <span className="text-slate-400 font-medium">Declared Category Match:</span>
                            {analysisResult.declaredMatch ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Matches declared category</span>
                              </span>
                            ) : (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <Info className="w-3.5 h-3.5 text-amber-400" />
                                <span>Visual evidence evaluated independently</span>
                              </span>
                            )}
                          </div>

                          {/* Disposal & Recycling Guidelines */}
                          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] uppercase tracking-wide">
                              <Recycle className="w-3.5 h-3.5" />
                              <span>{t('scanner.disposalGuidelines', 'Segregation & Handling Guidelines')}</span>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed">
                              {analysisResult.disposalGuideline}
                            </p>
                            {!isNotWaste && activeCategoryMeta?.recyclingFacility && (
                              <p className="text-[11px] text-slate-400 pt-1">
                                <span className="font-semibold text-slate-300">Authorized Facility:</span> {activeCategoryMeta.recyclingFacility}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Primary Action Buttons */}
                        <div className="space-y-2 pt-1">
                          {canApplyBooking ? (
                            <button
                              id="scanner-apply-booking-btn"
                              onClick={handleApplyResult}
                              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Apply {activeCategoryMeta?.name || activeCat} to Pickup Booking & Continue</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          ) : requiresConfirmation && !isUserConfirmed ? (
                            <div className="p-3 text-center bg-slate-100 rounded-2xl border border-slate-300 text-slate-700 text-xs font-bold">
                              <span>👆 Please confirm a category above to apply to booking</span>
                            </div>
                          ) : (
                            <button
                              id="scanner-manual-select-btn"
                              onClick={onClose}
                              className="w-full py-3.5 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                            >
                              <span>Choose Category Manually (Agent Will Verify)</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              onClick={handleRetake}
                              className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{t('scanner.scanAnother', 'Scan Another Item')}</span>
                            </button>

                            <button
                              onClick={onClose}
                              className="py-2.5 px-3 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
                            >
                              {t('scanner.manualCategory', 'Choose Category Manually')}
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>EcoCollect BBMP Verified Network</span>
          </div>
          <span>Client-side compressed JPEG</span>
        </div>
      </div>
    </div>
  );
};
