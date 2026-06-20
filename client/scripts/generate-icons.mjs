import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <!-- Back mountain -->
  <polygon points="360,148 498,408 222,408" fill="#1d4ed8" opacity="0.55"/>
  <!-- Main mountain -->
  <polygon points="210,68 468,408 -48,408" fill="#0ea5e9"/>
  <!-- Snow cap -->
  <polygon points="210,68 268,178 152,178" fill="#f1f5f9"/>
  <!-- Summit dot -->
  <circle cx="210" cy="68" r="10" fill="white" opacity="0.9"/>
</svg>
`;

const svgBuf = Buffer.from(SVG);

await sharp(svgBuf).resize(512, 512).png().toFile(`${publicDir}/icon-512.png`);
await sharp(svgBuf).resize(192, 192).png().toFile(`${publicDir}/icon-192.png`);
await sharp(svgBuf).resize(180, 180).png().toFile(`${publicDir}/apple-touch-icon.png`);
await sharp(svgBuf).resize(32, 32).png().toFile(`${publicDir}/favicon.ico`);

console.log('Icons generated ✓');
