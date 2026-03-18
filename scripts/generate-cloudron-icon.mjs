#!/usr/bin/env node
/**
 * Generates icon.png (256x256) from icon.svg for the Cloudron package.
 * Run: node scripts/generate-cloudron-icon.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'icon.svg');
const outPath = join(root, 'icon.png');

const svg = readFileSync(svgPath);
await sharp(svg)
  .resize(256, 256)
  .png()
  .toFile(outPath);
console.log('Written', outPath);
