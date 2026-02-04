import type { CSSProperties } from 'react';

export default function NotFound() {
  const gradientBg =
    'radial-gradient(circle at 20% 20%, rgba(86,225,233,0.18), transparent 32%), radial-gradient(circle at 80% 0%, rgba(123,108,255,0.25), transparent 34%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.05), transparent 40%), linear-gradient(135deg, rgba(10,12,26,0.98) 0%, rgba(5,6,16,0.92) 100%)';
  const panelStyle: CSSProperties = {
    background: 'rgba(12,14,32,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 30px 120px rgba(0,0,0,0.55)',
    backdropFilter: 'blur(18px)',
    maxWidth: '560px',
    width: 'min(90vw, 640px)',
  };

  return (
    <main
      className="not-found"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 18px',
        background: gradientBg,
        color: '#f6f7fb',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '0',
          background:
            'radial-gradient(circle at 10% 70%, rgba(86,225,233,0.08), transparent 35%), radial-gradient(circle at 90% 40%, rgba(123,108,255,0.12), transparent 40%)',
          filter: 'blur(40px)',
        }}
      />
      <div className="not-found__content" style={{ position: 'relative', zIndex: 1 }}>
        <div style={panelStyle}>
          <p
            className="not-found__eyebrow"
            style={{
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            404 · Ruta no encontrada
          </p>
          <h1
            className="not-found__title"
            style={{ fontSize: '32px', lineHeight: 1.2, marginBottom: '12px', color: '#fff' }}
          >
            Esta página no existe en tu espacio Agendo
          </h1>
          <p
            className="not-found__copy"
            style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '24px', fontSize: '16px' }}
          >
            Revisá el enlace o volvé a un área activa. Tus calendarios, estadísticas y perfil siguen disponibles.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <a
              className="not-found__link"
              href="/calendario"
              style={{
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(123,108,255,0.4)',
                background: 'linear-gradient(120deg, rgba(123,108,255,0.32), rgba(86,225,233,0.24))',
                color: '#fff',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
              }}
            >
              Ir al calendario
            </a>
            <a
              className="not-found__link"
              href="/estadisticas"
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              Ver estadísticas
            </a>
            <a
              className="not-found__link"
              href="/"
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                textDecoration: 'none',
                background: 'transparent',
              }}
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
