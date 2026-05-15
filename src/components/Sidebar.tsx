import React from 'react';
import { Settings as SettingsIcon, Copy, Check, Folder as FolderIcon, ChevronDown, ChevronRight, Plus, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Settings, Folder, Subfolder } from '../types';

interface SidebarProps {
  projectId: string;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  folders: Folder[];
  subfolders: Subfolder[];
  selectedSubfolderId: string | null;
  onSelectSubfolder: (id: string) => void;
}

export default function Sidebar({
  projectId,
  settings,
  setSettings,
  folders,
  subfolders,
  selectedSubfolderId,
  onSelectSubfolder
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({});
  const [expandedSubfolders, setExpandedSubfolders] = React.useState<Record<string, boolean>>({});

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubfolder = (id: string) => {
    setExpandedSubfolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const createFolder = async () => {
    const name = prompt('Nombre de la carpeta:');
    if (!name) return;
    await supabase.from('folders').insert([{ project_id: projectId, name, position_index: folders.length }]);
  };

  const createSubfolder = async (folderId: string) => {
    const name = prompt('Nombre de la subcarpeta:');
    if (!name) return;
    const count = subfolders.filter(s => s.folder_id === folderId).length;
    await supabase.from('subfolders').insert([{ folder_id: folderId, name, position_index: count }]);
  };

  const copyId = () => {
    navigator.clipboard.writeText(projectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-80'} h-screen flex flex-col border-r border-white/5 bg-[#161826]/80 backdrop-blur-xl shrink-0 transition-all duration-300 relative`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-6 -right-3 z-50 p-1 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white shadow-lg border border-white/10"
      >
        {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <div className={`p-6 border-b border-white/5 ${isCollapsed ? 'items-center flex flex-col space-y-4' : 'space-y-4'}`}>
        {!isCollapsed ? (
          <div>
            <h1 className="text-2xl font-title font-bold text-white tracking-tight">SpriteForge</h1>
            <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Studio Colaborativo</p>
          </div>
        ) : (
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center font-title font-bold text-white">
            SF
          </div>
        )}

        {!isCollapsed && (
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
        )}
      </div>

      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-2 space-y-6' : 'p-6 space-y-8'} scrollbar-thin scrollbar-thumb-white/10`}>
        {/* Settings Section */}
        {!isCollapsed ? (
          <>
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
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-indigo-400" title="Configuración">
              <SettingsIcon size={20} />
            </button>
          </div>
        )}

        {/* Folders & Frames List */}
        <div className="space-y-4">
          {!isCollapsed && (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Jerarquía</h2>
              <button onClick={createFolder} className="p-1 text-slate-400 hover:text-white transition-colors" title="Nueva Carpeta">
                <Plus size={16} />
              </button>
            </div>
          )}
          
          <div className={`${isCollapsed ? 'space-y-4 flex flex-col items-center' : 'space-y-2'}`}>
            {folders.map((folder) => {
              const folderSubfolders = subfolders.filter(s => s.folder_id === folder.id);
              const isExpanded = expandedFolders[folder.id];

              if (isCollapsed) {
                return (
                  <div key={folder.id} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center relative group cursor-pointer" title={folder.name}>
                    <FolderIcon size={18} className="text-indigo-400" />
                  </div>
                );
              }

              return (
                <div key={folder.id} className="space-y-1">
                  <div 
                    className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg cursor-pointer group"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      <FolderIcon size={14} className="text-indigo-400" />
                      <span className="text-xs font-bold text-slate-200">{folder.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); createSubfolder(folder.id); }}
                      className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-all"
                      title="Nueva Subcarpeta"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="pl-4 space-y-1">
                      {folderSubfolders.map(sub => {
                        const isSubExpanded = expandedSubfolders[sub.id];
                        const isSelected = selectedSubfolderId === sub.id;

                        return (
                          <div key={sub.id} className="space-y-1">
                            <div 
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${isSelected ? 'bg-indigo-500/20 border border-indigo-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                              onClick={() => {
                                onSelectSubfolder(sub.id);
                                toggleSubfolder(sub.id);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {isSubExpanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
                                <FolderIcon size={12} className={isSelected ? "text-indigo-300" : "text-slate-400"} />
                                <span className={`text-xs ${isSelected ? 'font-bold text-white' : 'text-slate-300'}`}>{sub.name}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {folderSubfolders.length === 0 && (
                        <p className="text-[10px] text-slate-500 italic pl-6 py-1">Sin subcarpetas</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {folders.length === 0 && !isCollapsed && (
              <div className="text-center py-6 rounded-xl bg-white/[0.02] border border-dashed border-white/5">
                <p className="text-xs text-slate-500 font-medium">Ninguna carpeta.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
