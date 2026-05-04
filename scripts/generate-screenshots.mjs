#!/usr/bin/env node

/**
 * Generate minimal PWA screenshot PNGs for Lighthouse PWA audit.
 * Creates solid-color placeholder images at the required dimensions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple CRC32 implementation
function crc32(data) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }

  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

// Minimal PNG chunk encoder
function encodeChunk(type, data) {
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length, 0);
  const crcValue = crc32(Buffer.concat([Buffer.from(type), data]));
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crcValue, 0);
  return Buffer.concat([header, Buffer.from(type), data, crc]);
}

// Create a simple solid-color PNG
function createSolidPNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk (image header)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT chunk (image data) - simple solid color
  const scanlineLength = 1 + width * 3; // 1 filter byte + RGB per pixel
  const pixelData = Buffer.alloc(height * scanlineLength);
  let offset = 0;

  for (let y = 0; y < height; y++) {
    pixelData[offset++] = 0; // filter type (None)
    for (let x = 0; x < width; x++) {
      pixelData[offset++] = r;
      pixelData[offset++] = g;
      pixelData[offset++] = b;
    }
  }

  // Compress with zlib
  const compressed = zlib.deflateSync(pixelData);

  // IEND chunk (image end)
  const iend = Buffer.alloc(0);

  // Assemble PNG
  const chunks = [
    encodeChunk('IHDR', ihdr),
    encodeChunk('IDAT', compressed),
    encodeChunk('IEND', iend),
  ];

  return Buffer.concat([signature, ...chunks]);
}

// Generate screenshots
function generateScreenshots() {
  const outputDir = path.join(__dirname, '..', 'public', 'screenshots');

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Questerix brand color: #2F6FED (47, 111, 237)
  const primaryR = 47;
  const primaryG = 111;
  const primaryB = 237;

  // Mobile screenshot (540×720)
  const mobilePng = createSolidPNG(540, 720, primaryR, primaryG, primaryB);
  fs.writeFileSync(path.join(outputDir, 'mobile-540x720.png'), mobilePng);
  console.log('✓ Created mobile-540x720.png (540×720)');

  // Tablet screenshot (1024×768)
  const tabletPng = createSolidPNG(1024, 768, primaryR, primaryG, primaryB);
  fs.writeFileSync(path.join(outputDir, 'tablet-1024x768.png'), tabletPng);
  console.log('✓ Created tablet-1024x768.png (1024×768)');

  console.log(`\nScreenshots generated in ${outputDir}`);
}

generateScreenshots();
