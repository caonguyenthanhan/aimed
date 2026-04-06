import { execSync } from 'child_process';
import { chdir } from 'process';

try {
  chdir('/vercel/share/v0-project/medical-consultation-app');
  console.log('[v0] Updating pnpm lockfile...');
  execSync('pnpm install --no-frozen-lockfile', { stdio: 'inherit' });
  console.log('[v0] Lockfile updated successfully');
} catch (error) {
  console.error('[v0] Failed to update lockfile:', error);
  process.exit(1);
}
