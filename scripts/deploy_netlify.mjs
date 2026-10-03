import { execSync } from 'child_process';

console.log('Building Next.js project...');
execSync('node node_modules/next/dist/bin/next build', { stdio: 'inherit' });

console.log('Deploying to Netlify...');
try {
  const out = execSync('npx.cmd netlify deploy --prod --site dee21b99-c2bc-4360-b121-749d98dd5164', {
    encoding: 'utf8',
    stdio: 'inherit'
  });
  console.log('NETLIFY DEPLOY SUCCESS:', out);
} catch (e) {
  console.error('Netlify deploy failed:', e.message);
}
