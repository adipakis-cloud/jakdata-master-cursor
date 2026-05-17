import { PAN } from './berandaTheme';

function PanLogoMark() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          background: PAN.blue,
          border: `2px solid ${PAN.white}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 6,
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r="14" fill={PAN.white} opacity="0.95" />
          <circle cx="18" cy="18" r="10" fill={PAN.blueLight} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="18"
              y1="18"
              x2={18 + 12 * Math.cos((deg * Math.PI) / 180)}
              y2={18 + 12 * Math.sin((deg * Math.PI) / 180)}
              stroke={PAN.white}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>
      <span style={{ fontSize: 14, fontWeight: 800, color: PAN.white, letterSpacing: '0.08em' }}>PAN</span>
      <span style={{ fontSize: 9, fontWeight: 600, color: PAN.white, letterSpacing: '0.06em', textAlign: 'center' }}>
        PARTAI AMANAT NASIONAL
      </span>
    </div>
  );
}

function IndonesiaFlag() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        transform: 'skewX(-6deg)',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
      aria-hidden
    >
      <div style={{ width: 60, height: 30, background: PAN.red }} />
      <div style={{ width: 60, height: 30, background: PAN.white }} />
    </div>
  );
}

export function PanBanner() {
  return (
    <header
      style={{
        height: 100,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${PAN.blue}, ${PAN.blueLight}, ${PAN.blue})`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 40px',
        marginBottom: 24,
        boxShadow: '0 4px 20px rgba(0, 71, 171, 0.35)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
        <IndonesiaFlag />
        <PanLogoMark />
      </div>

      <h1
        style={{
          margin: 0,
          flex: 1,
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 800,
          color: PAN.white,
          letterSpacing: '2px',
          padding: '0 16px',
        }}
      >
        BERSAMA MERAIH INDONESIA MAJU
      </h1>

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `2px solid ${PAN.white}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: PAN.white }}>PAN</span>
      </div>
    </header>
  );
}
