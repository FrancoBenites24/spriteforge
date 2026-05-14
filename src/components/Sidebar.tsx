import React, { useRef } from 'react';
import { Upload, X, Crop, MoveUp, MoveDown, Settings as SettingsIcon, Share2, Copy, Check } from 'lucide-react';
import type { Frame, Settings } from '../types';

interface SidebarProps {
  projectId: string;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  frames: Frame[];
  setFrames: React.Dispatch<React.SetStateAction<Frame[]>>;
  onUpload: (dataUrl: string) => void;
  onEditFrame: (index: number) => void;
  onDeleteFrame: (id: string) => void;
}

export default function Sidebar({
  projectId,
  settings,
  setSettings,
  frames,
  setFrames,
  onUpload,
  onEditFrame,
  onDeleteFrame
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onUpload(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(projectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 h-screen flex flex-col border-r border-white/5 bg-[#161826]/80 backdrop-blur-xl overflow-hidden shrink-0">
      <div className="p-6 border-b border-white/5 space-y-4">
        <div>
          <h1 className="text-2xl font-title font-bold text-white tracking-tight">SpriteForge</h1>
          <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Studio Colaborativo</p>
        </div>

        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <span>ID del Proyecto</span>
            <button onClick={copyId} className="hover:text-indigo-400 transition-colors">
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="text-xs font-mono text-slate-300 truncate">
            {projectId}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
        {/* Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <SettingsIcon size={18} className="text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Configuración</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ancho (px)</label>
              <input
                type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                value={settings.frameWidth}
                onChange={(e) =>
                  setSettings({ ...settings, frameWidth: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Alto (px)</label>
              <input
                type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                value={settings.frameHeight}
                onChange={(e) =>
                  setSettings({ ...settings, frameHeight: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pasos (Steps)</label>
              <input
                type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                value={settings.steps}
                onChange={(e) =>
                  setSettings({ ...settings, steps: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Velocidad (ms)</label>
              <input
                type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                value={settings.speed}
                onChange={(e) =>
                  setSettings({ ...settings, speed: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Fuentes de Imagen</h2>
          <div
            className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/50 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-xl shadow-indigo-500/10">
              <Upload size={24} />
            </div>
            <p className="text-[11px] text-slate-400 text-center font-medium leading-relaxed">
              Haz clic para subir un <br/> <span className="text-slate-200">Frame o Sprite Sheet</span>
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Frames List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Frames ({frames.length})</h2>
          </div>
          
          <div className="space-y-3">
            {frames.map((frame, index) => (
              <div
                key={frame.id}
                className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl group hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/20 flex-shrink-0 flex items-center justify-center border border-white/5">
                  <img src={frame.image_url} alt={`Frame ${index + 1}`} className="max-w-full max-h-full object-contain pixelated" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-300">
                    FRAME {index + 1}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    ID: {frame.id.split('-')[0]}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <button
                    onClick={() => onEditFrame(index)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Crop size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteFrame(frame.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
            
            {frames.length === 0 && (
              <div className="text-center py-10 rounded-2xl bg-white/[0.02] border border-dashed border-white/5">
                <p className="text-xs text-slate-500 font-medium">Lista de frames vacía</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
