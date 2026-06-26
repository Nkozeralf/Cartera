import sharp from 'sharp';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const sizes = [16, 32, 48, 64, 128, 180, 192, 512];
const svgPath = join(rootDir, 'public', 'logo.svg');

if (!fs.existsSync(svgPath)) {
  console.error('No se encuentra logo.svg en public/');
  process.exit(1);
}

async function generateFavicons() {
  console.log('Generando favicons...');
  const svgBuffer = fs.readFileSync(svgPath);
  
  for (const size of sizes) {
    const outputPath = join(rootDir, 'public', avicon-x.png);
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(outputPath);
    console.log(Generado favicon-x.png);
  }
  
  const icoBuffer = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(join(rootDir, 'public', 'favicon.png'), icoBuffer);
  console.log('Generado favicon.png');
  
  fs.copyFileSync(svgPath, join(rootDir, 'public', 'favicon.svg'));
  console.log('Copiado favicon.svg');
  
  console.log('Favicons generados exitosamente!');
  console.log('Ubicacion:', join(rootDir, 'public'));
}

generateFavicons().catch(console.error);
