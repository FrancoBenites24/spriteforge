import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CropEditor from './components/CropEditor';
import PreviewPanel from './components/PreviewPanel';
import JoinProject from './components/JoinProject';
import CursorOverlay from './components/CursorOverlay';
import { supabase } from './lib/supabase';
import type { Frame, Settings, Folder, Subfolder } from './types';
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
    frameWidth: 96,
    frameHeight: 96,
    steps: 8,
    speed: 100,
  });

  // Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Sync Project ID to URL
  useEffect(() => {
    if (projectId) {
      const url = new URL(window.location.href);
      url.searchParams.set('p', projectId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [projectId]);

  // Load Project Settings & Frames
  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (!error && data) {
        setSettings({
          frameWidth: data.frame_width,
          frameHeight: data.frame_height,
          steps: data.steps,
          speed: data.speed,
        });
      }
    };

    const fetchFrames = async () => {
      const { data, error } = await supabase
        .from('frames')
        .select('*')
        .eq('project_id', projectId)
        .order('position_index', { ascending: true });
      
      if (!error && data) {
        setFrames(data.map(f => ({
          id: f.id,
          project_id: f.project_id,
          subfolder_id: f.subfolder_id,
          image_url: f.image_url,
          position_index: f.position_index
        })));
      }
    };

    const fetchHierarchy = async () => {
      const [foldersRes, subfoldersRes] = await Promise.all([
        supabase.from('folders').select('*').eq('project_id', projectId).order('position_index', { ascending: true }),
        supabase.from('subfolders').select('*, folders!inner(project_id)').eq('folders.project_id', projectId).order('position_index', { ascending: true })
      ]);

      if (!foldersRes.error && foldersRes.data) {
        setFolders(foldersRes.data);
      }
      if (!subfoldersRes.error && subfoldersRes.data) {
        // Remove the joined column for clean state
        const cleanedSubfolders = subfoldersRes.data.map((s: any) => {
          const { folders, ...rest } = s;
          return rest;
        });
        setSubfolders(cleanedSubfolders);
        
        // Auto-select first subfolder if available and none selected
        if (cleanedSubfolders.length > 0 && !selectedSubfolderId) {
          setSelectedSubfolderId(cleanedSubfolders[0].id);
        }
      }
    };

    fetchProject();
    fetchHierarchy().then(fetchFrames);

    // Subscribe to Realtime changes
    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'frames', filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newFrame = payload.new as any;
            setFrames(prev => {
              if (prev.some(f => f.id === newFrame.id)) return prev;
              return [...prev, newFrame].sort((a, b) => a.position_index - b.position_index);
            });
          } else if (payload.eventType === 'DELETE') {
            setFrames(prev => prev.filter(f => f.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            const updatedFrame = payload.new as any;
            setFrames(prev => prev.map(f => f.id === updatedFrame.id ? updatedFrame : f).sort((a, b) => a.position_index - b.position_index));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        (payload) => {
          const updatedProject = payload.new as any;
          setSettings({
            frameWidth: updatedProject.frame_width,
            frameHeight: updatedProject.frame_height,
            steps: updatedProject.steps,
            speed: updatedProject.speed
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'folders', filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFolders(prev => [...prev, payload.new as Folder].sort((a, b) => a.position_index - b.position_index));
          } else if (payload.eventType === 'DELETE') {
            setFolders(prev => prev.filter(f => f.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setFolders(prev => prev.map(f => f.id === payload.new.id ? (payload.new as Folder) : f).sort((a, b) => a.position_index - b.position_index));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subfolders' },
        (payload) => {
          // Note: Subfolders don't have project_id directly, so we filter in state or just apply it
          if (payload.eventType === 'INSERT') {
            setSubfolders(prev => [...prev, payload.new as Subfolder].sort((a, b) => a.position_index - b.position_index));
          } else if (payload.eventType === 'DELETE') {
            setSubfolders(prev => prev.filter(f => f.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setSubfolders(prev => prev.map(f => f.id === payload.new.id ? (payload.new as Subfolder) : f).sort((a, b) => a.position_index - b.position_index));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Suscrito exitosamente a cambios en tiempo real del proyecto ${projectId}`);
        } else {
          console.error('Error al suscribirse a cambios en tiempo real:', status);
        }
      });


    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Update Project Settings in Supabase
  const updateSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    if (!projectId) return;

    await supabase
      .from('projects')
      .update({
        frame_width: newSettings.frameWidth,
        frame_height: newSettings.frameHeight,
        steps: newSettings.steps,
        speed: newSettings.speed
      })
      .eq('id', projectId);
  };

  const handleUpload = (dataUrl: string) => {
    setCurrentImageUrl(dataUrl);
    setEditIndex(null);
    setIsCropModalOpen(true);
  };

  const handleEditFrame = (index: number) => {
    setCurrentImageUrl(frames[index].image_url);
    setEditIndex(index);
    setIsCropModalOpen(true);
  };

  const uploadToStorage = async (dataUrl: string): Promise<string | null> => {
    if (!projectId) return null;
    
    // Convert dataUrl to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `${projectId}/${crypto.randomUUID()}.png`;

    const { data, error } = await supabase.storage
      .from('sprites')
      .upload(fileName, blob, { contentType: 'image/png' });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('sprites')
      .getPublicUrl(data.path);
    
    return publicUrl;
  };

  const handleExtractAsNew = async (dataUrl: string) => {
    if (!projectId) return;

    const publicUrl = await uploadToStorage(dataUrl);
    if (!publicUrl) return;

    if (!selectedSubfolderId) {
      alert("Selecciona o crea una subcarpeta primero para añadir frames.");
      return;
    }

    const newFrame = {
      project_id: projectId,
      subfolder_id: selectedSubfolderId,
      image_url: publicUrl,
      position_index: frames.filter(f => f.subfolder_id === selectedSubfolderId).length
    };

    const { data, error } = await supabase
      .from('frames')
      .insert([newFrame])
      .select()
      .single();

    if (!error && data) {
      // Realtime will catch this, but update local state for faster UI
      setFrames(prev => [...prev, data as any]);
    }
  };

  const handleReplaceOriginal = async (dataUrl: string, index: number) => {
    if (!projectId) return;
    
    const publicUrl = await uploadToStorage(dataUrl);
    if (!publicUrl) return;

    const frameToUpdate = frames[index];
    const { error } = await supabase
      .from('frames')
      .update({ image_url: publicUrl })
      .eq('id', frameToUpdate.id);

    if (!error) {
      setFrames(prev => {
        const next = [...prev];
        next[index] = { ...next[index], image_url: publicUrl };
        return next;
      });
    }
  };

  const handleDeleteFrame = async (id: string) => {
    const { error } = await supabase
      .from('frames')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setFrames(prev => prev.filter(f => f.id !== id));
    }
  };

  const closeCropModal = () => {
    setIsCropModalOpen(false);
    setCurrentImageUrl(null);
    setEditIndex(null);
  };

  if (!projectId) {
    return <JoinProject onProjectJoined={setProjectId} />;
  }

  return (
    <div className="flex h-screen bg-[#0f111a] overflow-hidden text-slate-200 font-body">
      <CursorOverlay projectId={projectId} />
      <Sidebar
        projectId={projectId}
        settings={settings}
        setSettings={updateSettings}
        folders={folders}
        subfolders={subfolders}
        selectedSubfolderId={selectedSubfolderId}
        onSelectSubfolder={setSelectedSubfolderId}
      />
      
      <main className="flex-1 relative">
        {/* Background gradient effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
        {isCropModalOpen ? (
          <div className="w-full h-full relative z-10">
            <CropEditor
              imageUrl={currentImageUrl}
              editIndex={editIndex}
              onClose={closeCropModal}
              onExtractAsNew={handleExtractAsNew}
              onReplaceOriginal={handleReplaceOriginal}
            />
          </div>
        ) : !selectedSubfolderId ? (
          <div className="w-full h-full relative z-10 flex flex-col items-center justify-center text-slate-500 animate-in fade-in duration-700">
            <div className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-white/5 mb-6 flex items-center justify-center bg-white/[0.01]">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
            </div>
            <p className="text-xl font-medium tracking-tight">Selecciona una subcarpeta</p>
            <p className="text-sm text-slate-600 mt-2">Crea o selecciona una subcarpeta en el panel izquierdo para comenzar a editar.</p>
          </div>
        ) : (
          <PreviewPanel 
            frames={frames.filter(f => f.subfolder_id === selectedSubfolderId)} 
            settings={settings} 
            onUpload={handleUpload}
            onEditFrame={(indexInFiltered) => {
              // We need to find the real index in the global frames array
              const filteredFrames = frames.filter(f => f.subfolder_id === selectedSubfolderId);
              const globalIndex = frames.findIndex(f => f.id === filteredFrames[indexInFiltered].id);
              handleEditFrame(globalIndex);
            }}
            onDeleteFrame={handleDeleteFrame}
          />
        )}
      </main>
    </div>
  );
}
