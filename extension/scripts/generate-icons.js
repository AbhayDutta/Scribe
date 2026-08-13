import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(size) {
  // Simple uncompressed/deflated raw RGBA PNG creator
  const width = size;
  const height = size;

  // Generate RGBA pixel data
  // Sleek indigo/violet gradient background with a stylized 'S' or glowing notebook mark
  const rowSize = width * 4 + 1; // +1 for filter byte (0)
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        // Gradient from indigo #6366f1 (99, 102, 241) to violet #8b5cf6 (139, 92, 246)
        const t = (x + y) / (width + height);
        const red = Math.round(79 * (1 - t) + 139 * t);
        const green = Math.round(70 * (1 - t) + 92 * t);
        const blue = Math.round(229 * (1 - t) + 246 * t);

        // Draw a central pen/code brackets or spark
        const nx = (x - cx) / (r * 0.7);
        const ny = (y - cy) / (r * 0.7);
        
        // Stylized inner symbol
        const isCenterSymbol = (Math.abs(nx) < 0.35 && Math.abs(ny) < 0.5) &&
          (Math.abs(ny - 0.35) < 0.1 || Math.abs(ny + 0.35) < 0.1 || Math.abs(ny) < 0.1 || (ny < 0 && nx < -0.15) || (ny > 0 && nx > 0.15));

        if (isCenterSymbol) {
          rawData[pxOffset] = 255;     // R
          rawData[pxOffset + 1] = 255; // G
          rawData[pxOffset + 2] = 255; // B
          rawData[pxOffset + 3] = 255; // A
        } else {
          rawData[pxOffset] = red;
          rawData[pxOffset + 1] = green;
          rawData[pxOffset + 2] = blue;
          rawData[pxOffset + 3] = 255;
        }
      } else if (dist <= r + 1) {
        // Anti-aliasing edge
        rawData[pxOffset] = 99;
        rawData[pxOffset + 1] = 102;
        rawData[pxOffset + 2] = 241;
        rawData[pxOffset + 3] = 120;
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression method
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // Interlace method
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const typeBuf = Buffer.from(type, 'ascii');
  const buf = Buffer.alloc(8 + length + 4);

  buf.writeUInt32BE(length, 0);
  typeBuf.copy(buf, 4);
  data.copy(buf, 8);

  const crc = crc32(Buffer.concat([typeBuf, data]));
  buf.writeInt32BE(crc, 8 + length);

  return buf;
}

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return crc ^ -1;
}

const outDir = path.resolve(process.cwd(), 'public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuf = createPNG(size);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), pngBuf);
  console.log(`Generated icon${size}.png (${size}x${size})`);
});
