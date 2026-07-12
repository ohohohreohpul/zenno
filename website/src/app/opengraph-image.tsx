import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Zenno — Your chats, answered. Your calendar, filled.'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: '#1A1714',
          color: '#FDFCFA',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: '#FDFCFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 12,
                height: 12,
                borderRadius: 999,
                background: '#059669',
              }}
            />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>zenno</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            Your chats, answered.
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, color: '#6ee7b7' }}>
            Your calendar, filled.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.6)' }}>
          An AI receptionist that books appointments 24/7
        </div>
      </div>
    ),
    { ...size },
  )
}
