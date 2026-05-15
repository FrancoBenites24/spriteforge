import { useEffect, useRef, useState } from 'react';
import { Download, Play, Pause, ImageIcon, Upload, X, Pencil } from 'lucide-react';
import type { Frame, Settings } from '../types';

interface PreviewPanelProps {
  frames: Frame[];
  settings: Settings;
  onUpload: (dataUrl: string) => void;
  onEditFrame: (index: number) => void;
  onDeleteFrame: (id: string) => void;
}

export default function PreviewPanel({ frames, settings, onUpload, onEditFrame, onDeleteFrame }: PreviewPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spriteCanvasRef = useRef<HTMLCanvasElement>(null);
  const animCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const currentFrameIndex = useRef(0);
  const animationRef = useRef<number>(0);
  const lastDrawTime = useRef<number>(0);
  const [spriteDataUrl, setSpriteDataUrl] = useState<string>('');

  // Draw Sprite Sheet
  useEffect(() => {
    if (frames.length === 0 || !spriteCanvasRef.current) {
      setSpriteDataUrl('');
      return;
    }

    const canvas = spriteCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { frameWidth, frameHeight } = settings;
    canvas.width = frameWidth * frames.length;
    canvas.height = frameHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let loadedCount = 0;

    frames.forEach((frame, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, i * frameWidth, 0, frameWidth, frameHeight);
        loadedCount++;
        if (loadedCount === frames.length) {
          try {
            setSpriteDataUrl(canvas.toDataURL('image/png'));
          } catch (e) {
            console.error("CORS Error: Asegúrate de configurar CORS en el bucket de Supabase", e);
          }
        }
      };
      img.src = frame.image_url;
    });
  }, [frames, settings]);

  // Animation Loop
  useEffect(() => {
    if (frames.length === 0 || !animCanvasRef.current || !isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = animCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { frameWidth, frameHeight, speed } = settings;
    canvas.width = frameWidth;
    canvas.height = frameHeight;

    const images = frames.map((frame) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = frame.image_url;
      return img;
    });

    const drawFrame = (timestamp: number) => {
      if (!lastDrawTime.current) lastDrawTime.current = timestamp;
      const elapsed = timestamp - lastDrawTime.current;
      const frameDuration = speed || 100;

      if (elapsed >= frameDuration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = images[currentFrameIndex.current];
        if (img && img.complete) {
          ctx.drawImage(img, 0, 0, frameWidth, frameHeight);
        }
        
        currentFrameIndex.current = (currentFrameIndex.current + 1) % frames.length;
        lastDrawTime.current = timestamp;
      }
      
      animationRef.current = requestAnimationFrame(drawFrame);
    };

    animationRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [frames, settings, isPlaying]);

  const handleDownload = () => {
    if (!spriteDataUrl) return;
    const a = document.createElement('a');
    a.href = spriteDataUrl;
    a.download = 'spritesheet.png';
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onUpload(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto p-12 flex flex-col gap-12 relative scrollbar-thin scrollbar-thumb-white/10">
      
      {frames.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 animate-in fade-in duration-700">
          <div className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-white/5 mb-6 flex items-center justify-center bg-white/[0.01]">
            <ImageIcon className="w-10 h-10 text-slate-700" />
          </div>
          <p className="text-xl font-medium tracking-tight">Esta subcarpeta está vacía</p>
          <p className="text-sm text-slate-600 mt-2 mb-6">Sube imágenes para comenzar la magia</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            <Upload size={18} />
            Subir Imágenes
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Fuentes de Imagen */}
          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-title font-bold text-white tracking-tight">Fuentes de Imagen</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Frames para esta subcarpeta
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 font-medium transition-all"
              >
                <Upload size={16} />
                Subir Frame
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {frames.map((frame, i) => (
                <div key={frame.id} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                  <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgvwMDA/o8Bg0g4kPz4HwwDGBgYkE0FcwHTn0EXoInh1wBq+oBfHwBMp1kX2QhW+gAAAABJRU5ErkJggg==')] opacity-50" />
                  <img src={frame.image_url} alt={`Frame ${i}`} className="w-full h-full object-contain relative z-10" />
                  
                  {/* Overlay for actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                    <button
                      onClick={() => onEditFrame(i)}
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteFrame(frame.id)}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-[10px] font-bold text-white/80 z-20">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sprite Sheet Preview */}
          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-title font-bold text-white tracking-tight">Sprite Sheet Final</h2>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">
                  {frames.length} frames • {settings.frameWidth * frames.length}x{settings.frameHeight}px
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20"
              >
                <Download size={18} />
                Exportar PNG
              </button>
            </div>
            
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
              <div className="p-8 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgvwMDA/o8Bg0g4kPz4HwwDGBgYkE0FcwHTn0EXoInh1wBq+oBfHwBMp1kX2QhW+gAAAABJRU5ErkJggg==')] rounded-2xl border border-white/5 inline-block min-w-full shadow-inner">
                <canvas ref={spriteCanvasRef} className="block mx-auto" />
              </div>
            </div>
          </div>

          {/* Animation Preview */}
          <div className="glass-card p-8 space-y-6 max-w-md mx-auto w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-title font-bold text-white tracking-tight">Previsualización</h2>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all border border-white/10"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
            
            <div className="flex justify-center p-12 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgvwMDA/o8Bg0g4kPz4HwwDGBgYkE0FcwHTn0EXoInh1wBq+oBfHwBMp1kX2QhW+gAAAABJRU5ErkJggg==')] rounded-2xl border border-white/5 shadow-2xl">
              <canvas
                ref={animCanvasRef}
                style={{
                  width: `${settings.frameWidth * 2}px`,
                  height: `${settings.frameHeight * 2}px`,
                  imageRendering: 'pixelated'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
