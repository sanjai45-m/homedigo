import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'HomeDigo — doctor visits, nursing and physiotherapy at home in Bengaluru';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Prerender a public PNG: sharing crawlers need no browser, login or remote image service.
export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), 'public/logo.jpg'));
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8f9f5', color: '#183c38', padding: '56px 60px', alignItems: 'center', borderBottom: '16px solid #126e61' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 690, paddingRight: 36 }}>
        <div style={{ display: 'flex', fontSize: 29, color: '#126e61', fontWeight: 700, marginBottom: 30 }}>HomeDigo</div>
        <div style={{ display: 'flex', fontSize: 64, lineHeight: 1.08, fontWeight: 700 }}>Healthcare that</div>
        <div style={{ display: 'flex', fontSize: 64, lineHeight: 1.08, fontWeight: 700, color: '#126e61', marginBottom: 26 }}>comes home.</div>
        <div style={{ display: 'flex', fontSize: 25, lineHeight: 1.5, color: '#64736d' }}>Doctor visits · Nursing · Physiotherapy</div>
        <div style={{ display: 'flex', fontSize: 24, marginTop: 30 }}>Personal care across Bengaluru</div>
        <div style={{ display: 'flex', fontSize: 20, color: '#126e61', marginTop: 18 }}>homedigo.vercel.app</div>
      </div>
      <div style={{ display: 'flex', width: 360, height: 390, background: '#fff', borderRadius: 36, border: '1px solid #dce8df', alignItems: 'center', justifyContent: 'center' }}>
        <img src={`data:image/jpeg;base64,${logo.toString('base64')}`} width={340} height={340} alt="" />
      </div>
    </div>,
    size,
  );
}
