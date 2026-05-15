import { APP_MODE } from '../lib/appMode';

export default function WrongApp() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        textAlign: 'center',
        padding: '2rem',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Akses Tidak Diizinkan</h1>
      <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: '300px', marginBottom: '2rem' }}>
        {APP_MODE === 'command'
          ? 'Aplikasi ini hanya untuk Tim Command Center. Koordinator lapangan gunakan aplikasi Field.'
          : 'Aplikasi ini hanya untuk Koordinator Lapangan. Admin gunakan aplikasi Command Center.'}
      </p>
      <button
        type="button"
        onClick={() => {
          localStorage.clear();
          window.location.href = '/login';
        }}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          background: '#f59e0b',
          color: '#1e3a8a',
          border: 'none',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        Kembali ke Login
      </button>
    </div>
  );
}
