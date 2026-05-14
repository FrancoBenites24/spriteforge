import { useRef } from 'react';
import { X, Save, CopyPlus } from 'lucide-react';
import Cropper from 'react-cropper';
import type { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

interface CropModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  editIndex: number | null;
  onClose: () => void;
  onExtractAsNew: (dataUrl: string) => void;
  onReplaceOriginal: (dataUrl: string, index: number) => void;
}

export default function CropModal({
  isOpen,
  imageUrl,
  editIndex,
  onClose,
  onExtractAsNew,
  onReplaceOriginal,
}: CropModalProps) {
  const cropperRef = useRef<ReactCropperElement>(null);

  if (!isOpen || !imageUrl) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-4xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-display text-white">Editor de Recorte (1:1)</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 bg-surface">
          <div className="w-full h-[50vh] bg-background border border-border rounded-xl overflow-hidden">
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
            />
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-surface/50">
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
