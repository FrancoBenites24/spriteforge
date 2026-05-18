import { useRef, useState } from 'react';
import { X, Save, CopyPlus, Crop, Check } from 'lucide-react';
import Cropper from 'react-cropper';
import type { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import type { Settings } from '../types';

interface CropEditorProps {
  imageUrl: string | null;
  editIndex: number | null;
  settings: Settings;
  onClose: () => void;
  onExtractAsNew: (croppedDataUrl: string) => void;
  onReplaceOriginal: (dataUrl: string, index: number) => void;
}

// Corner actions lock ratio, side actions allow free resize
const CORNER_ACTIONS = new Set(['ne', 'nw', 'se', 'sw']);

export default function CropEditor({
  imageUrl,
  editIndex,
  settings,
  onClose,
  onExtractAsNew,
  onReplaceOriginal,
}: CropEditorProps) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [extractCount, setExtractCount] = useState(0);

  if (!imageUrl) return null;

  const { frameWidth, frameHeight } = settings;
  const ratio = frameWidth / frameHeight;

  const handleCropperReady = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    // Start with locked aspect ratio
    cropper.setAspectRatio(ratio);

    // Set initial crop box to represent exact frame dimensions
    const canvasData = cropper.getCanvasData();
    const imageData = cropper.getImageData();
    const scaleX = canvasData.width / imageData.naturalWidth;
    const scaleY = canvasData.height / imageData.naturalHeight;

    const boxW = frameWidth * scaleX;
    const boxH = frameHeight * scaleY;

    cropper.setCropBoxData({
      left: canvasData.left + (canvasData.width - boxW) / 2,
      top: canvasData.top + (canvasData.height - boxH) / 2,
      width: boxW,
      height: boxH,
    });
  };

  // Dynamically toggle aspect ratio: corners = proportional, sides = free
  const handleCropStart = (e: any) => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const action = e.detail?.action;
    if (CORNER_ACTIONS.has(action)) {
      cropper.setAspectRatio(ratio);
    } else if (['n', 's', 'e', 'w'].includes(action)) {
      cropper.setAspectRatio(NaN);
    }
  };

  const handleCropEnd = () => {
    // After any resize, re-lock to proportional for next corner drag
    // (setAspectRatio will be overridden on next cropstart anyway)
  };

  const handleExtractAsNew = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    // Always output at exact frame dimensions with white fill
    const outCanvas = document.createElement('canvas');
    outCanvas.width = frameWidth;
    outCanvas.height = frameHeight;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, frameWidth, frameHeight);

    const croppedCanvas = cropper.getCroppedCanvas();
    if (!croppedCanvas) return;

    // Center the cropped content maintaining aspect ratio
    const srcW = croppedCanvas.width;
    const srcH = croppedCanvas.height;
    const scale = Math.min(frameWidth / srcW, frameHeight / srcH);
    const dstW = srcW * scale;
    const dstH = srcH * scale;
    const offsetX = (frameWidth - dstW) / 2;
    const offsetY = (frameHeight - dstH) / 2;

    outCtx.drawImage(croppedCanvas, offsetX, offsetY, dstW, dstH);

    onExtractAsNew(outCanvas.toDataURL('image/png'));
    setExtractCount(prev => prev + 1);
  };

  const handleReplaceOriginal = () => {
    if (editIndex === null) return;
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = frameWidth;
    outCanvas.height = frameHeight;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, frameWidth, frameHeight);

    const croppedCanvas = cropper.getCroppedCanvas();
    if (!croppedCanvas) return;

    const srcW = croppedCanvas.width;
    const srcH = croppedCanvas.height;
    const scale = Math.min(frameWidth / srcW, frameHeight / srcH);
    const dstW = srcW * scale;
    const dstH = srcH * scale;
    const offsetX = (frameWidth - dstW) / 2;
    const offsetY = (frameHeight - dstH) / 2;

    outCtx.drawImage(croppedCanvas, offsetX, offsetY, dstW, dstH);
    onReplaceOriginal(outCanvas.toDataURL('image/png'), editIndex);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-display text-white">Editor de Recorte</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-slate-500">
              Salida: <span className="text-indigo-400 font-bold">{frameWidth}×{frameHeight}px</span>
              <span className="text-slate-600 ml-2">· Esquinas = proporcional · Lados = libre</span>
            </p>
            {extractCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                <Check size={10} />
                {extractCount} extraído{extractCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-surface border border-border rounded-xl p-4 flex flex-col gap-4">
        <div className="flex-1 bg-background border border-border rounded-lg overflow-hidden relative">
          <Cropper
            src={imageUrl}
            style={{ height: '100%', width: '100%' }}
            aspectRatio={ratio}
            guides={true}
            viewMode={1}
            dragMode="move"
            ref={cropperRef}
            background={false}
            responsive={true}
            autoCropArea={0.5}
            zoomable={true}
            scalable={true}
            wheelZoomRatio={0.1}
            cropBoxResizable={true}
            ready={handleCropperReady}
            cropstart={handleCropStart}
            cropend={handleCropEnd}
          />
        </div>

        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Crop size={14} className="text-slate-500" />
            <span className="text-[10px] text-slate-500 font-medium">
              Mueve el cuadro, extrae, y repite para más recortes
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="glass-button-secondary">
              {extractCount > 0 ? 'Listo' : 'Cancelar'}
            </button>

            <button onClick={handleExtractAsNew} className="glass-button-primary">
              <CopyPlus size={18} />
              Extraer como Nuevo
            </button>

            {editIndex !== null && (
              <button onClick={handleReplaceOriginal} className="glass-button-accent">
                <Save size={18} />
                Reemplazar Original
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
