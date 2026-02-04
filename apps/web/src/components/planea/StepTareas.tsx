'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlanStore } from '@/stores/planStore';
import api from '@/lib/api';

type Task = {
  id: string;
  title: string;
  done: boolean;
  date: string;
  priority?: string | null;
};

type CustomTask = {
  id: string;
  title: string;
  isCustom: true;
  priority: 'alta' | 'media' | 'baja';
};

export default function StepTareas() {
  const { tareasImportantes, setTareasImportantes, tareasPersonalizadas, setTareasPersonalizadas } = usePlanStore();
  const [tareas, setTareas] = useState<Task[]>([]);
  const [customTareas, setCustomTareas] = useState<CustomTask[]>(tareasPersonalizadas);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'alta' | 'media' | 'baja'>('media');

  // Sincronizar customTareas con el store
  useEffect(() => {
    setTareasPersonalizadas(customTareas);
  }, [customTareas, setTareasPersonalizadas]);

  useEffect(() => {
    async function loadTareas() {
      try {
        const hoy = new Date().toISOString().split('T')[0];
        const res = await api.get<{ items: Task[] }>('/tasks', {
          params: { from: hoy, to: hoy },
        });
        const tareasPendientes = res.data.items.filter((t) => !t.done);
        setTareas(tareasPendientes);
      } catch (error) {
        console.error('Error cargando tareas:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTareas();
  }, []);

  const toggleTarea = (id: string) => {
    if (tareasImportantes.includes(id)) {
      setTareasImportantes(tareasImportantes.filter((t) => t !== id));
    } else {
      setTareasImportantes([...tareasImportantes, id]);
    }
  };

  const handleAddCustomTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: CustomTask = {
      id: `custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      isCustom: true,
      priority: newTaskPriority,
    };

    setCustomTareas([...customTareas, newTask]);
    setTareasImportantes([...tareasImportantes, newTask.id]);
    setNewTaskTitle('');
    setNewTaskPriority('media');
    setShowAddForm(false);
  };

  const handleRemoveCustomTask = (id: string) => {
    setCustomTareas(customTareas.filter((t) => t.id !== id));
    setTareasImportantes(tareasImportantes.filter((t) => t !== id));
  };

  const allTareas = [...tareas, ...customTareas];

  if (loading) {
    return (
      <div className="plan-step">
        <h2 className="plan-step-title">Cargando tareas...</h2>
      </div>
    );
  }

  return (
    <div className="plan-step">
      <h2 className="plan-step-title">¿Qué tareas querés hacer hoy?</h2>
      <p className="plan-step-subtitle">Seleccioná tareas existentes o agregá nuevas</p>

      {/* Botón para agregar nueva tarea */}
      <motion.button
        type="button"
        className="plan-add-task-btn"
        onClick={() => setShowAddForm(!showAddForm)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="plan-add-task-icon">+</span>
        Agregar nueva tarea
      </motion.button>

      {/* Formulario para agregar tarea */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="plan-add-task-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              type="text"
              className="plan-add-task-input"
              placeholder="Título de la tarea..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomTask();
                } else if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewTaskTitle('');
                }
              }}
              autoFocus
            />
            <div className="plan-add-task-priority">
              <label>Prioridad:</label>
              <div className="plan-priority-buttons">
                {(['alta', 'media', 'baja'] as const).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    className={`plan-priority-btn ${newTaskPriority === priority ? 'is-active' : ''}`}
                    onClick={() => setNewTaskPriority(priority)}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
            <div className="plan-add-task-actions">
              <button
                type="button"
                className="plan-btn plan-btn--secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTaskTitle('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="plan-btn plan-btn--primary"
                onClick={handleAddCustomTask}
                disabled={!newTaskTitle.trim()}
              >
                Agregar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de tareas */}
      {allTareas.length === 0 ? (
        <div className="plan-no-tasks">
          <p>No hay tareas. Agregá una nueva tarea para empezar.</p>
        </div>
      ) : (
        <div className="plan-tasks-list">
          {allTareas.map((tarea) => {
            const isSelected = tareasImportantes.includes(tarea.id);
            const isCustom = 'isCustom' in tarea && tarea.isCustom;
            return (
              <motion.div
                key={tarea.id}
                className={`plan-task-item ${isSelected ? 'is-selected' : ''} ${isCustom ? 'is-custom' : ''}`}
                whileHover={{ scale: 1.01 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  type="button"
                  className="plan-task-content"
                  onClick={() => toggleTarea(tarea.id)}
                >
                  <div className="plan-task-checkbox">
                    {isSelected && <span className="plan-task-check">✓</span>}
                  </div>
                  <span className="plan-task-title">{tarea.title}</span>
                  {tarea.priority && (
                    <span className={`plan-task-priority priority-${tarea.priority}`}>
                      {tarea.priority}
                    </span>
                  )}
                </button>
                {isCustom && (
                  <button
                    type="button"
                    className="plan-task-remove"
                    onClick={() => handleRemoveCustomTask(tarea.id)}
                    aria-label="Eliminar tarea"
                  >
                    ×
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {tareasImportantes.length > 0 && (
        <p className="plan-step-hint">
          {tareasImportantes.length} tarea{tareasImportantes.length > 1 ? 's' : ''} seleccionada{tareasImportantes.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

