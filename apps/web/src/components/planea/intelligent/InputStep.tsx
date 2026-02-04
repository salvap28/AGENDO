'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

type InputStepProps = {
  onSubmit: (text: string) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
  initialText?: string;
};

export default function InputStep({ onSubmit, onCancel, loading, error, initialText }: InputStepProps) {
  const [text, setText] = useState(initialText || '');
  
  // Actualizar el texto cuando cambia initialText
  useEffect(() => {
    if (initialText !== undefined) {
      setText(initialText);
    }
  }, [initialText]);
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const gradientIdRef = useRef(`waveGradient-${Math.random().toString(36).substr(2, 9)}`);
  const glowIdRef = useRef(`glow-${Math.random().toString(36).substr(2, 9)}`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !loading) {
      onSubmit(text.trim());
    }
  };

  const [audioData, setAudioData] = useState<number[]>(Array(64).fill(0));
  const previousDataRef = useRef<number[]>(Array(64).fill(0));

  // Visualización de audio en tiempo real
  useEffect(() => {
    if (!isRecording || !analyserRef.current) return;

    const analyser = analyserRef.current;
    analyser.fftSize = 512; // Aumentar resolución para más datos
    analyser.smoothingTimeConstant = 0.3; // Suavizado más rápido
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Obtener más datos de frecuencia para visualización más detallada
      const rawFrequencyData = Array.from(dataArray);
      
      // Reducir a 64 puntos pero mantener más información
      const numPoints = 64;
      const step = Math.floor(rawFrequencyData.length / numPoints);
      const frequencyData: number[] = [];
      
      for (let i = 0; i < numPoints; i++) {
        const start = i * step;
        const end = Math.min(start + step, rawFrequencyData.length);
        const slice = rawFrequencyData.slice(start, end);
        const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
        
        // Suavizado con datos anteriores para fluidez
        const previous = previousDataRef.current[i] || 0;
        const smoothed = previous * 0.3 + avg * 0.7; // Interpolación suave
        frequencyData.push(smoothed);
      }
      
      previousDataRef.current = frequencyData;
      setAudioData(frequencyData);
      
      // Calcular nivel promedio para efectos
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average / 255); // Normalizar a 0-1
      
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  const handleRecordAudio = async () => {
    try {
      setIsRequestingPermission(true);
      setPermissionError(null);

      // Solicitar permiso para acceder al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Configurar AudioContext para visualización
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Iniciar reconocimiento de voz (Web Speech API)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error('Tu navegador no soporta reconocimiento de voz. Por favor, usá Chrome o Edge.');
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-AR';

      let interimTranscript = '';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript = transcript;
          }
        }

        if (finalTranscript) {
          setText((prev) => (prev + finalTranscript).trim());
          interimTranscript = '';
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Error en reconocimiento de voz:', event.error);
        if (event.error === 'no-speech') {
          // No es un error crítico, solo no hay habla
          return;
        }
        setPermissionError(`Error en reconocimiento de voz: ${event.error}`);
      };

      recognition.onend = () => {
        if (isRecording) {
          // Reiniciar reconocimiento si aún estamos grabando
          try {
            recognition.start();
          } catch (e) {
            console.error('Error reiniciando reconocimiento:', e);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Crear MediaRecorder para backup
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Detener reconocimiento
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }

        // Detener todas las pistas del stream
        stream.getTracks().forEach(track => track.stop());
        
        // Cerrar AudioContext solo si no está cerrado
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          try {
            await audioContextRef.current.close();
          } catch (e) {
            console.warn('Error cerrando AudioContext:', e);
          }
          audioContextRef.current = null;
        }
        analyserRef.current = null;

        setIsRecording(false);
        setIsTranscribing(false);
        setAudioLevel(0);
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        streamRef.current = null;
      };

      // Permiso concedido, iniciar grabación
      setIsRequestingPermission(false);
      setIsRecording(true);
      setIsTranscribing(true);

      // Iniciar grabación
      mediaRecorder.start(1000); // Capturar datos cada segundo
    } catch (error: any) {
      console.error('Error accediendo al micrófono:', error);
      setIsRequestingPermission(false);
      setIsRecording(false);
      setIsTranscribing(false);
      setAudioLevel(0);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Permiso de micrófono denegado. Por favor, permití el acceso al micrófono en la configuración del navegador.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setPermissionError('No se encontró ningún micrófono. Verificá que tengas un micrófono conectado.');
      } else if (error.message?.includes('reconocimiento de voz')) {
        setPermissionError(error.message);
      } else {
        setPermissionError('Error al acceder al micrófono. Por favor, intentá de nuevo.');
      }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Función para generar path de onda SVG suave y fluida
  const generateWavePath = (data: number[], height: number, isTop: boolean): string => {
    if (data.length === 0 || data.every(v => v === 0)) {
      const centerY = height / 2;
      return `M 0 ${centerY} L 400 ${centerY}`;
    }

    const width = 400;
    const numPoints = data.length;
    const step = width / (numPoints - 1);
    const centerY = height / 2;
    const baseAmplitude = height * 0.4;
    const dynamicAmplitude = baseAmplitude * (0.7 + audioLevel * 0.3); // Amplitud dinámica

    // Aplicar suavizado adicional con promedio móvil
    const smoothedData = data.map((value, i) => {
      if (i === 0) return (value + data[1]) / 2;
      if (i === numPoints - 1) return (data[i - 1] + value) / 2;
      return (data[i - 1] * 0.2 + value * 0.6 + data[i + 1] * 0.2);
    });

    // Generar puntos con interpolación cúbica para máxima fluidez
    let path = '';
    const points: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < smoothedData.length; i++) {
      const x = i * step;
      const normalizedValue = Math.min(1, Math.max(0, smoothedData[i] / 255));
      const y = isTop
        ? centerY - (normalizedValue * dynamicAmplitude)
        : centerY + (normalizedValue * dynamicAmplitude);
      points.push({ x, y });
    }

    // Construir path con curvas de Bézier cúbicas para máxima fluidez
    if (points.length > 0) {
      path += `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[Math.min(i + 1, points.length - 1)];
        
        // Calcular puntos de control para curva suave
        const cp1x = prev.x + (curr.x - prev.x) / 3;
        const cp1y = prev.y;
        const cp2x = curr.x - (next.x - curr.x) / 3;
        const cp2y = curr.y;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }
    }

    return path;
  };

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.warn('Error cerrando AudioContext en cleanup:', e);
        }
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="intelligent-step"
    >
      <div className="intelligent-step__header">
        <h2 className="intelligent-step__title">Planeación inteligente</h2>
        <p className="intelligent-step__subtitle">
          Escribí o decime todo lo que querés hacer hoy o en los próximos días, sin orden.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="intelligent-step__form">
        <div className="intelligent-input-container">
          <div className="intelligent-input-wrapper">
            <textarea
              className="intelligent-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ejemplo: Necesito estudiar Análisis Matemático mañana por la tarde, hacer ejercicio el viernes, y preparar la presentación del trabajo para el lunes..."
              rows={8}
              disabled={loading}
              autoFocus
            />
            {isRecording && (
              <div className="audio-visualizer">
                <div className="audio-visualizer__wave-container">
                  <svg
                    className="audio-visualizer__wave"
                    viewBox="0 0 400 100"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id={gradientIdRef.current} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(123, 108, 255, 0.9)" />
                        <stop offset="50%" stopColor="rgba(86, 225, 233, 0.9)" />
                        <stop offset="100%" stopColor="rgba(123, 108, 255, 0.9)" />
                      </linearGradient>
                      <filter id={glowIdRef.current}>
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Onda superior */}
                    <path
                      className="audio-visualizer__wave-path audio-visualizer__wave-path--top"
                      d={generateWavePath(audioData, 100, true)}
                      fill="none"
                      stroke={`url(#${gradientIdRef.current})`}
                      strokeWidth="2.5"
                      filter={`url(#${glowIdRef.current})`}
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Onda inferior (reflejo) */}
                    <path
                      className="audio-visualizer__wave-path audio-visualizer__wave-path--bottom"
                      d={generateWavePath(audioData, 100, false)}
                      fill="none"
                      stroke={`url(#${gradientIdRef.current})`}
                      strokeWidth="2"
                      strokeOpacity="0.5"
                      filter={`url(#${glowIdRef.current})`}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
                <div className="audio-visualizer__bars">
                  {(audioData.length > 0 ? audioData.slice(0, 32) : Array(32).fill(0)).map((value, i) => {
                    const height = Math.max(4, (value / 255) * 50);
                    return (
                      <div
                        key={i}
                        className="audio-visualizer__bar"
                        style={{
                          height: `${height}px`,
                          animationDelay: `${i * 25}ms`,
                          opacity: 0.6 + (value / 255) * 0.4,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="audio-visualizer__label">
                  <span className="recording-indicator" />
                  Escuchando...
                </div>
              </div>
            )}
          </div>
          <div className="intelligent-input-actions">
            {!isRecording ? (
              <button
                type="button"
                className="intelligent-input__audio-btn"
                onClick={handleRecordAudio}
                disabled={loading || isRequestingPermission}
              >
                {isRequestingPermission ? (
                  <>
                    <span className="recording-indicator" />
                    Solicitando permiso...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Grabar audio
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="intelligent-input__audio-btn intelligent-input__audio-btn--stop"
                onClick={handleStopRecording}
                disabled={loading}
              >
                <span className="recording-indicator" />
                Detener grabación
              </button>
            )}
          </div>
        </div>

        {permissionError && (
          <div className="intelligent-step__error">
            {permissionError}
          </div>
        )}

        {error && (
          <div className="intelligent-step__error">
            {error}
          </div>
        )}

        <div className="intelligent-step__footer">
          <button
            type="button"
            className="day-form-modal__btn day-form-modal__btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="day-form-modal__btn day-form-modal__btn--primary"
            disabled={!text.trim() || loading}
          >
            {loading ? 'Procesando...' : 'Organizame esto'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

