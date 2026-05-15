import { useRef } from 'react';
import { X, Save, CopyPlus } from 'lucide-react';
import Cropper from 'react-cropper';
import type { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

interface CropEditorProps {
  imageUrl: string | null;
  editIndex: number | null;
  onClose: () => void;
  onExtractAsNew: (dataUrl: string) => void;
  onReplaceOriginal: (dataUrl: string, index: number) => void;
}

export default function CropEditor({
  imageUrl,
  editIndex,
  onClose,
  onExtractAsNew,
  onReplaceOriginal,
}: CropEditorProps) {
  const cropperRef = useRef<ReactCropperElement>(null);

  if (!imageUrl) return null;

  const handleExtractAsNew = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const canvas = cropper.getCroppedCanvas();
      if (canvas) {
        onExtractAsNew(canvas.toDataURL('image/png'));
      }
    }
  };

  const handleReplaceOriginal = () => {
    if (editIndex === null) return;
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const canvas = cropper.getCroppedCanvas();
      if (canvas) {
        onReplaceOriginal(canvas.toDataURL('image/png'), editIndex);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-display text-white">Editor de Recorte</h2>
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
            aspectRatio={1}
            guides={true}
            viewMode={1}
            dragMode="move"
            ref={cropperRef}
            background={false}
            responsive={true}
            autoCropArea={0.8}
            zoomable={true}
            scalable={true}
            wheelZoomRatio={0.1}
          />
        </div>

        <div className="flex items-center justify-end gap-3 shrink-0">
          <button onClick={onClose} className="glass-button-secondary">
            Cancelar
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
  );
}
