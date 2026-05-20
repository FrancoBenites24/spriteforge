import React, { useState, useEffect, useRef } from 'react';
import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';
import { Upload, X, Trash2, Download, Maximize2, Loader2, Shield, FolderClosed, Plus } from 'lucide-react';
import type { Subfolder } from '../types';

interface BackgroundRemovalPageProps {
  selectedSubfolderId: string | null;
  subfolders: Subfolder[];
  onUploadMultiple: (dataUrls: string[]) => Promise<void>;
}

interface QueueItem {
  id: string;
  file: File;
  name: string;
  status: 'waiting' | 'processing' | 'success' | 'error';
  progress: number;
  originalUrl: string;
  processedBlob: Blob | null; // Transparent output
  finalBlob: Blob | null;      // Custom background color output
  finalDataUrl: string | null; // Custom background data URL
  errorMsg?: string;
}

const sampleUrls = {
  shoe: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  plant: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80',
  coffee: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80'
};

const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const applyBgColor = (processedBlob: Blob, bgColor: string): Promise<{ blob: Blob; dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(processedBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo obtener el contexto 2D del Canvas'));
        return;
      }
      
      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/png');
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve({ blob, dataUrl });
        } else {
          reject(new Error('Error al generar el blob final'));
        }
      }, 'image/png');
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};

export default function BackgroundRemovalPage({ selectedSubfolderId, subfolders, onUploadMultiple }: BackgroundRemovalPageProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [isProcessingState, setIsProcessingState] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [customColor, setCustomColor] = useState('#6366f1');
  const [isDragging, setIsDragging] = useState(false);

  // Comparison Slider States
  const [comparisonItem, setComparisonItem] = useState<QueueItem | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const bgColorRef = useRef(bgColor);

  useEffect(() => {
    bgColorRef.current = bgColor;
  }, [bgColor]);

  // Handle global mouse up to stop slider dragging
  useEffect(() => {
    const handleMouseUp = () => setIsDraggingSlider(false);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  // Update background colors of all completed items when color changes
  const updateBackgroundColors = async (color: string) => {
    const updated = await Promise.all(
      queue.map(async (item) => {
        if (item.status === 'success' && item.processedBlob) {
          try {
            const { blob, dataUrl } = await applyBgColor(item.processedBlob, color);
            return { ...item, finalBlob: blob, finalDataUrl: dataUrl };
          } catch (e) {
            console.error('Error updating background color', e);
          }
        }
        return item;
      })
    );
    setQueue(updated);
  };

  // Start processing sequential queue
  const processNextInQueue = async (currentQueue: QueueItem[]) => {
    if (isProcessingRef.current) return;

    const nextItem = currentQueue.find(item => item.status === 'waiting');
    if (!nextItem) {
      isProcessingRef.current = false;
      setIsProcessingState(false);
      return;
    }

    isProcessingRef.current = true;
    setIsProcessingState(true);

    // Set item status to processing
    setQueue(prev => prev.map(it => it.id === nextItem.id ? { ...it, status: 'processing' as const } : it));

    try {
      const config = {
        model: 'medium',
        progress: (key: string, current: number, total: number) => {
          const percent = Math.round((current / total) * 100);
          let statusMsg = 'Procesando...';
          if (key === 'fetch') {
            statusMsg = 'Cargando IA...';
          } else if (key === 'compute') {
            statusMsg = 'Cortando silueta...';
          }

          setQueue(prev => prev.map(it => it.id === nextItem.id ? { ...it, progress: percent, errorMsg: statusMsg } : it));
        }
      };

      const processedBlob = await removeBackground(nextItem.file, config as any);
      const { blob: finalBlob, dataUrl: finalDataUrl } = await applyBgColor(processedBlob, bgColorRef.current);

      setQueue(prev => {
        const nextQueue = prev.map(it => it.id === nextItem.id ? {
          ...it,
          status: 'success' as const,
          progress: 100,
          processedBlob,
          finalBlob,
          finalDataUrl,
          errorMsg: undefined
        } : it);

        setTimeout(() => {
          isProcessingRef.current = false;
          processNextInQueue(nextQueue);
        }, 0);

        return nextQueue;
      });

    } catch (err) {
      console.error('Error removing background:', err);
      setQueue(prev => {
        const nextQueue = prev.map(it => it.id === nextItem.id ? {
          ...it,
          status: 'error' as const,
          errorMsg: 'Error de procesamiento'
        } : it);

        setTimeout(() => {
          isProcessingRef.current = false;
          processNextInQueue(nextQueue);
        }, 0);

        return nextQueue;
      });
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems = files.map(file => {
      const originalUrl = URL.createObjectURL(file);
      return {
        id: 'img-' + Math.random().toString(36).substring(2, 11),
        file,
        name: file.name,
        status: 'waiting' as const,
        progress: 0,
        originalUrl,
        processedBlob: null,
        finalBlob: null,
        finalDataUrl: null
      };
    });

    setQueue(prev => {
      const nextQueue = [...prev, ...newItems];
      // Trigger processing after updating state
      setTimeout(() => {
        processNextInQueue(nextQueue);
      }, 0);
      return nextQueue;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      addFilesToQueue(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      addFilesToQueue(files);
    }
  };

  const removeItem = (id: string) => {
    setQueue(prev => {
      const nextQueue = prev.filter(item => {
        if (item.id === id) {
          URL.revokeObjectURL(item.originalUrl);
          return false;
        }
        return true;
      });

      // If we deleted the actively processing item, reset flag
      const itemToDelete = prev.find(item => item.id === id);
      if (itemToDelete?.status === 'processing') {
        isProcessingRef.current = false;
        setTimeout(() => processNextInQueue(nextQueue), 0);
      }

      return nextQueue;
    });
  };

  const clearQueue = () => {
    queue.forEach(item => URL.revokeObjectURL(item.originalUrl));
    setQueue([]);
    isProcessingRef.current = false;
    setIsProcessingState(false);
  };

  const loadSampleImage = async (type: 'shoe' | 'plant' | 'coffee', label: string) => {
    try {
      const response = await fetch(sampleUrls[type]);
      const blob = await response.blob();
      const file = new File([blob], `ejemplo-${label}.jpg`, { type: 'image/jpeg' });
      addFilesToQueue([file]);
    } catch (err) {
      console.error('Error loading sample image', err);
      alert('No se pudo cargar la imagen de muestra. Verifica tu conexión.');
    }
  };

  const downloadSingleItem = (item: QueueItem) => {
    if (item.status !== 'success' || !item.finalBlob) return;
    const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    const bgSuffix = bgColor === 'transparent' ? 'transparente' : 'fondocolor';
    const fileName = `${baseName}_${bgSuffix}.png`;

    const url = URL.createObjectURL(item.finalBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadBatchAsZip = async () => {
    const completedItems = queue.filter(item => item.status === 'success');
    if (completedItems.length === 0) return;

    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      completedItems.forEach((item, index) => {
        if (!item.finalBlob) return;
        const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
        const bgSuffix = bgColor === 'transparent' ? 'transparente' : 'fondocolor';
        const fileName = `${baseName}_${bgSuffix}_${index + 1}.png`;
        zip.file(fileName, item.finalBlob);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FondoBlanco_AI_Lote.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating ZIP:', err);
      alert('Ocurrió un error al generar el archivo ZIP');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleSendToSubfolder = async () => {
    const completedItems = queue.filter(item => item.status === 'success' && item.finalBlob);
    if (completedItems.length === 0) return;
    if (!selectedSubfolderId) {
      alert('Selecciona una subcarpeta en la barra lateral primero.');
      return;
    }

    setIsUploading(true);
    try {
      const dataUrlPromises = completedItems.map(item => blobToDataURL(item.finalBlob!));
      const dataUrls = await Promise.all(dataUrlPromises);
      await onUploadMultiple(dataUrls);
      alert(`Se han enviado exitosamente ${completedItems.length} imágenes a la subcarpeta.`);
    } catch (err) {
      console.error('Error uploading batch to subfolder:', err);
      alert('Ocurrió un error al subir las imágenes a la subcarpeta.');
    } finally {
      setIsUploading(false);
    }
  };

  const selectedSubfolderName = subfolders.find(s => s.id === selectedSubfolderId)?.name;
  const completedCount = queue.filter(item => item.status === 'success').length;
  const waitingCount = queue.filter(item => item.status === 'waiting').length;
  const processingItem = queue.find(item => item.status === 'processing');

  // Slider Mouse Move Logic
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSlider) return;
    handleSliderMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSlider) return;
    handleSliderMove(e.clientX);
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto p-12 flex flex-col gap-8 relative scrollbar-thin scrollbar-thumb-white/10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-title font-bold text-white tracking-tight flex items-center gap-2">
            FondoBlanco <span className="bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider text-white">AI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Procesamiento de imágenes por lotes 100% local</p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-xs font-medium text-emerald-400">
          <Shield size={14} />
          <span>Seguridad Local: Tus fotos no se suben a ningún servidor externo</span>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className="glass-card p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-[#131b2e]/40 border border-white/5 rounded-2xl shadow-xl">
        
        {/* Colors Selection */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-200">1. Color de Fondo</h2>
            <p className="text-xs text-slate-500 mt-0.5">Selecciona el fondo para aplicar a todo el lote:</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Transparente */}
            <label className="flex flex-col items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                name="bg-color-radio"
                checked={bgColor === 'transparent'}
                onChange={() => { setBgColor('transparent'); updateBackgroundColors('transparent'); }}
                className="sr-only"
              />
              <span className={`w-11 h-11 rounded-full border-2 transition-all flex items-center justify-center bg-white checkerboard ${bgColor === 'transparent' ? 'border-indigo-500 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'border-white/20'}`} />
              <span className="text-[10px] text-slate-400 font-medium">Transparente</span>
            </label>

            {/* Blanco */}
            <label className="flex flex-col items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                name="bg-color-radio"
                checked={bgColor === '#ffffff'}
                onChange={() => { setBgColor('#ffffff'); updateBackgroundColors('#ffffff'); }}
                className="sr-only"
              />
              <span className={`w-11 h-11 rounded-full border-2 transition-all bg-white ${bgColor === '#ffffff' ? 'border-indigo-500 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'border-white/25'}`} />
              <span className="text-[10px] text-slate-400 font-medium">Blanco</span>
            </label>

            {/* Negro */}
            <label className="flex flex-col items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                name="bg-color-radio"
                checked={bgColor === '#000000'}
                onChange={() => { setBgColor('#000000'); updateBackgroundColors('#000000'); }}
                className="sr-only"
              />
              <span className={`w-11 h-11 rounded-full border-2 transition-all bg-black ${bgColor === '#000000' ? 'border-indigo-500 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'border-white/20'}`} />
              <span className="text-[10px] text-slate-400 font-medium">Negro</span>
            </label>

            {/* Gris */}
            <label className="flex flex-col items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                name="bg-color-radio"
                checked={bgColor === '#f1f5f9'}
                onChange={() => { setBgColor('#f1f5f9'); updateBackgroundColors('#f1f5f9'); }}
                className="sr-only"
              />
              <span className={`w-11 h-11 rounded-full border-2 transition-all bg-slate-100 ${bgColor === '#f1f5f9' ? 'border-indigo-500 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'border-white/20'}`} />
              <span className="text-[10px] text-slate-400 font-medium">Gris</span>
            </label>

            {/* Selector Personalizado */}
            <label className="flex flex-col items-center gap-1.5 cursor-pointer relative select-none">
              <input
                type="radio"
                name="bg-color-radio"
                checked={bgColor === customColor}
                onChange={() => { setBgColor(customColor); updateBackgroundColors(customColor); }}
                className="sr-only"
              />
              <span
                style={{ background: customColor }}
                className={`w-11 h-11 rounded-full border-2 transition-all flex items-center justify-center text-white ${bgColor === customColor ? 'border-indigo-500 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'border-white/20'}`}
              >
                <Plus size={14} className="opacity-70" />
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Elegir...</span>
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setBgColor(e.target.value);
                  updateBackgroundColors(e.target.value);
                }}
                className="absolute inset-0 w-full h-11 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Batch Actions */}
        <div className="flex flex-col md:flex-row lg:justify-end gap-6 items-start md:items-center">
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-200">2. Acciones del Lote</h2>
            <div className="flex gap-4 text-xs text-slate-400">
              <span>Total: <strong className="text-white">{queue.length}</strong></span>
              <span>Procesadas: <strong className="text-emerald-400">{completedCount}</strong></span>
              <span>En espera: <strong className="text-amber-400">{waitingCount}</strong></span>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={downloadBatchAsZip}
              disabled={completedCount === 0 || isDownloadingZip}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none shadow-lg shadow-indigo-500/20"
            >
              {isDownloadingZip ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              ZIP
            </button>

            <button
              onClick={clearQueue}
              disabled={queue.length === 0}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold text-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Trash2 size={16} />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Upload Zone / Drop Area */}
      <div className="w-full">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 backdrop-blur-xl ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_25px_rgba(99,102,241,0.25)]'
              : 'border-white/10 bg-white/[0.01] hover:border-indigo-500/40 hover:bg-white/[0.03]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Upload size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Sube tus imágenes en lote</h3>
              <p className="text-sm text-slate-400 mt-1">Arrastra y suelta tus archivos aquí, o <span className="text-indigo-400 font-semibold underline">selecciónalos desde tu explorador</span></p>
            </div>
            <span className="text-xs text-slate-600">Soporta PNG, JPG, JPEG, WEBP. Procesamiento local ilimitado.</span>
          </div>
        </div>
      </div>

      {/* Samples section */}
      {queue.length === 0 && (
        <div className="flex flex-col items-center gap-4 text-center mt-4">
          <p className="text-xs text-slate-400 font-medium">¿No tienes fotos a la mano? Prueba con estas de ejemplo:</p>
          <div className="flex gap-4">
            <button
              onClick={() => loadSampleImage('shoe', 'calzado')}
              className="flex items-center gap-2.5 bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 transition-all hover:scale-[1.03]"
            >
              <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&q=80" crossOrigin="anonymous" alt="Zapato" className="w-8 h-8 rounded-lg object-cover" />
              <span>Calzado</span>
            </button>

            <button
              onClick={() => loadSampleImage('plant', 'planta')}
              className="flex items-center gap-2.5 bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 transition-all hover:scale-[1.03]"
            >
              <img src="https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=80&q=80" crossOrigin="anonymous" alt="Planta" className="w-8 h-8 rounded-lg object-cover" />
              <span>Planta</span>
            </button>

            <button
              onClick={() => loadSampleImage('coffee', 'taza')}
              className="flex items-center gap-2.5 bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 transition-all hover:scale-[1.03]"
            >
              <img src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=80&q=80" crossOrigin="anonymous" alt="Café" className="w-8 h-8 rounded-lg object-cover" />
              <span>Taza</span>
            </button>
          </div>
        </div>
      )}

      {/* Results queue */}
      {queue.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h2 className="text-xl font-bold text-white">Fotos del Lote</h2>

            {/* Upload to Subfolder Action */}
            <button
              onClick={handleSendToSubfolder}
              disabled={completedCount === 0 || !selectedSubfolderId || isUploading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/10"
            >
              {isUploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FolderClosed size={14} />
              )}
              {selectedSubfolderName 
                ? `Mandar a subcarpeta "${selectedSubfolderName}"` 
                : 'Mandar a subcarpeta'}
            </button>
          </div>

          {/* Model downloading or process indicator */}
          {isProcessingState && (
            <div className="flex items-center gap-3 bg-indigo-500/5 border border-indigo-500/15 p-3 rounded-xl text-xs text-indigo-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>
                {processingItem
                  ? `${processingItem.errorMsg || 'Procesando...'} "${processingItem.name}" (${processingItem.progress}%)`
                  : 'Preparando motor de IA local...'}
              </span>
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {queue.map(item => (
              <div key={item.id} className="bg-[#121624]/60 border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden flex flex-col group transition-all relative">
                
                {/* Delete button top right */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 flex items-center justify-center transition-colors"
                  title="Quitar"
                >
                  <X size={14} />
                </button>

                {/* Preview Image Slot */}
                <div className="aspect-square bg-[#0a0d16] flex items-center justify-center overflow-hidden relative border-b border-white/5">
                  {item.status === 'success' && item.finalDataUrl ? (
                    <img
                      src={item.finalDataUrl}
                      alt={item.name}
                      className="w-full h-full object-contain z-10"
                    />
                  ) : (
                    <img
                      src={item.originalUrl}
                      alt={item.name}
                      className="w-full h-full object-contain opacity-40 blur-[1px]"
                    />
                  )}

                  {/* Overlays */}
                  {item.status === 'waiting' && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 gap-2 z-10">
                      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-indigo-500 animate-spin" />
                      <span className="text-[10px] text-slate-400">En espera...</span>
                    </div>
                  )}

                  {item.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 gap-2.5 z-10">
                      <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                      <span className="text-xs font-semibold text-white">{item.errorMsg || 'Procesando...'}</span>
                      <div className="w-2/3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-indigo-300 font-mono">{item.progress}%</span>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 gap-2 z-10 text-center">
                      <span className="text-xs font-bold text-red-400">Error al procesar</span>
                      <span className="text-[10px] text-slate-400">Prueba con otra imagen</span>
                    </div>
                  )}

                  {/* Hover Actions for completed items */}
                  {item.status === 'success' && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 z-15 transition-opacity duration-200">
                      <button
                        onClick={() => { setSliderPosition(50); setComparisonItem(item); }}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-indigo-600 text-white flex items-center justify-center border border-white/15 hover:border-indigo-500 transition-all hover:scale-105"
                        title="Comparar antes/después"
                      >
                        <Maximize2 size={16} />
                      </button>
                      <button
                        onClick={() => downloadSingleItem(item)}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-indigo-600 text-white flex items-center justify-center border border-white/15 hover:border-indigo-500 transition-all hover:scale-105"
                        title="Descargar"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info Panel */}
                <div className="p-4 flex flex-col gap-2.5 bg-[#0e121e]/50 flex-1 justify-between">
                  <span className="text-xs text-slate-300 truncate font-medium" title={item.name}>{item.name}</span>
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                      item.status === 'processing' ? 'bg-indigo-500/10 text-indigo-400 animate-pulse' :
                      item.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-slate-500/10 text-slate-400'
                    }`}>
                      {item.status === 'success' ? 'Completado' :
                       item.status === 'processing' ? 'Procesando' :
                       item.status === 'error' ? 'Error' : 'Espera'}
                    </span>

                    <button
                      onClick={() => downloadSingleItem(item)}
                      disabled={item.status !== 'success'}
                      className="px-2.5 py-1 rounded bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-[10px] text-slate-400 font-semibold transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Descargar
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Slider Modal */}
      {comparisonItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-[#111625] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <span className="text-sm font-semibold truncate max-w-xs text-slate-200">{comparisonItem.name}</span>
              <button
                onClick={() => setComparisonItem(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Comparison Container */}
            <div className="relative aspect-square flex items-center justify-center bg-[#07090f] p-6 select-none">
              <div
                ref={sliderContainerRef}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                onMouseDown={() => setIsDraggingSlider(true)}
                onTouchStart={() => setIsDraggingSlider(true)}
                className="relative w-full h-full max-w-[480px] max-h-[480px] aspect-square overflow-hidden rounded-xl border border-white/10 cursor-ew-resize"
              >
                {/* Original (Under) */}
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${comparisonItem.originalUrl})` }}
                />
                {/* Processed (Over) */}
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-[clip-path] duration-75"
                  style={{
                    backgroundImage: `url(${comparisonItem.finalDataUrl})`,
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                  }}
                />
                {/* Handle Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 cursor-ew-resize"
                  style={{ left: `${sliderPosition}%` }}
                >
                  {/* Handle Button */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-indigo-600 border border-white/20 shadow-lg flex items-center justify-center text-white text-xs select-none pointer-events-none">
                    ↔
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-white/5 bg-[#090d16]/80">
              <span className="text-xs text-slate-400">Desliza el control para comparar antes y después</span>
              <button
                onClick={() => downloadSingleItem(comparisonItem)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                <Download size={14} />
                Descargar esta foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Tailwind checkerboard helper class styling inline */}
      <style>{`
        .checkerboard {
          background-image:
            linear-gradient(45deg, #ccc 25%, transparent 25%),
            linear-gradient(-45deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%),
            linear-gradient(-45deg, transparent 75%, #ccc 75%);
          background-size: 10px 10px;
          background-position: 0 0, 0 5px, 5px -5px, -5px 0;
          background-color: #fff;
        }
      `}</style>
    </div>
  );
}
