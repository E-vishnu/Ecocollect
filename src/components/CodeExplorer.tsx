import React, { useState } from 'react';
import { 
  FolderCode, 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  Search, 
  Server, 
  Smartphone, 
  Cpu, 
  FileText, 
  Zap, 
  Layers, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import JSZip from 'jszip';
import { REPO_CODE_FILES, RepoCodeFile } from '../data/repoCodeFiles';
import { useLanguage } from '../i18n/LanguageContext';

export const CodeExplorer: React.FC = () => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<RepoCodeFile>(REPO_CODE_FILES[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const filteredFiles = REPO_CODE_FILES.filter(file => {
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    const matchesSearch = file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadSingleFile = () => {
    const blob = new Blob([selectedFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name.split(' ')[0];
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      REPO_CODE_FILES.forEach(file => {
        zip.file(file.path, file.code);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ecocollect-complete-prototype.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'backend': return Server;
      case 'resident': return Smartphone;
      case 'agent': return Smartphone;
      case 'classifier': return Cpu;
      case 'firmware': return Zap;
      default: return FileText;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <FolderCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                {t('nav.codeRepo', 'Code Repository')}
              </span>
              <span className="text-xs text-slate-400">5 Modular Subfolders • Runnable Code</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">{t('nav.codeRepo', 'Source Code Explorer & ZIP Export')}</h1>
          </div>
        </div>

        {/* Download Full Zip Button */}
        <button
          onClick={handleDownloadFullZip}
          disabled={isZipping}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{isZipping ? t('codeRepo.downloading', 'Creating ZIP Archive...') : t('codeRepo.downloadFullZip', 'Download Full Project (.ZIP)')}</span>
        </button>
      </div>

      {/* Main File Explorer Container */}
      <div className="grid md:grid-cols-12 gap-6 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 min-w-0">
        
        {/* Left 4 Cols: Directory & File List */}
        <div className="md:col-span-4 space-y-4 border-r border-slate-100 pr-0 md:pr-4 min-w-0">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={t('codeRepo.searchFiles', 'Search files, paths, or descriptions...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pb-2">
            {[
              { id: 'all', label: t('codeRepo.allCategories', 'All') },
              { id: 'backend', label: 'Backend' },
              { id: 'resident', label: t('admin.roleResident', 'Resident') },
              { id: 'agent', label: t('admin.roleAgent', 'Agent') },
              { id: 'classifier', label: 'Classifier' },
              { id: 'firmware', label: 'ESP32' },
              { id: 'docs', label: 'Docs' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* File Tree List */}
          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredFiles.map(file => {
              const Icon = getCategoryIcon(file.category);
              const isSelected = selectedFile.path === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-400 text-slate-900 shadow-xs'
                      : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="font-mono text-xs font-bold truncate flex-1">{file.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1 truncate pl-6">
                    {file.path}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right 8 Cols: Code Viewer & Actions */}
        <div className="md:col-span-8 space-y-4 min-w-0">
          
          {/* File Header Bar */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-emerald-400 break-all">{selectedFile.path}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                  {selectedFile.language}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{selectedFile.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? t('codeRepo.copied', 'Copied!') : t('codeRepo.copyCode', 'Copy Code')}</span>
              </button>

              <button
                onClick={handleDownloadSingleFile}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('codeRepo.saveFile', 'Save File')}</span>
              </button>
            </div>
          </div>

          {/* Syntax Highlighted Code Box */}
          <div className="bg-slate-950 rounded-2xl p-4 font-mono text-xs text-slate-200 border border-slate-800 max-h-[580px] overflow-y-auto overflow-x-auto leading-relaxed shadow-inner">
            <pre className="text-slate-300">
              <code>{selectedFile.code}</code>
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};
