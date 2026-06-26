import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const svgPath = join(rootDir, 'public', 'logo.svg');

if (!fs.existsSync(svgPath)) {
  console.error('No se encuentra logo.svg');
  process.exit(1);
}

fs.copyFileSync(svgPath, join(rootDir, 'public', 'favicon.svg'));
console.log('✅ Favicon creado!');