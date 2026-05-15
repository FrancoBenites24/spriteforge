import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MousePointer2 } from 'lucide-react';

interface CursorOverlayProps {
  projectId: string;
}

interface Cursor {
  x: number;
  y: number;
  color: string;
}

const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', 
  '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', 
  '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', 
  '#e879f9', '#f472b6', '#fb7185'
];

export default function CursorOverlay({ projectId }: CursorOverlayProps) {
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const channelRef = useRef<any>(null);
  const myColor = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const myId = useRef(crypto.randomUUID());
  
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
        const state = channel.presenceState();
        const newCursors: Record<string, Cursor> = {};
        
        for (const [key, presences] of Object.entries(state)) {
          if (key === myId.current) continue; // No dibujar nuestro propio cursor
          
          const latestPresence = presences[presences.length - 1] as any;
          if (latestPresence && latestPresence.x !== undefined && latestPresence.y !== undefined) {
            newCursors[key] = {
              x: latestPresence.x,
              y: latestPresence.y,
              color: latestPresence.color || '#ffffff'
            };
          }
        }
        
        setCursors(newCursors);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Inicializar presencia (fuera de la pantalla)
          await channel.track({
            x: -100,
            y: -100,
            color: myColor.current,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (channelRef.current && channelRef.current.state === 'joined') {
        channelRef.current.track({
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
          color: myColor.current,
        });
      }
    };

    // Throttle de 50ms (20fps) para no saturar los websockets
    let isThrottled = false;
    const throttledMouseMove = (e: MouseEvent) => {
      if (isThrottled) return;
      isThrottled = true;
      handleMouseMove(e);
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
          className="absolute top-0 left-0 transition-transform duration-75 ease-linear"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
          }}
        >
          <MousePointer2
            size={24}
            fill={cursor.color}
            color="white"
            strokeWidth={1.5}
            className="drop-shadow-md"
            style={{ 
              transform: 'translate(-6px, -6px)' 
            }} 
          />
        </div>
      ))}
    </div>
  );
}
