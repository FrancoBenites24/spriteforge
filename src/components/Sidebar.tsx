import React from 'react';
import { Settings as SettingsIcon, Copy, Check, Folder as FolderIcon, ChevronDown, ChevronRight, Plus, PanelLeftClose, PanelLeftOpen, Pencil, Trash2, X as XIcon, Check as CheckIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Settings, Folder, Subfolder, ConnectedUser } from '../types';

interface SidebarProps {
  projectId: string;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  folders: Folder[];
  subfolders: Subfolder[];
  selectedSubfolderId: string | null;
  onSelectSubfolder: (id: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  connectedUsers: ConnectedUser[];
  onCreateFolder: (name: string) => void;
  onCreateSubfolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folder: Folder) => void;
  onDeleteSubfolder: (subfolder: Subfolder) => void;
  onRenameFolder: (id: string, oldName: string, newName: string) => void;
  onRenameSubfolder: (id: string, oldName: string, newName: string) => void;
  frames: { subfolder_id: string }[];
}

export default function Sidebar({
  projectId, settings, setSettings, folders, subfolders,
  selectedSubfolderId, onSelectSubfolder, userName, setUserName,
  connectedUsers, onCreateFolder, onCreateSubfolder, onDeleteFolder,
  onDeleteSubfolder, onRenameFolder, onRenameSubfolder, frames
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({});

  // Inline creation states
  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [creatingSubfolderId, setCreatingSubfolderId] = React.useState<string | null>(null);
  const [newSubfolderName, setNewSubfolderName] = React.useState('');

  // Inline rename states
  const [renamingFolderId, setRenamingFolderId] = React.useState<string | null>(null);
  const [renamingSubfolderId, setRenamingSubfolderId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');

  // Delete confirmation
  const [confirmDeleteFolder, setConfirmDeleteFolder] = React.useState<string | null>(null);
  const [confirmDeleteSubfolder, setConfirmDeleteSubfolder] = React.useState<string | null>(null);

  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const subfolderInputRef = React.useRef<HTMLInputElement>(null);
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isCreatingFolder) folderInputRef.current?.focus();
  }, [isCreatingFolder]);

  React.useEffect(() => {
    if (creatingSubfolderId) subfolderInputRef.current?.focus();
  }, [creatingSubfolderId]);

  React.useEffect(() => {
    if (renamingFolderId || renamingSubfolderId) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [renamingFolderId, renamingSubfolderId]);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) { setIsCreatingFolder(false); return; }
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleCreateSubfolder = (folderId: string) => {
    if (!newSubfolderName.trim()) { setCreatingSubfolderId(null); return; }
    onCreateSubfolder(folderId, newSubfolderName.trim());
    setNewSubfolderName('');
    setCreatingSubfolderId(null);
  };

  const startRenameFolder = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingFolderId(folder.id);
    setRenameValue(folder.name);
  };

  const startRenameSubfolder = (sub: Subfolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSubfolderId(sub.id);
    setRenameValue(sub.name);
  };

  const submitRenameFolder = (id: string, oldName: string) => {
    if (renameValue.trim() && renameValue.trim() !== oldName) {
      onRenameFolder(id, oldName, renameValue.trim());
    }
    setRenamingFolderId(null);
  };

  const submitRenameSubfolder = (id: string, oldName: string) => {
    if (renameValue.trim() && renameValue.trim() !== oldName) {
      onRenameSubfolder(id, oldName, renameValue.trim());
    }
    setRenamingSubfolderId(null);
  };

  const copyId = () => {
    navigator.clipboard.writeText(projectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFrameCount = (subfolderId: string) => frames.filter(f => f.subfolder_id === subfolderId).length;

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
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-title font-bold text-white tracking-tight">SpriteForge</h1>
              <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Studio Colaborativo</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mi Nombre</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Tu nombre..."
              />
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <span>ID del Proyecto</span>
                <button onClick={copyId} className="hover:text-indigo-400 transition-colors">
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
              </div>
              <div className="text-xs font-mono text-slate-300 truncate">{projectId}</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center font-title font-bold text-white">SF</div>
            <div className="w-2 h-2 rounded-full bg-green-500" title={userName} />
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
              {[
                { label: 'Ancho (px)', key: 'frameWidth' as const },
                { label: 'Alto (px)', key: 'frameHeight' as const },
                { label: 'Pasos', key: 'steps' as const },
                { label: 'Velocidad (ms)', key: 'speed' as const },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</label>
                  <input
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={settings[key]}
                    onChange={(e) => setSettings({ ...settings, [key]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-indigo-400" title="Configuración">
              <SettingsIcon size={20} />
            </button>
          </div>
        )}

        {/* Folders Section */}
        <div className="space-y-4">
          {!isCollapsed && (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Jerarquía</h2>
              <button
                onClick={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
                className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                title="Nueva Carpeta"
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          <div className={`${isCollapsed ? 'space-y-4 flex flex-col items-center' : 'space-y-1'}`}>
            {folders.map((folder) => {
              const folderSubfolders = subfolders.filter(s => s.folder_id === folder.id);
              const isExpanded = expandedFolders[folder.id];
              const isRenaming = renamingFolderId === folder.id;
              const isDeleting = confirmDeleteFolder === folder.id;

              if (isCollapsed) {
                return (
                  <div key={folder.id} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center cursor-pointer" title={folder.name}>
                    <FolderIcon size={18} className="text-indigo-400" />
                  </div>
                );
              }

              return (
                <div key={folder.id} className="space-y-0.5">
                  {/* Folder Header */}
                  <div className="group flex items-center justify-between p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => toggleFolder(folder.id)}>
                      {isExpanded ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                      <FolderIcon size={14} className="text-indigo-400 shrink-0" />
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          className="flex-1 bg-white/10 border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-white focus:outline-none min-w-0"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRenameFolder(folder.id, folder.name);
                            if (e.key === 'Escape') setRenamingFolderId(null);
                          }}
                          onBlur={() => submitRenameFolder(folder.id, folder.name)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-200 truncate">{folder.name}</span>
                      )}
                    </div>
                    {!isRenaming && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setCreatingSubfolderId(folder.id); setNewSubfolderName(''); setExpandedFolders(p => ({ ...p, [folder.id]: true })); }} className="p-1 text-slate-500 hover:text-indigo-400 rounded transition-colors" title="Nueva Subcarpeta">
                          <Plus size={13} />
                        </button>
                        <button onClick={(e) => startRenameFolder(folder, e)} className="p-1 text-slate-500 hover:text-amber-400 rounded transition-colors" title="Renombrar">
                          <Pencil size={12} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteFolder(folder.id); }} className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors" title="Eliminar">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete confirmation */}
                  {isDeleting && (
                    <div className="ml-6 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-2 animate-in fade-in duration-200">
                      <span className="text-[10px] text-red-300">¿Eliminar "{folder.name}"?</span>
                      <div className="flex gap-1">
                        <button onClick={() => { onDeleteFolder(folder); setConfirmDeleteFolder(null); }} className="px-2 py-0.5 rounded bg-red-500/30 text-red-200 text-[10px] font-bold hover:bg-red-500/50 transition-colors">Sí</button>
                        <button onClick={() => setConfirmDeleteFolder(null)} className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[10px] font-bold hover:bg-white/10 transition-colors">No</button>
                      </div>
                    </div>
                  )}

                  {/* Subfolders */}
                  {isExpanded && (
                    <div className="ml-4 pl-2 border-l border-white/5 space-y-0.5">
                      {folderSubfolders.map(sub => {
                        const isSelected = selectedSubfolderId === sub.id;
                        const isSubRenaming = renamingSubfolderId === sub.id;
                        const isSubDeleting = confirmDeleteSubfolder === sub.id;
                        const frameCount = getFrameCount(sub.id);

                        return (
                          <div key={sub.id}>
                            <div
                              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-indigo-500/20 border border-indigo-500/40' : 'hover:bg-white/5 border border-transparent'}`}
                              onClick={() => onSelectSubfolder(sub.id)}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FolderIcon size={12} className={isSelected ? 'text-indigo-300 shrink-0' : 'text-slate-500 shrink-0'} />
                                {isSubRenaming ? (
                                  <input
                                    ref={renameInputRef}
                                    className="flex-1 bg-white/10 border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-white focus:outline-none min-w-0"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') submitRenameSubfolder(sub.id, sub.name);
                                      if (e.key === 'Escape') setRenamingSubfolderId(null);
                                    }}
                                    onBlur={() => submitRenameSubfolder(sub.id, sub.name)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className={`text-xs truncate ${isSelected ? 'font-bold text-white' : 'text-slate-300'}`}>{sub.name}</span>
                                )}
                                {frameCount > 0 && !isSubRenaming && (
                                  <span className="ml-auto text-[9px] font-bold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full shrink-0">{frameCount}</span>
                                )}
                              </div>
                              {!isSubRenaming && (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                  <button onClick={(e) => startRenameSubfolder(sub, e)} className="p-1 text-slate-500 hover:text-amber-400 rounded transition-colors" title="Renombrar">
                                    <Pencil size={11} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteSubfolder(sub.id); }} className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors" title="Eliminar">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                            {isSubDeleting && (
                              <div className="ml-4 mt-0.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-2 animate-in fade-in duration-200">
                                <span className="text-[10px] text-red-300">¿Eliminar "{sub.name}"?</span>
                                <div className="flex gap-1">
                                  <button onClick={() => { onDeleteSubfolder(sub); setConfirmDeleteSubfolder(null); }} className="px-2 py-0.5 rounded bg-red-500/30 text-red-200 text-[10px] font-bold hover:bg-red-500/50 transition-colors">Sí</button>
                                  <button onClick={() => setConfirmDeleteSubfolder(null)} className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[10px] font-bold hover:bg-white/10 transition-colors">No</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Inline subfolder creation */}
                      {creatingSubfolderId === folder.id && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-indigo-500/30 animate-in fade-in duration-200">
                          <FolderIcon size={12} className="text-indigo-400 shrink-0" />
                          <input
                            ref={subfolderInputRef}
                            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none min-w-0"
                            placeholder="Nombre de subcarpeta..."
                            value={newSubfolderName}
                            onChange={(e) => setNewSubfolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateSubfolder(folder.id);
                              if (e.key === 'Escape') setCreatingSubfolderId(null);
                            }}
                          />
                          <button onClick={() => handleCreateSubfolder(folder.id)} className="p-0.5 text-green-400 hover:text-green-300"><CheckIcon size={14} /></button>
                          <button onClick={() => setCreatingSubfolderId(null)} className="p-0.5 text-slate-500 hover:text-slate-300"><XIcon size={14} /></button>
                        </div>
                      )}

                      {folderSubfolders.length === 0 && creatingSubfolderId !== folder.id && (
                        <p className="text-[10px] text-slate-600 italic pl-4 py-1">Sin subcarpetas</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Inline folder creation */}
            {isCreatingFolder && !isCollapsed && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-indigo-500/30 animate-in fade-in duration-200">
                <FolderIcon size={14} className="text-indigo-400 shrink-0" />
                <input
                  ref={folderInputRef}
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none min-w-0"
                  placeholder="Nombre de carpeta..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') setIsCreatingFolder(false);
                  }}
                />
                <button onClick={handleCreateFolder} className="p-0.5 text-green-400 hover:text-green-300"><CheckIcon size={14} /></button>
                <button onClick={() => setIsCreatingFolder(false)} className="p-0.5 text-slate-500 hover:text-slate-300"><XIcon size={14} /></button>
              </div>
            )}

            {folders.length === 0 && !isCollapsed && !isCreatingFolder && (
              <div className="text-center py-6 rounded-xl bg-white/[0.02] border border-dashed border-white/5">
                <p className="text-xs text-slate-500 font-medium">Ninguna carpeta.</p>
                <button onClick={() => setIsCreatingFolder(true)} className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold">+ Crear primera carpeta</button>
              </div>
            )}
          </div>
        </div>

        {/* Connected Users Section */}
        <div className="pt-4 border-t border-white/5">
          {!isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-300">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider">En Línea ({connectedUsers.length})</h2>
              </div>
              <div className="space-y-1">
                {connectedUsers.map((user, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${user.isMe ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-white/[0.02] border border-transparent hover:bg-white/5'}`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/10"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className={`text-xs font-medium truncate ${user.isMe ? 'text-indigo-300' : 'text-slate-300'}`}>
                      {user.name}
                    </span>
                    {user.isMe && (
                      <span className="ml-auto text-[9px] font-bold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded-full shrink-0">Tú</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-bold">{connectedUsers.length}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
