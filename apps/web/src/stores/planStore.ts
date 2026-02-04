import { create } from 'zustand';

export type Energia = 'baja' | 'media' | 'alta';
export type TiempoDisponible = 'mañana' | 'tarde' | 'noche' | 'todo-el-dia' | 'parcial';
export type Intensidad = 'liviana' | 'balanceada' | 'intensa';

export type PlanWizardState = {
  // Paso 1: Energía
  energia: Energia | null;
  
  // Paso 2: Foco
  foco: string | null;
  
  // Paso 3: Tiempo disponible
  tiempoDisponible: TiempoDisponible | null;
  tiempoParcialDesde?: string;
  tiempoParcialHasta?: string;
  
  // Paso 4: Intensidad
  intensidad: Intensidad | null;
  
  // Paso 5: Tareas importantes
  tareasImportantes: string[]; // IDs de tareas
  tareasPersonalizadas: Array<{
    id: string;
    title: string;
    priority: 'alta' | 'media' | 'baja';
  }>; // Tareas creadas en el wizard
  
  // Paso 6: Descansos
  incluirDescansos: boolean;
  
  // Paso 7: Aclaración final
  aclaracionFinal: string;
  
  // Paso 8: Notificaciones
  quiereNotificaciones: boolean;
  cantidadNotificaciones: number;
  tiemposNotificaciones: number[]; // Array de minutos antes (ej: [15, 5] = 15 min y 5 min antes)
  
  // Fecha seleccionada para planear
  fechaSeleccionada: string | null;
  
  // Bloques existentes que el usuario quiere mantener
  bloquesExistentes: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    color?: string;
  }> | null;
  
  // Estado del wizard
  currentStep: number;
  totalSteps: number;
  
  // Plan generado
  planGenerado: PlanGenerado | null;
  
  // Estados de carga/error
  isLoading: boolean;
  error: string | null;
};

export type PlanGenerado = {
  bloques: BloqueGenerado[];
  tareasAsignadas: TareaAsignada[];
  descansos: DescansoGenerado[];
  recomendaciones: string[];
  explicacion: string;
  resumen: string;
};

export type BloqueGenerado = {
  id: string;
  titulo: string;
  inicio: string; // HH:mm
  fin: string; // HH:mm
  foco: string;
  color?: string;
  tareas: string[]; // IDs de tareas asignadas
  descripcion?: string;
};

export type TareaAsignada = {
  id: string;
  titulo: string;
  bloqueId: string;
  prioridad: 'alta' | 'media' | 'baja';
};

export type DescansoGenerado = {
  inicio: string; // HH:mm
  fin: string; // HH:mm
  tipo: 'corto' | 'largo';
  descripcion?: string;
};

type PlanWizardActions = {
  setEnergia: (energia: Energia) => void;
  setFoco: (foco: string) => void;
  setTiempoDisponible: (tiempo: TiempoDisponible, desde?: string, hasta?: string) => void;
  setIntensidad: (intensidad: Intensidad) => void;
  setTareasImportantes: (tareas: string[]) => void;
  setTareasPersonalizadas: (tareas: Array<{ id: string; title: string; priority: 'alta' | 'media' | 'baja' }>) => void;
  setIncluirDescansos: (incluir: boolean) => void;
  setAclaracionFinal: (texto: string) => void;
  setQuiereNotificaciones: (quiere: boolean) => void;
  setCantidadNotificaciones: (cantidad: number) => void;
  setTiemposNotificaciones: (tiempos: number[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  setPlanGenerado: (plan: PlanGenerado) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFechaSeleccionada: (fecha: string | null) => void;
  setBloquesExistentes: (bloques: Array<{ id: string; title: string; start: string; end: string; color?: string }> | null) => void;
  reset: () => void;
};

const initialState: PlanWizardState = {
  energia: null,
  foco: null,
  tiempoDisponible: null,
  tiempoParcialDesde: undefined,
  tiempoParcialHasta: undefined,
  intensidad: null,
  tareasImportantes: [],
  tareasPersonalizadas: [],
  incluirDescansos: true,
  aclaracionFinal: '',
  quiereNotificaciones: false,
  cantidadNotificaciones: 0,
  tiemposNotificaciones: [],
  fechaSeleccionada: null,
  bloquesExistentes: null,
  currentStep: 1,
  totalSteps: 8,
  planGenerado: null,
  isLoading: false,
  error: null,
};

export const usePlanStore = create<PlanWizardState & PlanWizardActions>((set) => ({
  ...initialState,
  
  setEnergia: (energia) => set({ energia }),
  setFoco: (foco) => set({ foco }),
  setTiempoDisponible: (tiempo, desde, hasta) => 
    set({ tiempoDisponible: tiempo, tiempoParcialDesde: desde, tiempoParcialHasta: hasta }),
  setIntensidad: (intensidad) => set({ intensidad }),
  setTareasImportantes: (tareas) => set({ tareasImportantes: tareas }),
  setTareasPersonalizadas: (tareas) => set({ tareasPersonalizadas: tareas }),
  setIncluirDescansos: (incluir) => set({ incluirDescansos: incluir }),
  setAclaracionFinal: (texto) => set({ aclaracionFinal: texto }),
  setQuiereNotificaciones: (quiere) => set({ quiereNotificaciones: quiere }),
  setCantidadNotificaciones: (cantidad) => set({ cantidadNotificaciones: cantidad }),
  setTiemposNotificaciones: (tiempos) => set({ tiemposNotificaciones: tiempos }),
  nextStep: () => set((state) => ({ 
    currentStep: Math.min(state.currentStep + 1, state.totalSteps) 
  })),
  prevStep: () => set((state) => ({ 
    currentStep: Math.max(state.currentStep - 1, 1) 
  })),
  goToStep: (step) => set({ currentStep: step }),
  setPlanGenerado: (plan) => set({ planGenerado: plan }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setFechaSeleccionada: (fecha) => set({ fechaSeleccionada: fecha }),
  setBloquesExistentes: (bloques) => set({ bloquesExistentes: bloques }),
  reset: () => set(initialState),
}));

