/**
 * Generate the pixel-stepped "VERSION" wordmark (static/wordmark.svg).
 * Letters are hand-set 5x7 bitmap glyphs on a 10-unit grid — same
 * rectilinear/stepped language as the stepped-V mark. Re-run with:
 *   node scripts/gen-wordmark.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CELL = 10;
const LETTER_W = 5 * CELL;
const GAP = 12;

const GLYPHS = {
	V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
	E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
	R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
	S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
	I: ['00100', '00100', '00100', '00100', '00100', '00100', '00100'],
	O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
	N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001']
};

const word = 'VERSION';
const width = word.length * LETTER_W + (word.length - 1) * GAP;
const height = 7 * CELL;

const rects = [];
word.split('').forEach((ch, i) => {
	const glyph = GLYPHS[ch];
	if (!glyph) throw new Error(`no glyph for ${ch}`);
	glyph.forEach((row, r) => {
		row.split('').forEach((cell, c) => {
			if (cell === '1') {
				const x = i * (LETTER_W + GAP) + c * CELL;
				const y = r * CELL;
				rects.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}"/>`);
			}
		});
	});
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="#ffffff" shape-rendering="crispEdges">
\t${rects.join('\n\t')}
</svg>
`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'static', 'wordmark.svg');
writeFileSync(out, svg);
console.log(`wrote ${out} (${width}x${height})`);
