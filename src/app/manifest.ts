import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'HomeDigo', short_name: 'HomeDigo',
    description: 'Home healthcare appointments and updates.',
    start_url: '/', scope: '/', display: 'standalone',
    background_color: '#ffffff', theme_color: '#0f766e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
