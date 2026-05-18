import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MousePointer2 } from 'lucide-react';
import type { ConnectedUser } from '../types';

interface CursorOverlayProps {
  projectId: string;
  userName: string;
  onUsersUpdate?: (users: ConnectedUser[]) => void;
}

interface Cursor {
  x: number;
  y: number;
  color: string;
  name: string;
}

const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', 
  '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', 
  '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', 
  '#e879f9', '#f472b6', '#fb7185'
];

export default function CursorOverlay({ projectId, userName, onUsersUpdate }: CursorOverlayProps) {
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const channelRef = useRef<any>(null);
  const myColor = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const myId = useRef(crypto.randomUUID());
  const onUsersUpdateRef = useRef(onUsersUpdate);
  const userNameRef = useRef(userName);

  // Keep refs in sync
  useEffect(() => {
    onUsersUpdateRef.current = onUsersUpdate;
  }, [onUsersUpdate]);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  // Stable presence sync callback
  const handlePresenceSync = useCallback((channel: any) => {
    const state = channel.presenceState();
    const newCursors: Record<string, Cursor> = {};
    const userList: ConnectedUser[] = [];
    
    for (const [key, presences] of Object.entries(state)) {
      const latestPresence = (presences as any[])[(presences as any[]).length - 1];
      if (latestPresence) {
        const isMe = key === myId.current;
        userList.push({
          name: latestPresence.name || 'Anónimo',
          color: latestPresence.color || '#ffffff',
          isMe
        });
        
        // Only render OTHER users' cursors
        if (!isMe && latestPresence.x !== undefined && latestPresence.y !== undefined && latestPresence.x > 0) {
          newCursors[key] = {
            x: latestPresence.x,
            y: latestPresence.y,
            color: latestPresence.color || '#ffffff',
            name: latestPresence.name || 'Anónimo'
          };
        }
      }
    }
    
    setCursors(newCursors);
    onUsersUpdateRef.current?.(userList);
  }, []);
  
  useEffect(() => {
    const channel = supabase.channel(`cursors:${projectId}`, {
      config: {
        presence: {
          key: myId.current,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        handlePresenceSync(channel);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        console.log(`[Presence] Usuario unido: ${key}`, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key }: any) => {
        console.log(`[Presence] Usuario salió: ${key}`);
        setCursors(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Presence] Suscrito correctamente');
          await channel.track({
            x: -100,
            y: -100,
            color: myColor.current,
            name: userNameRef.current
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, handlePresenceSync]);

  // Update tracking when name changes
  useEffect(() => {
    if (channelRef.current && channelRef.current.state === 'joined') {
      channelRef.current.track({
        x: -100,
        y: -100,
        color: myColor.current,
        name: userName
      });
    }
  }, [userName]);

  // Throttled mouse tracking
  useEffect(() => {
    let isThrottled = false;

    const throttledMouseMove = (e: MouseEvent) => {
      if (isThrottled) return;
      isThrottled = true;
      
      if (channelRef.current && channelRef.current.state === 'joined') {
        channelRef.current.track({
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
          color: myColor.current,
          name: userNameRef.current
        });
      }

      setTimeout(() => {
        isThrottled = false;
      }, 50);
    };

    window.addEventListener('mousemove', throttledMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', throttledMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {Object.entries(cursors).map(([id, cursor]) => (
        <div
          key={id}
          className="absolute top-0 left-0 flex flex-col items-start"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            transition: 'transform 100ms ease-out',
            willChange: 'transform',
          }}
        >
          <div className="relative">
            <MousePointer2
              size={22}
              fill={cursor.color}
              color="rgba(0,0,0,0.5)"
              strokeWidth={1}
              className="drop-shadow-lg"
              style={{ 
                transform: 'translate(-3px, -2px)',
                filter: `drop-shadow(0 0 3px ${cursor.color}50)`,
              }} 
            />
            {/* Name label */}
            <div 
              className="absolute left-4 top-4 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-lg whitespace-nowrap"
              style={{ 
                backgroundColor: cursor.color,
                boxShadow: `0 2px 8px ${cursor.color}40`,
              }}
            >
              {cursor.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
