import sharp from "sharp";
import path from "node:path";

// Usage: node scripts/remove-white-bg.mjs <file1.png> [file2.png ...]
// Writes each as <name>-cutout.png with the white/near-white background made transparent.
const files = process.argv.slice(2);
if (!files.length) { console.error("Usage: node scripts/remove-white-bg.mjs <file1.png> [file2.png ...]"); process.exit(1); }

const WHITE_MIN = 232;   // minimum channel brightness to be considered background
const WHITE_SAT = 20;    // max spread between channels to be considered "white/gray" not a color

for (const file of files) {
  const abs = path.resolve(file);
  const img = sharp(abs).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    const sat = maxC - minC;
    const brightFactor = Math.min(1, Math.max(0, (minC - WHITE_MIN) / (255 - WHITE_MIN)));
    const satFactor = Math.min(1, Math.max(0, (WHITE_SAT - sat) / WHITE_SAT));
    const whiteness = brightFactor * satFactor;
    if (whiteness > 0) {
      data[i + 3] = Math.round(data[i + 3] * (1 - whiteness));
    }
  }

  const out = abs.replace(/\.png$/, "-cutout.png");
  await sharp(data, { raw: { width, height, channels } }).png().toFile(out);
  console.log("wrote", out);
}
