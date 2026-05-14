import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, LogIn, Sparkles } from 'lucide-react';

interface JoinProjectProps {
  onProjectJoined: (projectId: string) => void;
}

export default function JoinProject({ onProjectJoined }: JoinProjectProps) {
  const [projectIdInput, setProjectIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ 
          frame_width: 96, 
          frame_height: 96, 
          steps: 8, 
          speed: 100 
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) onProjectJoined(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectIdInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectIdInput.trim())
        .single();

      if (error) throw new Error('No se encontró el proyecto con ese ID');
      if (data) onProjectJoined(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f111a] p-4 font-body">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative glass-card max-w-md w-full p-8 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-2">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-title font-bold text-white tracking-tight">SpriteForge</h1>
          <p className="text-slate-400">Editor de Sprites Colaborativo en Tiempo Real</p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={createProject}
            disabled={loading}
            className="group flex items-center justify-center gap-3 w-full p-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            Crear Nuevo Proyecto
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1a1c2e] px-4 text-slate-500">O únete a uno</span>
            </div>
          </div>

          <form onSubmit={joinProject} className="space-y-3">
            <input
              type="text"
              placeholder="ID del Proyecto"
              value={projectIdInput}
              onChange={(e) => setProjectIdInput(e.target.value)}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={loading || !projectIdInput.trim()}
              className="flex items-center justify-center gap-3 w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10 transition-all disabled:opacity-30"
            >
              <LogIn className="w-5 h-5" />
              Unirse con ID
            </button>
          </form>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in slide-in-from-top-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
