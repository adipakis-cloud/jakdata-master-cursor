import { useState } from 'react';

export type ProfileCardData = {
  title: string;
  name: string;
  badges: { label: string; highlight?: boolean }[];
  wilayah: string;
  photo: string;
  initials: string;
  focusLabel: string;
  focus: string[];
  accentColor: string;
  accentTextOnAccent?: string;
};

type Props = {
  profile: ProfileCardData;
};

export function OfficialProfileCard({ profile }: Props) {
  const [imgError, setImgError] = useState(false);
  const accentText = profile.accentTextOnAccent ?? '#1e3a8a';

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
        padding: '32px 24px 24px',
        color: 'white',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ flexShrink: 0 }}>
          {!imgError ? (
            <img
              src={profile.photo}
              alt={profile.name}
              onError={() => setImgError(true)}
              style={{
                width: '110px',
                height: '140px',
                objectFit: 'cover',
                borderRadius: '12px',
                border: `3px solid ${profile.accentColor}`,
                boxShadow: '0 4px 20px rgba(30, 58, 138, 0.45)',
              }}
            />
          ) : (
            <div
              style={{
                width: '110px',
                height: '140px',
                borderRadius: '12px',
                border: `3px solid ${profile.accentColor}`,
                background: profile.accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {profile.initials}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'inline-block',
              background: profile.accentColor,
              color: accentText,
              padding: '3px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.05em',
              marginBottom: '8px',
            }}
          >
            {profile.title}
          </div>

          <h2
            style={{
              fontSize: '20px',
              fontWeight: '800',
              color: 'white',
              margin: '0 0 12px',
              lineHeight: 1.3,
            }}
          >
            {profile.name}
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {profile.badges.map((tag) => (
              <span
                key={tag.label}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: tag.highlight ? profile.accentColor : 'rgba(255,255,255,0.15)',
                  color: tag.highlight ? accentText : 'white',
                  border: tag.highlight ? 'none' : '1px solid rgba(255,255,255,0.3)',
                }}
              >
                {tag.label}
              </span>
            ))}
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>📍 {profile.wilayah}</p>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '16px',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            fontWeight: '700',
            color: profile.accentColor,
            margin: '0 0 10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {profile.focusLabel}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {profile.focus.map((f) => (
            <span
              key={f}
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                background: 'rgba(255,255,255,0.9)',
                color: '#1e3a8a',
                fontWeight: '600',
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
