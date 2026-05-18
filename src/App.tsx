import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import CropEditor from './components/CropEditor';
import PreviewPanel from './components/PreviewPanel';
import JoinProject from './components/JoinProject';
import CursorOverlay from './components/CursorOverlay';
import { supabase } from './lib/supabase';
import { useUndoRedo } from './hooks/useUndoRedo';
import type { Frame, Settings, Folder, Subfolder, ConnectedUser } from './types';
import './index.css';

export default function App() {
  const [projectId, setProjectId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('p');
  });

  const [frames, setFrames] = useState<Frame[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [subfolders, setSubfolders] = useState<Subfolder[]>([]);
  const [selectedSubfolderId, setSelectedSubfolderId] = useState<string | null>(null);

  const [settings, setSettings] = useState<Settings>({
    frameWidth: 96, frameHeight: 96, steps: 8, speed: 100,
  });

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('spriteforge_username') || `User-${Math.floor(Math.random() * 1000)}`;
  });
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);

  const { pushAction, undo, redo, canUndo, canRedo, undoCount, redoCount } = useUndoRedo(projectId);

  useEffect(() => {
    localStorage.setItem('spriteforge_username', userName);
  }, [userName]);

  // Sync Project ID to URL
  useEffect(() => {
    if (projectId) {
      const url = new URL(window.location.href);
      url.searchParams.set('p', projectId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [projectId]);

  // Global keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // ─── Data fetching ───
  const fetchAllData = useCallback(async () => {
    if (!projectId) return;

    const [projectRes, foldersRes, subfoldersRes, framesRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('folders').select('*').eq('project_id', projectId).order('position_index', { ascending: true }),
      supabase.from('subfolders').select('*, folders!inner(project_id)').eq('folders.project_id', projectId).order('position_index', { ascending: true }),
      supabase.from('frames').select('*').eq('project_id', projectId).order('position_index', { ascending: true }),
    ]);

    if (!projectRes.error && projectRes.data) {
      setSettings({
        frameWidth: projectRes.data.frame_width,
        frameHeight: projectRes.data.frame_height,
        steps: projectRes.data.steps,
        speed: projectRes.data.speed,
      });
    }

    if (!foldersRes.error && foldersRes.data) setFolders(foldersRes.data);

    if (!subfoldersRes.error && subfoldersRes.data) {
      const cleaned = subfoldersRes.data.map((s: any) => {
        const { folders: _f, ...rest } = s;
        return rest;
      });
      setSubfolders(cleaned);
      if (cleaned.length > 0 && !selectedSubfolderId) {
        setSelectedSubfolderId(cleaned[0].id);
      }
    }

    if (!framesRes.error && framesRes.data) {
      setFrames(framesRes.data.map((f: any) => ({
        id: f.id, project_id: f.project_id, subfolder_id: f.subfolder_id,
        image_url: f.image_url, position_index: f.position_index
      })));
    }
  }, [projectId, selectedSubfolderId]);

  // Load + subscribe to Realtime
  useEffect(() => {
    if (!projectId) return;
    fetchAllData();

    const channel = supabase
      .channel(`project:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'frames', filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nf = payload.new as any;
            setFrames(prev => { if (prev.some(f => f.id === nf.id)) return prev; return [...prev, nf].sort((a, b) => a.position_index - b.position_index); });
          } else if (payload.eventType === 'DELETE') {
            setFrames(prev => prev.filter(f => f.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            const uf = payload.new as any;
            setFrames(prev => prev.map(f => f.id === uf.id ? uf : f).sort((a, b) => a.position_index - b.position_index));
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        (payload) => {
          const u = payload.new as any;
          setSettings({ frameWidth: u.frame_width, frameHeight: u.frame_height, steps: u.steps, speed: u.speed });
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFolders(prev => { if (prev.some(f => f.id === (payload.new as any).id)) return prev; return [...prev, payload.new as Folder].sort((a, b) => a.position_index - b.position_index); });
          } else if (payload.eventType === 'DELETE') {
            setFolders(prev => prev.filter(f => f.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setFolders(prev => prev.map(f => f.id === (payload.new as any).id ? (payload.new as Folder) : f).sort((a, b) => a.position_index - b.position_index));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subfolders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSubfolders(prev => { if (prev.some(s => s.id === (payload.new as any).id)) return prev; return [...prev, payload.new as Subfolder].sort((a, b) => a.position_index - b.position_index); });
          } else if (payload.eventType === 'DELETE') {
            setSubfolders(prev => prev.filter(f => f.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setSubfolders(prev => prev.map(f => f.id === (payload.new as any).id ? (payload.new as Subfolder) : f).sort((a, b) => a.position_index - b.position_index));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Suscrito al proyecto ${projectId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error, re-fetching data...');
          setTimeout(() => fetchAllData(), 2000);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  // ─── Settings ───
  const updateSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    if (!projectId) return;
    await supabase.from('projects').update({
      frame_width: newSettings.frameWidth, frame_height: newSettings.frameHeight,
      steps: newSettings.steps, speed: newSettings.speed
    }).eq('id', projectId);
  };

  // ─── Upload Helper ───
  const uploadToStorage = async (dataUrl: string): Promise<string | null> => {
    if (!projectId) return null;
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `${projectId}/${crypto.randomUUID()}.png`;
    const { data, error } = await supabase.storage.from('sprites').upload(fileName, blob, { contentType: 'image/png' });
    if (error) { console.error('Upload error:', error); return null; }
    const { data: { publicUrl } } = supabase.storage.from('sprites').getPublicUrl(data.path);
    return publicUrl;
  };

  // ─── Frame Operations ───
  const handleUpload = (dataUrl: string) => {
    setCurrentImageUrl(dataUrl);
    setEditIndex(null);
    setIsCropModalOpen(true);
  };

  const handleUploadMultiple = async (dataUrls: string[]) => {
    if (!projectId || !selectedSubfolderId) return;
    const currentCount = frames.filter(f => f.subfolder_id === selectedSubfolderId).length;
    const uploadPromises = dataUrls.map(async (dataUrl, index) => {
      const publicUrl = await uploadToStorage(dataUrl);
      if (!publicUrl) return null;
      return { project_id: projectId, subfolder_id: selectedSubfolderId, image_url: publicUrl, position_index: currentCount + index };
    });
    const newFramesData = (await Promise.all(uploadPromises)).filter(f => f !== null) as any[];
    if (newFramesData.length > 0) {
      const { data, error } = await supabase.from('frames').insert(newFramesData).select();
      if (!error && data) {
        data.forEach((frame: any) => {
          pushAction({ type: 'ADD_FRAME', undoData: frame, redoData: frame, timestamp: Date.now() });
        });
      }
    }
  };

  const handleEditFrame = (index: number) => {
    setCurrentImageUrl(frames[index].image_url);
    setEditIndex(index);
    setIsCropModalOpen(true);
  };

  const handleExtractAsNew = async (croppedDataUrl: string) => {
    if (!projectId) return;
    const publicUrl = await uploadToStorage(croppedDataUrl);
    if (!publicUrl) return;

    if (!selectedSubfolderId) {
      alert("Selecciona o crea una subcarpeta primero.");
      return;
    }

    const newFrame = {
      project_id: projectId, subfolder_id: selectedSubfolderId,
      image_url: publicUrl, position_index: frames.filter(f => f.subfolder_id === selectedSubfolderId).length
    };
    const { data, error } = await supabase.from('frames').insert([newFrame]).select().single();
    if (!error && data) {
      pushAction({ type: 'ADD_FRAME', undoData: data, redoData: data, timestamp: Date.now() });
    }
    // Editor stays open for more extractions
  };

  const handleReplaceOriginal = async (dataUrl: string, index: number) => {
    if (!projectId) return;
    const publicUrl = await uploadToStorage(dataUrl);
    if (!publicUrl) return;
    const frameToUpdate = frames[index];
    const oldImageUrl = frameToUpdate.image_url;
    const { error } = await supabase.from('frames').update({ image_url: publicUrl }).eq('id', frameToUpdate.id);
    if (!error) {
      pushAction({
        type: 'UPDATE_FRAME',
        undoData: { id: frameToUpdate.id, image_url: oldImageUrl },
        redoData: { id: frameToUpdate.id, image_url: publicUrl },
        timestamp: Date.now()
      });
      closeCropModal(); // ← Close modal after replacing
    }
  };

  const handleDeleteFrame = async (id: string) => {
    const frame = frames.find(f => f.id === id);
    if (!frame) return;
    const { error } = await supabase.from('frames').delete().eq('id', id);
    if (!error) {
      pushAction({ type: 'DELETE_FRAME', undoData: frame, redoData: frame, timestamp: Date.now() });
    }
  };

  // ─── Folder Operations ───
  const handleCreateFolder = async (name: string) => {
    if (!projectId) return;
    const { data, error } = await supabase.from('folders').insert([{ project_id: projectId, name, position_index: folders.length }]).select().single();
    if (!error && data) {
      pushAction({ type: 'ADD_FOLDER', undoData: data, redoData: data, timestamp: Date.now() });
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    const { error } = await supabase.from('folders').delete().eq('id', folder.id);
    if (!error) {
      pushAction({ type: 'DELETE_FOLDER', undoData: folder, redoData: folder, timestamp: Date.now() });
    }
  };

  const handleRenameFolder = async (id: string, oldName: string, newName: string) => {
    const { error } = await supabase.from('folders').update({ name: newName }).eq('id', id);
    if (!error) {
      pushAction({
        type: 'RENAME_FOLDER',
        undoData: { id, name: oldName },
        redoData: { id, name: newName },
        timestamp: Date.now()
      });
    }
  };

  // ─── Subfolder Operations ───
  const handleCreateSubfolder = async (folderId: string, name: string) => {
    const count = subfolders.filter(s => s.folder_id === folderId).length;
    const { data, error } = await supabase.from('subfolders').insert([{ folder_id: folderId, name, position_index: count }]).select().single();
    if (!error && data) {
      pushAction({ type: 'ADD_SUBFOLDER', undoData: data, redoData: data, timestamp: Date.now() });
    }
  };

  const handleDeleteSubfolder = async (subfolder: Subfolder) => {
    const { error } = await supabase.from('subfolders').delete().eq('id', subfolder.id);
    if (!error) {
      pushAction({ type: 'DELETE_SUBFOLDER', undoData: subfolder, redoData: subfolder, timestamp: Date.now() });
    }
  };

  const handleRenameSubfolder = async (id: string, oldName: string, newName: string) => {
    const { error } = await supabase.from('subfolders').update({ name: newName }).eq('id', id);
    if (!error) {
      pushAction({
        type: 'RENAME_SUBFOLDER',
        undoData: { id, name: oldName },
        redoData: { id, name: newName },
        timestamp: Date.now()
      });
    }
  };

  const closeCropModal = () => {
    setIsCropModalOpen(false);
    setCurrentImageUrl(null);
    setEditIndex(null);
  };

  const handleUsersUpdate = useCallback((users: ConnectedUser[]) => {
    setConnectedUsers(users);
  }, []);

  if (!projectId) {
    return <JoinProject onProjectJoined={setProjectId} />;
  }

  return (
    <div className="flex h-screen bg-[#0f111a] overflow-hidden text-slate-200 font-body">
      <CursorOverlay
        projectId={projectId}
        userName={userName}
        onUsersUpdate={handleUsersUpdate}
      />
      <Sidebar
        projectId={projectId}
        settings={settings}
        setSettings={updateSettings}
        folders={folders}
        subfolders={subfolders}
        selectedSubfolderId={selectedSubfolderId}
        onSelectSubfolder={setSelectedSubfolderId}
        userName={userName}
        setUserName={setUserName}
        connectedUsers={connectedUsers}
        onCreateFolder={handleCreateFolder}
        onCreateSubfolder={handleCreateSubfolder}
        onDeleteFolder={handleDeleteFolder}
        onDeleteSubfolder={handleDeleteSubfolder}
        onRenameFolder={handleRenameFolder}
        onRenameSubfolder={handleRenameSubfolder}
        frames={frames}
      />

      <main className="flex-1 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
        {isCropModalOpen ? (
          <div className="w-full h-full relative z-10">
            <CropEditor
              imageUrl={currentImageUrl}
              editIndex={editIndex}
              settings={settings}
              onClose={closeCropModal}
              onExtractAsNew={handleExtractAsNew}
              onReplaceOriginal={handleReplaceOriginal}
            />
          </div>
        ) : !selectedSubfolderId ? (
          <div className="w-full h-full relative z-10 flex flex-col items-center justify-center text-slate-500 animate-in fade-in duration-700">
            <div className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-white/5 mb-6 flex items-center justify-center bg-white/[0.01]">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>
            </div>
            <p className="text-xl font-medium tracking-tight">Selecciona una subcarpeta</p>
            <p className="text-sm text-slate-600 mt-2">Crea o selecciona una subcarpeta en el panel izquierdo para comenzar a editar.</p>
          </div>
        ) : (
          <PreviewPanel
            frames={frames.filter(f => f.subfolder_id === selectedSubfolderId)}
            settings={settings}
            onUpload={handleUpload}
            onUploadMultiple={handleUploadMultiple}
            onEditFrame={(indexInFiltered) => {
              const filteredFrames = frames.filter(f => f.subfolder_id === selectedSubfolderId);
              const globalIndex = frames.findIndex(f => f.id === filteredFrames[indexInFiltered].id);
              handleEditFrame(globalIndex);
            }}
            onDeleteFrame={handleDeleteFrame}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            undoCount={undoCount}
            redoCount={redoCount}
          />
        )}
      </main>
    </div>
  );
}
