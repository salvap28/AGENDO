'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Joyride, { CallBackProps, EVENTS, STATUS, Step, TooltipRenderProps } from 'react-joyride';
import { usePathname, useRouter } from 'next/navigation';

const TUTORIAL_COMPLETED_KEY = 'agendo_tutorial_completed_v2';

const steps: Step[] = [
    {
        target: 'body',
        content: (
            <div className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pulse-violet to-pulse-turquoise flex items-center justify-center shadow-glow">
                        <span className="text-xs font-bold text-white">AI</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Soy Agendo</h3>
                </div>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Tu asistente personal. Estoy aquí para ayudarte a planificar con calma y foco. ¿Te muestro cómo funciono?
                </p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '#tutorial-mobile-menu',
        content: (
            <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Menú de navegación</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Toca este botón para abrir el menú lateral. Desde ahí podrás acceder a todas las secciones de Agendo, tu perfil y configuraciones.
                </p>
            </div>
        ),
        placement: 'auto',
        disableBeacon: true,
    },
    {
        target: '#nav-calendario',
        content: (
            <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Calendario</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Aquí es donde sucede la magia. Tu calendario no es solo para citas, es tu lienzo para diseñar días equilibrados entre trabajo y descanso.
                </p>
            </div>
        ),
    },
    {
        target: '#tutorial-day-target',
        content: (
            <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Selecciona un día</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Haz click en el día de hoy para ver su detalle y planificar tus bloques.
                </p>
            </div>
        ),
        spotlightClicks: true,
        disableOverlayClose: true,
        hideFooter: true,
    },
    {
        target: '#tutorial-day-overlay-panorama',
        content: (
            <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Detalle del día</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Aquí puedes gestionar tus bloques de tiempo y tareas para este día. El panorama te muestra un resumen de lo que tienes planificado.
                </p>
            </div>
        ),
        placement: 'auto',
        disableBeacon: true,
        disableScrolling: true,
        disableOverlay: false,
        spotlightClicks: false,
    },
    {
        target: '#tutorial-add-block',
        content: (
            <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Añadir Bloques</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Reserva tiempo para lo importante. Define inicio, fin y tipo de foco.
                </p>
            </div>
        ),
        placement: 'auto',
        disableScrolling: true,
    },
    {
        target: '#tutorial-add-task',
        content: (
            <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Añadir Tareas</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Registra pendientes puntuales que no requieren un horario fijo.
                </p>
            </div>
        ),
        placement: 'auto',
        disableScrolling: true,
    },
    {
        target: '#tutorial-notes',
        content: (
            <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Notas del día</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Captura ideas, reflexiones o recordatorios importantes para este día.
                </p>
            </div>
        ),
        placement: 'auto',
        disableScrolling: true,
    },
    {
        target: '#nav-estadisticas',
        content: (
            <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Estadísticas</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Lo que no se mide, no se mejora. Aquí analizaremos juntos tus patrones de energía y foco para que te sea fácil dar tu 100%.
                </p>
            </div>
        ),
    },
    {
        target: '#nav-profile',
        content: (
            <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">Tu Perfil</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-[15px]">
                    Este es tu espacio. Configura tus preferencias y cuéntame más sobre ti para que pueda ayudarte mejor.
                </p>
            </div>
        ),
    },
];

function CustomTooltip({
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    tooltipProps,
    isLastStep,
}: TooltipRenderProps) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    return (
        <div
            {...tooltipProps}
            className={`${isMobile ? 'max-w-[calc(100vw-32px)]' : 'max-w-md'} w-full p-1 rounded-[24px] bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-2xl shadow-[0_35px_110px_rgba(0,0,0,0.6)] border border-white/10`}
            style={{ pointerEvents: 'auto', zIndex: 13001 }}
        >
            <div className={`bg-[#050610]/80 rounded-[20px] ${isMobile ? 'p-4' : 'p-6'} border border-white/5 relative overflow-hidden`}>
                {/* Ambient background effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-pulse-violet/10 blur-[60px] rounded-full" />
                    <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-pulse-turquoise/10 blur-[60px] rounded-full" />
                </div>

                <div className={`relative z-10 ${isMobile ? 'text-sm' : ''}`}>
                    {step.content}
                </div>

                <div className={`flex items-center justify-between ${isMobile ? 'mt-4 pt-3' : 'mt-6 pt-4'} border-t border-white/10 relative z-10 ${isMobile ? 'flex-col gap-3' : ''}`}>
                    <button
                        {...closeProps}
                        className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-white/40 hover:text-white/70 transition-colors uppercase tracking-wider`}
                        style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
                    >
                        Omitir
                    </button>

                    <div className={`flex ${isMobile ? 'gap-2 w-full' : 'gap-3'}`}>
                        {index > 0 && !step.hideFooter && (
                            <button
                                {...backProps}
                                className={`${isMobile ? 'px-3 py-1.5 text-xs flex-1' : 'px-4 py-2 text-sm'} rounded-xl border border-white/10 bg-white/5 text-white/70 font-medium hover:bg-white/10 hover:text-white transition-all`}
                                style={{ pointerEvents: 'auto', touchAction: 'manipulation', zIndex: 13001 }}
                            >
                                Atrás
                            </button>
                        )}
                        {!step.hideFooter && (
                            <button
                                {...primaryProps}
                                className={`${isMobile ? 'px-4 py-1.5 text-xs flex-1' : 'px-5 py-2 text-sm'} rounded-xl bg-gradient-to-r from-pulse-violet to-pulse-violet/80 text-white font-medium shadow-lg shadow-pulse-violet/20 hover:shadow-pulse-violet/40 hover:-translate-y-0.5 transition-all`}
                                style={{ pointerEvents: 'auto', touchAction: 'manipulation', zIndex: 13001 }}
                            >
                                {isLastStep ? 'Comenzar' : 'Siguiente'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Tutorial() {
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [mounted, setMounted] = useState(false);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        
        // Detectar si es móvil
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // Filtrar pasos según si es móvil o no y si los elementos existen
    // IMPORTANTE: Este hook debe estar antes de cualquier return condicional y antes de los useEffect que lo usan
    const filteredSteps = useMemo(() => {
        if (!mounted) return steps; // Si no está montado, retornar pasos sin filtrar
        
        return steps.filter((step) => {
            // Si el paso es del menú móvil y no estamos en móvil, omitirlo
            if (step.target === '#tutorial-mobile-menu' && !isMobile) {
                return false;
            }
            
            // Verificar que el elemento target exista (excepto para 'body' y elementos dentro del overlay)
            if (step.target && typeof step.target === 'string' && step.target !== 'body') {
                // Para elementos dentro del overlay, no verificar aquí (se verificarán cuando el overlay esté abierto)
                if (step.target.includes('tutorial-day-overlay') || 
                    step.target.includes('tutorial-add-') || 
                    step.target.includes('tutorial-notes')) {
                    return true;
                }
                
                // Para el paso de seleccionar el día, no filtrar (el elemento puede no existir aún)
                if (step.target === '#tutorial-day-target') {
                    return true;
                }
                
                // Para otros elementos, verificar que existan y estén visibles
                if (typeof document !== 'undefined') {
                    const element = document.querySelector(step.target);
                    if (!element) {
                        return false;
                    }
                    
                    // Verificar que el elemento esté visible
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    const isVisible = rect.width > 0 && rect.height > 0 && 
                                    style.visibility !== 'hidden' &&
                                    style.display !== 'none' &&
                                    style.opacity !== '0';
                    
                    if (!isVisible) {
                        return false;
                    }
                }
            }
            
            return true;
        });
    }, [steps, isMobile, mounted]);

    // Limpiar timeout al desmontar o cuando run cambia
    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, [run]);

    // Bloquear scroll durante el tutorial (pero permitir scroll programático)
    useEffect(() => {
        if (run) {
            // Bloquear scroll del body
            document.body.style.overflow = 'hidden';
            // Bloquear scroll del overlay si existe, pero permitir scroll programático
            const scrollContainer = document.querySelector('.day-pane__scroll');
            if (scrollContainer) {
                (scrollContainer as HTMLElement).style.overflow = 'hidden';
                // Permitir scroll programático deshabilitando eventos de scroll del usuario
                const preventScroll = (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                };
                scrollContainer.addEventListener('wheel', preventScroll, { passive: false });
                scrollContainer.addEventListener('touchmove', preventScroll, { passive: false });
                
                // Guardar referencia para limpiar
                (scrollContainer as any).__tutorialScrollPrevent = preventScroll;
            }
        } else {
            // Restaurar scroll cuando el tutorial termina
            document.body.style.overflow = '';
            const scrollContainer = document.querySelector('.day-pane__scroll');
            if (scrollContainer) {
                (scrollContainer as HTMLElement).style.overflow = '';
                const preventScroll = (scrollContainer as any).__tutorialScrollPrevent;
                if (preventScroll) {
                    scrollContainer.removeEventListener('wheel', preventScroll);
                    scrollContainer.removeEventListener('touchmove', preventScroll);
                    delete (scrollContainer as any).__tutorialScrollPrevent;
                }
            }
        }

        return () => {
            // Limpiar al desmontar
            document.body.style.overflow = '';
            const scrollContainer = document.querySelector('.day-pane__scroll');
            if (scrollContainer) {
                (scrollContainer as HTMLElement).style.overflow = '';
                const preventScroll = (scrollContainer as any).__tutorialScrollPrevent;
                if (preventScroll) {
                    scrollContainer.removeEventListener('wheel', preventScroll);
                    scrollContainer.removeEventListener('touchmove', preventScroll);
                    delete (scrollContainer as any).__tutorialScrollPrevent;
                }
            }
        };
    }, [run]);


    useEffect(() => {
        if (!mounted) return;

        const handleStartTutorial = () => {
            // Cerrar el DayOverlay si está abierto
            window.dispatchEvent(new Event('agendo:close-day-overlay'));
            
            // Si no estamos en el calendario, redirigir primero
            if (pathname !== '/calendario') {
                router.push('/calendario');
                // Esperar a que la navegación se complete antes de iniciar el tutorial
                setTimeout(() => {
                    setRun(true);
                    setStepIndex(0);
                }, 300);
            } else {
                // Esperar un poco para que el overlay se cierre antes de iniciar el tutorial
                setTimeout(() => {
                    setRun(true);
                    setStepIndex(0);
                }, 100);
            }
        };

        const handleOverlayOpened = () => {
            // Advance from 'Select Day' to 'Day Overlay Panorama'
            // El índice depende de si es móvil o no (después de filtrar)
            // Necesitamos verificar el índice real en filteredSteps
            setStepIndex((prev) => {
                // Buscar el índice del paso de seleccionar día en filteredSteps
                const selectDayStepIndex = filteredSteps.findIndex(step => step.target === '#tutorial-day-target');
                
                if (selectDayStepIndex !== -1 && prev === selectDayStepIndex) {
                    // Esperar a que el overlay esté completamente renderizado
                    setTimeout(() => {
                        scrollToTargetInOverlay('#tutorial-day-overlay-panorama', () => {
                            // Forzar recálculo del tooltip después del scroll
                            window.dispatchEvent(new Event('resize'));
                            window.dispatchEvent(new Event('scroll'));
                            // Buscar el índice del paso del panorama en filteredSteps
                            const panoramaStepIndex = filteredSteps.findIndex(step => step.target === '#tutorial-day-overlay-panorama');
                            if (panoramaStepIndex !== -1) {
                                setStepIndex(panoramaStepIndex);
                            }
                        });
                    }, 300);
                    return prev; // Mantener el índice actual mientras se procesa
                }
                return prev;
            });
        };


        window.addEventListener('agendo:start-tutorial', handleStartTutorial);
        window.addEventListener('agendo:day-overlay-opened', handleOverlayOpened);

        const isCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY);
        const isAuthPage = pathname.startsWith('/acceso') || pathname.startsWith('/register') || pathname.startsWith('/onboarding');

        let autoStartTimer: ReturnType<typeof setTimeout> | null = null;
        if (!isCompleted && !isAuthPage) {
            autoStartTimer = setTimeout(() => setRun(true), 1500);
        }

        return () => {
            if (autoStartTimer) {
                clearTimeout(autoStartTimer);
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            window.removeEventListener('agendo:start-tutorial', handleStartTutorial);
            window.removeEventListener('agendo:day-overlay-opened', handleOverlayOpened);
        };
    }, [pathname, mounted, router, isMobile, filteredSteps]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, index, action } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        
        // Verificar si el target existe antes de continuar
        const currentStep = filteredSteps[index];
        if (currentStep?.target && typeof currentStep.target === 'string' && currentStep.target !== 'body') {
            // Verificar si es un elemento dentro del overlay
            const isOverlayElement = currentStep.target.includes('tutorial-day-overlay') || 
                                   currentStep.target.includes('tutorial-add-') || 
                                   currentStep.target.includes('tutorial-notes');
            
            // Verificar si es el paso de seleccionar el día
            const isSelectDayStep = currentStep.target === '#tutorial-day-target';
            
            // Verificar si el overlay está abierto
            const overlay = document.querySelector('.day-overlay');
            const isOverlayOpen = overlay && window.getComputedStyle(overlay).display !== 'none';
            
            // Si es un elemento del overlay y el overlay no está abierto, no hacer nada (esperar)
            if (isOverlayElement && !isOverlayOpen) {
                // No avanzar, esperar a que el overlay se abra
                return;
            }
            
            // Para el paso de seleccionar el día, verificar que el elemento exista y si no, esperar y reintentar
            if (isSelectDayStep) {
                if (type === EVENTS.STEP_BEFORE) {
                    // Esperar un poco para que el DOM se actualice
                    setTimeout(() => {
                        const targetElement = document.querySelector('#tutorial-day-target');
                        if (targetElement) {
                            // Asegurarse de que el elemento esté visible
                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Forzar recálculo del tooltip
                            window.dispatchEvent(new Event('resize'));
                        } else {
                            // Si aún no existe, intentar de nuevo después de más tiempo
                            setTimeout(() => {
                                const retryElement = document.querySelector('#tutorial-day-target');
                                if (retryElement) {
                                    retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    window.dispatchEvent(new Event('resize'));
                                }
                            }, 500);
                        }
                    }, 100);
                } else if (type === EVENTS.TARGET_NOT_FOUND) {
                    // Si el target no se encuentra, esperar y reintentar
                    if (retryTimeoutRef.current) {
                        clearTimeout(retryTimeoutRef.current);
                    }
                    
                    retryTimeoutRef.current = setTimeout(() => {
                        const targetElement = document.querySelector('#tutorial-day-target');
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            window.dispatchEvent(new Event('resize'));
                            window.dispatchEvent(new Event('scroll'));
                        } else {
                            // Si después de esperar aún no existe, podría estar en otro mes
                            // Intentar hacer scroll al calendario y buscar el día
                            const calendarContainer = document.querySelector('.calendar-grid');
                            if (calendarContainer) {
                                calendarContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                // Reintentar después de un momento
                                setTimeout(() => {
                                    const retryElement = document.querySelector('#tutorial-day-target');
                                    if (retryElement) {
                                        retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        window.dispatchEvent(new Event('resize'));
                                    }
                                }, 500);
                            }
                        }
                    }, 300);
                    return;
                }
            }
            
            // Para elementos que no son del overlay y no es el paso de seleccionar día, verificar que existan
            if (!isOverlayElement && !isSelectDayStep) {
                const targetElement = document.querySelector(currentStep.target);
                if (!targetElement) {
                    // Si el elemento no existe y no es del overlay, saltar al siguiente paso
                    console.warn(`[Tutorial] Target not found: ${currentStep.target}, skipping step`);
                    if (action === 'next' || action === 'auto') {
                        setStepIndex(index + 1);
                    }
                    return;
                }
                
                // Verificar si el elemento está visible
                const rect = targetElement.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && 
                                window.getComputedStyle(targetElement).visibility !== 'hidden' &&
                                window.getComputedStyle(targetElement).display !== 'none';
                
                if (!isVisible) {
                    console.warn(`[Tutorial] Target not visible: ${currentStep.target}, skipping step`);
                    if (action === 'next' || action === 'auto') {
                        setStepIndex(index + 1);
                    }
                    return;
                }
            }
        }

        // Ajustar scroll para el paso del panorama
        // El índice del panorama es 4 en móvil, 3 en desktop (después de filtrar)
        const panoramaIndex = isMobile ? 4 : 3;
        if (type === EVENTS.STEP_BEFORE && index === panoramaIndex) {
            scrollToTargetInOverlay('#tutorial-day-overlay-panorama', () => {
                // Forzar recálculo del posicionamiento del tooltip después del scroll
                window.dispatchEvent(new Event('resize'));
            });
        }

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
        } else if (type === EVENTS.TARGET_NOT_FOUND) {
            // Verificar si es un elemento del overlay
            const currentStep = filteredSteps[index];
            const isOverlayElement = currentStep?.target && 
                                   typeof currentStep.target === 'string' &&
                                   (currentStep.target.includes('tutorial-day-overlay') || 
                                    currentStep.target.includes('tutorial-add-') || 
                                    currentStep.target.includes('tutorial-notes'));
            
            // Si es un elemento del overlay, esperar y reintentar
            if (isOverlayElement) {
                // Verificar si el overlay está abierto
                const overlay = document.querySelector('.day-overlay');
                const isOverlayOpen = overlay && window.getComputedStyle(overlay).display !== 'none';
                
                if (!isOverlayOpen) {
                    // Esperar a que el overlay se abra
                    return;
                }
                
                // Si el overlay está abierto pero el elemento no se encuentra, esperar un poco y reintentar
                if (retryTimeoutRef.current) {
                    clearTimeout(retryTimeoutRef.current);
                }
                
                retryTimeoutRef.current = setTimeout(() => {
                    const targetElement = document.querySelector(currentStep.target as string);
                    if (targetElement) {
                        // El elemento ahora existe, forzar un update del tooltip
                        window.dispatchEvent(new Event('resize'));
                        window.dispatchEvent(new Event('scroll'));
                    } else {
                        // Si después de esperar aún no existe, saltar al siguiente paso
                        const nextStepIndex = Math.min(index + 1, filteredSteps.length - 1);
                        if (nextStepIndex > index) {
                            setStepIndex(nextStepIndex);
                        } else {
                            setRun(false);
                        }
                    }
                }, 500);
                
                return;
            }
            
            // Si el target no se encontró y no es del overlay, saltar al siguiente paso
            const nextStepIndex = Math.min(index + 1, filteredSteps.length - 1);
            if (nextStepIndex > index) {
                setStepIndex(nextStepIndex);
            } else {
                // Si no hay más pasos, finalizar el tutorial
                setRun(false);
            }
            return;
        } else if (type === EVENTS.STEP_AFTER) {
            // Update state to advance the tour
            const nextStepIndex = index + (action === 'prev' ? -1 : 1);

            // Prevent auto-advance if we are on the "Select Day" step
            // Buscar el índice real del paso de seleccionar día en filteredSteps
            const currentStep = filteredSteps[index];
            const isSelectDayStep = currentStep?.target === '#tutorial-day-target';
            
            if (isSelectDayStep && action !== 'prev' && type !== EVENTS.TARGET_NOT_FOUND) {
                // Cuando se hace clic en el día, esperar a que el overlay se abra
                // Verificar periódicamente si el overlay se abrió
                let checkCount = 0;
                const maxChecks = 20; // Verificar por hasta 2 segundos (20 * 100ms)
                
                const checkOverlay = () => {
                    const overlay = document.querySelector('.day-overlay');
                    const isOverlayOpen = overlay && window.getComputedStyle(overlay).display !== 'none';
                    
                    if (isOverlayOpen) {
                        // El overlay está abierto, avanzar al siguiente paso
                        const panoramaStepIndex = filteredSteps.findIndex(step => step.target === '#tutorial-day-overlay-panorama');
                        if (panoramaStepIndex !== -1) {
                            setTimeout(() => {
                                scrollToTargetInOverlay('#tutorial-day-overlay-panorama', () => {
                                    window.dispatchEvent(new Event('resize'));
                                    window.dispatchEvent(new Event('scroll'));
                                    setStepIndex(panoramaStepIndex);
                                });
                            }, 300);
                        }
                    } else if (checkCount < maxChecks) {
                        // Seguir verificando
                        checkCount++;
                        setTimeout(checkOverlay, 100);
                    }
                };
                
                // Iniciar verificación después de un pequeño delay
                setTimeout(checkOverlay, 100);
                
                return;
            } else {
                setStepIndex(nextStepIndex);
                
                // Hacer scroll automático a la sección correspondiente dentro del overlay
                // Los índices de los pasos dentro del overlay son: panorama (4 en móvil, 3 en desktop), bloques (5/4), tareas (6/5), notas (7/6)
                const overlayStartIndex = isMobile ? 4 : 3;
                const overlayEndIndex = isMobile ? 7 : 6;
                if (nextStepIndex >= overlayStartIndex && nextStepIndex <= overlayEndIndex) {
                    const nextStep = filteredSteps[nextStepIndex];
                    if (nextStep?.target) {
                        setTimeout(() => {
                            const targetSelector = typeof nextStep.target === 'string' 
                                ? nextStep.target 
                                : undefined;
                            if (targetSelector && (
                                targetSelector === '#tutorial-day-overlay-panorama' ||
                                targetSelector === '#tutorial-add-block' ||
                                targetSelector === '#tutorial-add-task' ||
                                targetSelector === '#tutorial-notes'
                            )) {
                                scrollToTargetInOverlay(targetSelector, () => {
                                    // Forzar recálculo del posicionamiento del tooltip
                                    window.dispatchEvent(new Event('resize'));
                                });
                            }
                        }, 300);
                    }
                }
            }
        } else if (type === EVENTS.STEP_BEFORE) {
            // Cuando se va a mostrar un paso, hacer scroll si está dentro del overlay
            const currentStep = steps[index];
            if (currentStep?.target) {
                const targetSelector = typeof currentStep.target === 'string' 
                    ? currentStep.target 
                    : undefined;
                if (targetSelector && (
                    targetSelector === '#tutorial-day-overlay-panorama' ||
                    targetSelector === '#tutorial-add-block' ||
                    targetSelector === '#tutorial-add-task' ||
                    targetSelector === '#tutorial-notes'
                )) {
                    // Hacer scroll y luego forzar actualización del tooltip
                    scrollToTargetInOverlay(targetSelector, () => {
                        // Forzar recálculo del posicionamiento del tooltip
                        window.dispatchEvent(new Event('resize'));
                    });
                }
            }
        }
    };

    const scrollToTargetInOverlay = (targetSelector: string, callback?: () => void) => {
        const target = document.querySelector(targetSelector);
        const scrollContainer = document.querySelector('.day-pane__scroll') as HTMLElement;
        
        if (target && scrollContainer) {
            // Desbloquear temporalmente el scroll para hacer el movimiento
            const preventScroll = (scrollContainer as any).__tutorialScrollPrevent;
            if (preventScroll) {
                scrollContainer.removeEventListener('wheel', preventScroll);
                scrollContainer.removeEventListener('touchmove', preventScroll);
            }
            
            scrollContainer.style.overflow = 'auto';
            
            // Calcular la posición del elemento dentro del contenedor
            const targetRect = target.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop;
            const targetTop = targetRect.top - containerRect.top + scrollTop;
            
            // Hacer scroll con un offset para que el elemento quede bien visible
            // Ajustar offset según si es móvil o no
            const isMobile = window.innerWidth < 768;
            let offset = isMobile ? 80 : 100;
            if (targetSelector === '#tutorial-day-overlay-panorama') {
                offset = isMobile ? 150 : 200; // Espacio para el panorama
            } else if (targetSelector === '#tutorial-add-block' || targetSelector === '#tutorial-add-task' || targetSelector === '#tutorial-notes') {
                offset = isMobile ? 150 : 200; // Más espacio para elementos con placement: top
            }
            
            const targetScrollTop = Math.max(0, targetTop - offset);
            
            // Hacer scroll instantáneo primero para calcular mejor la posición
            scrollContainer.scrollTop = targetScrollTop;
            
            // Luego hacer scroll suave
            scrollContainer.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth',
            });
            
            // Esperar a que el scroll termine antes de continuar
            let scrollCheckCount = 0;
            const maxChecks = 60; // Máximo 1 segundo (60 frames a ~16ms cada uno)
            
            const checkScrollComplete = () => {
                scrollCheckCount++;
                const currentScroll = scrollContainer.scrollTop;
                const diff = Math.abs(currentScroll - targetScrollTop);
                
                if (diff < 2 || scrollCheckCount >= maxChecks) {
                    // Scroll completado o timeout
                    scrollContainer.style.overflow = 'hidden';
                    if (preventScroll) {
                        scrollContainer.addEventListener('wheel', preventScroll, { passive: false });
                        scrollContainer.addEventListener('touchmove', preventScroll, { passive: false });
                    }
                    // Forzar múltiples recálculos del tooltip después del scroll
                    if (callback) {
                        // Disparar múltiples eventos para asegurar que Joyride recalcule
                        setTimeout(() => {
                            window.dispatchEvent(new Event('resize'));
                            window.dispatchEvent(new Event('scroll'));
                            if (callback) callback();
                        }, 150);
                    }
                } else {
                    // Seguir verificando
                    requestAnimationFrame(checkScrollComplete);
                }
            };
            
            // Iniciar verificación después de un pequeño delay
            setTimeout(() => {
                checkScrollComplete();
            }, 50);
        } else if (callback) {
            callback();
        }
    };

    if (!mounted) return null;

    return (
        <Joyride
            steps={filteredSteps}
            run={run}
            stepIndex={stepIndex}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            tooltipComponent={CustomTooltip}
            scrollToFirstStep={false}
            disableScrollParentFix={false}
            floaterProps={{
                disableAnimation: false,
                options: {
                    offset: isMobile ? 10 : 20,
                    placement: 'auto',
                },
                styles: {
                    floater: {
                        position: 'fixed',
                        zIndex: 13000, // Por encima del DayOverlay que tiene z-index 1200
                        pointerEvents: 'auto',
                    },
                },
            }}
            disableOverlayClose={false}
            hideCloseButton={false}
            styles={{
                options: {
                    zIndex: 13000,
                },
                overlay: {
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 12999,
                },
                tooltip: {
                    zIndex: 13000,
                    pointerEvents: 'auto',
                },
                tooltipContainer: {
                    zIndex: 13000,
                    pointerEvents: 'auto',
                },
                buttonNext: {
                    pointerEvents: 'auto',
                    touchAction: 'manipulation',
                    zIndex: 13001,
                },
                buttonBack: {
                    pointerEvents: 'auto',
                    touchAction: 'manipulation',
                    zIndex: 13001,
                },
                buttonSkip: {
                    pointerEvents: 'auto',
                    touchAction: 'manipulation',
                    zIndex: 13001,
                },
            }}
        />
    );
}
