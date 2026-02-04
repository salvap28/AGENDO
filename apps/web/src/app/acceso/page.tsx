'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchOnboardingState } from '@/lib/api/onboarding';

type AuthMode = 'login' | 'register';

interface FormState {
  name: string;
  email: string;
  password: string;
}

const parseApiError = (data: any, fallback: string) => {
  const translate = (msg: string) => {
    if (/at least 6 character/i.test(msg)) return 'Tu contrasena necesita al menos 6 caracteres. Probemos con una mas larga.';
    if (/Invalid email/i.test(msg)) return 'Revisa el formato del email para seguir.';
    return `No pudimos crear la cuenta: ${msg}`;
  };

  if (!data) return fallback;
  if (typeof data === 'string') return translate(data);
  if (typeof data?.error === 'string') return translate(data.error);
  if (typeof data?.message === 'string') return translate(data.message);

  const zodError = data?.error;
  const formError = zodError?.formErrors?.[0];
  if (typeof formError === 'string') return translate(formError);
  const fieldErrors = zodError?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const values = Object.values(fieldErrors);
    const firstArr = Array.isArray(values[0]) ? values[0] : [];
    const first = firstArr?.[0];
    if (typeof first === 'string') return translate(first);
  }
  return fallback;
};

const CTA_COPY: Record<AuthMode, { title: string; helper: string }> = {
  login: {
    title: 'Bienvenido de nuevo',
    helper: 'Retoma tus bloques y continua donde lo dejaste.',
  },
  register: {
    title: 'Crea tu cuenta',
    helper: 'Organiza tus dias con el flujo de trabajo de Agendo.',
  },
};

export default function AccesoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#05050b] text-white/70">
          Cargando acceso...
        </main>
      }
    >
      <AccesoContent />
    </Suspense>
  );
}

function AccesoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isRegister = mode === 'register';

  useEffect(() => {
    try {
      document.body.classList.remove('no-scroll-home');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 700px)') : null;
    const update = () => setIsMobile(Boolean(mq?.matches));
    update();
    mq?.addEventListener('change', update);
    return () => mq?.removeEventListener('change', update);
  }, []);

  const updateField = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    if (!form.email || !form.password || (isRegister && !form.name)) {
      setMessage('Completa todos los campos requeridos.');
      return;
    }

    setBusy(true);
    setMessage(isRegister ? 'Creando tu cuenta...' : 'Iniciando sesion...');

    try {
      if (isRegister) {
        const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            name: form.name.trim(),
          }),
        });
        const registerData = await registerResponse.json();
        if (!registerResponse.ok) {
          throw new Error(parseApiError(registerData, 'No pudimos crear la cuenta'));
        }
      }

      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const loginData = await loginResponse.json();
      if (!loginResponse.ok) {
        throw new Error(parseApiError(loginData, 'No pudimos iniciar sesion'));
      }

      const token = loginData.token as string;
      localStorage.setItem('agendo_token', token);
      await refresh();

      let shouldGoToOnboarding = false;
      try {
        const onboarding = await fetchOnboardingState(token);
        shouldGoToOnboarding = !onboarding.completed;
      } catch {
        /* ignore */
      }

      const redirectParam = searchParams.get('from') ?? '/';
      const redirectTarget = (() => {
        try {
          const decoded = decodeURIComponent(redirectParam);
          return decoded.startsWith('/') ? decoded : '/';
        } catch {
          return '/';
        }
      })();

      setMessage('Listo. Redirigiendo...');
      router.replace(shouldGoToOnboarding ? '/onboarding' : redirectTarget);
    } catch (err) {
      const friendly =
        err instanceof TypeError
          ? 'No pudimos conectar con el servidor. Revisa tu conexion o la URL de la API.'
          : err instanceof Error
          ? err.message
          : 'Intentalo mas tarde';
      setMessage(`Error: ${friendly}`);
    } finally {
      setBusy(false);
    }
  };

  const handleModeClick = (item: AuthMode) => {
    setMode(item);
    setMessage('');
    setShowPassword(false);
    if (isMobile) setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setMessage('');
    setShowPassword(false);
  };

  const formElement = useMemo(
    () => (
      <form onSubmit={submit} className="auth-form">
        {isRegister && (
          <div className="auth-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={updateField('name')}
              className="auth-input"
              placeholder="Tu nombre completo"
            />
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={updateField('email')}
            className="auth-input"
            placeholder="nombre@ejemplo.com"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">Contrasena</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={updateField('password')}
              className="auth-input"
              placeholder="******"
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </div>

        <button type="submit" disabled={busy} className="auth-submit">
          {busy ? (mode === 'login' ? 'Entrando...' : 'Creando...') : mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
        </button>
      </form>
    ),
    [busy, form.email, form.name, form.password, isRegister, mode, showPassword],
  );

  return (
    <main className="auth-shell app-bg">
      <div className="auth-ambient" aria-hidden />
      <div className="auth-wrapper">
        <section className="auth-hero">
          <p className="auth-eyebrow">Agendo</p>
          <h1 className="auth-title">Tu espacio para planificar con calma.</h1>
          <p className="auth-body">
            Crea bloques, organiza semanas y recopila metricas para mantener el foco sin perder el equilibrio.
          </p>
          <div className="auth-toggle-group">
            {(['login', 'register'] as AuthMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleModeClick(item)}
                className={clsx('auth-toggle', mode === item && 'is-active')}
              >
                {item === 'login' ? 'Ya tengo cuenta' : 'Quiero registrarme'}
              </button>
            ))}
          </div>
        </section>

        {!isMobile && (
          <section className="auth-panel glass-panel">
            <header className="auth-panel__header">
              <p className="auth-eyebrow">{mode === 'login' ? 'Ingreso' : 'Registro'}</p>
              <h2 className="auth-panel__title">{CTA_COPY[mode].title}</h2>
              <p className="auth-panel__helper">{CTA_COPY[mode].helper}</p>
            </header>
            {formElement}
            {message ? <p className="auth-message">{message}</p> : null}
          </section>
        )}
      </div>

      {isMobile && showModal ? (
        <div className="auth-modal" role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Ingreso' : 'Registro'}>
          <div className="auth-modal__backdrop" onClick={closeModal} />
          <div className="auth-modal__panel">
            <header className="auth-panel__header">
              <p className="auth-eyebrow">{mode === 'login' ? 'Ingreso' : 'Registro'}</p>
              <h2 className="auth-panel__title">{CTA_COPY[mode].title}</h2>
              <p className="auth-panel__helper">{CTA_COPY[mode].helper}</p>
            </header>
            {formElement}
            {message ? <p className="auth-message">{message}</p> : null}
            <button type="button" className="auth-close" onClick={closeModal} aria-label="Cerrar formulario">
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
