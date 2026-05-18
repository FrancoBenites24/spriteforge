import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { UndoableAction } from '../types';

const MAX_HISTORY = 15;

export function useUndoRedo(projectId: string | null) {
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);
  const isProcessing = useRef(false);

  const pushAction = useCallback((action: UndoableAction) => {
    setUndoStack(prev => {
      const next = [...prev, action];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]); // Clear redo on new action
  }, []);

  const executeAction = useCallback(async (action: UndoableAction, isUndo: boolean) => {
    if (!projectId) return false;
    const data = isUndo ? action.undoData : action.redoData;

    try {
      switch (action.type) {
        case 'ADD_FRAME': {
          if (isUndo) {
            // Undo add = delete the frame
            await supabase.from('frames').delete().eq('id', data.id);
          } else {
            // Redo add = re-insert the frame
            await supabase.from('frames').insert([{
              id: data.id,
              project_id: data.project_id,
              subfolder_id: data.subfolder_id,
              image_url: data.image_url,
              position_index: data.position_index
            }]);
          }
          break;
        }
        case 'DELETE_FRAME': {
          if (isUndo) {
            // Undo delete = re-insert the frame
            await supabase.from('frames').insert([{
              id: data.id,
              project_id: data.project_id,
              subfolder_id: data.subfolder_id,
              image_url: data.image_url,
              position_index: data.position_index
            }]);
          } else {
            // Redo delete = delete again
            await supabase.from('frames').delete().eq('id', data.id);
          }
          break;
        }
        case 'UPDATE_FRAME': {
          // Both undo and redo = update to the respective image_url
          await supabase.from('frames').update({ image_url: data.image_url }).eq('id', data.id);
          break;
        }
        case 'ADD_FOLDER': {
          if (isUndo) {
            await supabase.from('folders').delete().eq('id', data.id);
          } else {
            await supabase.from('folders').insert([{
              id: data.id,
              project_id: data.project_id,
              name: data.name,
              position_index: data.position_index
            }]);
          }
          break;
        }
        case 'DELETE_FOLDER': {
          if (isUndo) {
            await supabase.from('folders').insert([{
              id: data.id,
              project_id: data.project_id,
              name: data.name,
              position_index: data.position_index
            }]);
          } else {
            await supabase.from('folders').delete().eq('id', data.id);
          }
          break;
        }
        case 'ADD_SUBFOLDER': {
          if (isUndo) {
            await supabase.from('subfolders').delete().eq('id', data.id);
          } else {
            await supabase.from('subfolders').insert([{
              id: data.id,
              folder_id: data.folder_id,
              name: data.name,
              position_index: data.position_index
            }]);
          }
          break;
        }
        case 'DELETE_SUBFOLDER': {
          if (isUndo) {
            await supabase.from('subfolders').insert([{
              id: data.id,
              folder_id: data.folder_id,
              name: data.name,
              position_index: data.position_index
            }]);
          } else {
            await supabase.from('subfolders').delete().eq('id', data.id);
          }
          break;
        }
        case 'RENAME_FOLDER': {
          await supabase.from('folders').update({ name: data.name }).eq('id', data.id);
          break;
        }
        case 'RENAME_SUBFOLDER': {
          await supabase.from('subfolders').update({ name: data.name }).eq('id', data.id);
          break;
        }
      }
      return true;
    } catch (err) {
      console.error('[UndoRedo] Error executing action:', err);
      return false;
    }
  }, [projectId]);

  const undo = useCallback(async () => {
    if (undoStack.length === 0 || isProcessing.current) return;
    isProcessing.current = true;

    const action = undoStack[undoStack.length - 1];
    const success = await executeAction(action, true);

    if (success) {
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => {
        const next = [...prev, action];
        if (next.length > MAX_HISTORY) next.shift();
        return next;
      });
    }

    isProcessing.current = false;
  }, [undoStack, executeAction]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0 || isProcessing.current) return;
    isProcessing.current = true;

    const action = redoStack[redoStack.length - 1];
    const success = await executeAction(action, false);

    if (success) {
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => {
        const next = [...prev, action];
        if (next.length > MAX_HISTORY) next.shift();
        return next;
      });
    }

    isProcessing.current = false;
  }, [redoStack, executeAction]);

  return {
    pushAction,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
  };
}
