'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import ProfileMenu from '@/components/ProfileMenu';
import { usePlanStore } from '@/stores/planStore';
import PlanExistingBlocksModal from '@/components/planea/PlanExistingBlocksModal';
import PlanModeSelector from '@/components/planea/PlanModeSelector';
import api from '@/lib/api';

function getGreetingText(user: { name?: string | null } | null) {
  const now = new Date();
  const hour = now.getHours();
  const baseGreetingRaw =
    hour >= 5 && hour < 12
      ? 'buen d\u00eda'
      : hour >= 12 && hour < 19
        ? 'buenas tardes'
        : 'buenas noches';
  const baseGreeting = `${baseGreetingRaw.charAt(0).toUpperCase()}${baseGreetingRaw.slice(1).toLowerCase()}`;
  const displayNameRaw = user?.name?.trim();
  const displayName =
    displayNameRaw && displayNameRaw.length > 0
      ? displayNameRaw
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
          .join(' ')
      : null;
  return displayName ? `${baseGreeting}, ${displayName}.` : `${baseGreeting}.`;
}

function formatLongDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const formatted = formatter.format(date);
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}.`;
}


export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { reset, setFechaSeleccionada, setBloquesExistentes } = usePlanStore();
  const [showExistingBlocksModal, setShowExistingBlocksModal] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showGlassTest, setShowGlassTest] = useState(false);
  const [glassPosition, setGlassPosition] = useState({ x: 0, y: 0 });
  const [isDraggingGlass, setIsDraggingGlass] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const glassPanelRef = useRef<HTMLDivElement | null>(null);
  const [existingBlocksData, setExistingBlocksData] = useState<{
    blocks: Array<{ id: string; title: string; start: string; end: string; color?: string }>;
    date: string;
  } | null>(null);

  useDisableBodyScrollOnMount();

  const greetingText = getGreetingText(user);
  const greetingParts = greetingText.split(',');
  const greetingLead = greetingParts[0] ?? greetingText;
  const greetingName = greetingParts[1]?.trim();
  const greetingLineOne = greetingName ? `${greetingLead},` : greetingLead;
  const greetingLineTwo = greetingName ?? '';
  const formattedDate = formatLongDate(new Date());

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePlanWithAgendo = async (e?: React.MouseEvent) => {
    console.log('[Home] handlePlanWithAgendo: Click detectado');
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!showGlassTest && typeof window !== 'undefined') {
      setShowGlassTest(true);
      return;
    }

    if (showGlassTest) return;
    
    // Abrir el modal selector de modo
    const today = new Date();
    const dateKey = formatDateKey(today);
    setShowModeSelector(true);
  };

  const handleGlassPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setIsDraggingGlass(true);
  };

  useEffect(() => {
    if (!isDraggingGlass) return;
    const handleMove = (event: PointerEvent) => {
      setGlassPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      });
    };
    const handleUp = () => {
      setIsDraggingGlass(false);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDraggingGlass]);

  useEffect(() => {
    if (!showGlassTest) return;
    if (!glassPanelRef.current) return;
    const frame = requestAnimationFrame(() => {
      const rect = glassPanelRef.current?.getBoundingClientRect();
      if (!rect) return;
      setGlassPosition({
        x: window.innerWidth / 2 - rect.width / 2,
        y: window.innerHeight / 2 - rect.height / 2,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [showGlassTest]);

  const handleSelectMode = async (mode: 'quick' | 'intelligent') => {
    const today = new Date();
    const dateKey = formatDateKey(today);
    
    if (mode === 'quick') {
      // Flujo 1.0: Planear el día (comportamiento actual)
      try {
        // Verificar si hay bloques para hoy
        const response = await api.get('/blocks', {
          params: {
            from: dateKey,
            to: dateKey,
          },
        });
        
        const blocks = response.data?.items || [];
        const existingBlocks = blocks.filter((block: any) => block.id);
        console.log('[Home] Bloques existentes encontrados:', existingBlocks.length);
        
        if (existingBlocks.length > 0) {
          // Hay bloques, mostrar modal
          const blocksData = existingBlocks.map((block: any) => ({
            id: block.id,
            title: block.title,
            start: block.start,
            end: block.end,
            color: block.color || undefined,
          }));
          
          setExistingBlocksData({
            blocks: blocksData,
            date: dateKey,
          });
          setShowExistingBlocksModal(true);
        } else {
          // No hay bloques, proceder directamente
          console.log('[Home] No hay bloques, procediendo directamente');
          proceedToPlanning(dateKey);
        }
      } catch (error) {
        console.error('[Home] Error verificando bloques:', error);
        // En caso de error, proceder de todas formas
        proceedToPlanning(dateKey);
      }
    } else {
      // Flujo 2.0: Planeación inteligente
      // Navegar a la nueva página de planeación inteligente
      router.push('/plan/intelligent');
    }
  };

  const proceedToPlanning = (dateKey: string) => {
    console.log('[Home] proceedToPlanning: Iniciando navegación a /plan con fecha', dateKey);
    reset();
    setFechaSeleccionada(dateKey);
    setShowExistingBlocksModal(false);
    setExistingBlocksData(null);
    // Usar window.location directamente para asegurar que funcione
    console.log('[Home] Navegando a /plan usando window.location.href');
    window.location.href = '/plan';
  };

  const handleDeleteExistingBlocks = async () => {
    if (!existingBlocksData) return;
    
    try {
      // Eliminar todos los bloques del día
      for (const block of existingBlocksData.blocks) {
        await api.delete(`/blocks/${block.id}`);
      }
      
      // Proceder al planning después de eliminar
      proceedToPlanning(existingBlocksData.date);
    } catch (error) {
      console.error('Error eliminando bloques existentes:', error);
      alert('Hubo un error al eliminar los bloques. Por favor, intentá de nuevo.');
    }
  };

  const handleKeepExistingBlocks = () => {
    if (!existingBlocksData) return;
    
    // Guardar los bloques existentes en el store
    setBloquesExistentes(existingBlocksData.blocks);
    
    // Proceder al planning manteniendo los bloques
    proceedToPlanning(existingBlocksData.date);
  };

  return (
    <main className="home-shell">
      {user && (
        <div className="home-profile">
          <ProfileMenu />
        </div>
      )}

      <div className="home-layout">
        <div className="home-greeting-block">
          <h1 className="home-greeting-title">
            <span className="home-greeting-line home-greeting-line--primary">{greetingLineOne}</span>
            {greetingLineTwo && <span className="home-greeting-line">{greetingLineTwo}</span>}
          </h1>
        </div>

        <div className="home-center">
          {user ? (
            <button
              type="button"
              className="home-action-button agendo-glass agendo-glass--displacement"
              onClick={(e) => {
                console.log('[Home] Botón clickeado');
                handlePlanWithAgendo(e);
              }}
            >
              <span>Planeá con Agendo</span>
            </button>
          ) : (
            <a href="/acceso" className="home-action-button agendo-glass agendo-glass--displacement">
              <span>Acceder</span>
            </a>
          )}
        </div>

        <div className="home-date-block">
          <p className="home-date">{formattedDate}</p>
          <p className="home-date-sub">Tu día empieza a tomar forma.</p>
        </div>
      </div>

      {/* Modal selector de modo */}

      {typeof document !== 'undefined' && createPortal(
        <PlanModeSelector
          isOpen={showModeSelector}
          onClose={() => setShowModeSelector(false)}
          onSelectMode={handleSelectMode}
          selectedDate={null}
        />,
        document.body
      )}

      {/* Modal para bloques existentes */}
      {typeof document !== 'undefined' && existingBlocksData && showExistingBlocksModal && createPortal(
        <PlanExistingBlocksModal
          isOpen={showExistingBlocksModal}
          onClose={() => {
            setShowExistingBlocksModal(false);
            setExistingBlocksData(null);
          }}
          onDeleteBlocks={handleDeleteExistingBlocks}
          onKeepBlocks={handleKeepExistingBlocks}
          blocksCount={existingBlocksData.blocks.length}
          date={existingBlocksData.date}
        />,
        document.body
      )}

      {showGlassTest && typeof document !== 'undefined' && createPortal(
        <div className="glass-test-overlay" role="dialog" aria-modal="true">
          <div className="glass-test-backdrop" onClick={() => setShowGlassTest(false)} />
          <div
            className="glass-test-panel agendo-glass agendo-glass--displacement"
            onPointerDown={handleGlassPointerDown}
            style={{ left: glassPosition.x, top: glassPosition.y }}
            data-dragging={isDraggingGlass || undefined}
            ref={glassPanelRef}
          >
            <div className="glass-test-header">
              <span>Glass Test</span>
              <button
                type="button"
                className="glass-test-close"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setShowGlassTest(false)}
              >
                Cerrar
              </button>
            </div>
            <p className="glass-test-body">Arrastrá este panel para probar el displacement.</p>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}

function useDisableBodyScrollOnMount() {
  useEffect(() => {
    document.body.classList.add('no-scroll-home');
    document.documentElement.classList.add('no-scroll-home');
    document.body.classList.add('home-no-topbar');
    document.documentElement.classList.add('home-no-topbar');
    return () => {
      document.body.classList.remove('no-scroll-home');
      document.documentElement.classList.remove('no-scroll-home');
      document.body.classList.remove('home-no-topbar');
      document.documentElement.classList.remove('home-no-topbar');
    };
  }, []);
}
