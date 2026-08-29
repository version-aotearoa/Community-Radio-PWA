/**
 * Trace version_logo.gif (transparent GIF, black shapes) -> vector SVG in the
 * brand-V outline style.
 *
 * Method (exact, no contour assembly):
 *   1. alpha mask (+ canonical stepped-V spliced in, rasterized from
 *      static/logo.svg geometry, so the V is the brand mark)
 *   2. white glyph = union of 1px runs as rect subpaths (fill-rule nonzero
 *      -> painted union; vector & pixel-exact)
 *   3. black inset = same runs of the mask eroded by r (2px for letters,
 *      1px for the V so the mark's ring keeps its weight) -> visible result:
 *      a crisp hollow outline faithful to every pixel step/notch/counter.
 *
 *   node scripts/trace-version-logo.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

// --- alpha mask ---
const { data, info } = await sharp('version_logo.gif').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const mask = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;

// --- V box (first letter, cols < 49) ---
let vx0 = W, vy0 = H, vx1 = -1, vy1 = -1;
for (let y = 0; y < H; y++) {
	for (let x = 0; x < 49 && x < W; x++) {
		if (mask[y * W + x]) {
			if (x < vx0) vx0 = x;
			if (x > vx1) vx1 = x;
			if (y < vy0) vy0 = y;
			if (y > vy1) vy1 = y;
		}
	}
}
const vBox = { x: vx0, y: vy0, w: vx1 - vx0 + 1, h: vy1 - vy0 + 1 };
const s = Math.min(vBox.w / 80, vBox.h / 70);
const ox = (vBox.w - 80 * s) / 2;
const oy = (vBox.h - 70 * s) / 2;

// letters mask = source mask minus the V box (V is drawn as its own vector path)
const letterMask = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
	for (let x = 0; x < W; x++) {
		const inVr = x >= vBox.x && x < vBox.x + vBox.w && y >= vBox.y && y < vBox.y + vBox.h;
		letterMask[y * W + x] = !inVr ? mask[y * W + x] : 0;
	}
}
console.log(`V box ${vBox.w}x${vBox.h} @(${vBox.x},${vBox.y}) scale ${s.toFixed(4)} — V drawn as canonical vector path`);

// --- erosion: pixel is eroded(r) when some transparent pixel is within r ---
function eroded(m, r) {
	const out = new Uint8Array(m.length);
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const i = y * W + x;
			if (!m[i]) continue;
			let clear = false;
			for (let dy = -r; dy <= r && !clear; dy++) {
				for (let dx = -r; dx <= r && !clear; dx++) {
					if (Math.max(Math.abs(dx), Math.abs(dy)) > r) continue;
					const nx = x + dx, ny = y + dy;
					if (nx < 0 || ny < 0 || nx >= W || ny >= H || !m[ny * W + nx]) clear = true;
				}
			}
			out[i] = clear ? 0 : 1;
		}
	}
	return out;
}

const lettersMask = eroded(mask, 2);
// for the V region use erosion 1 (canonical walls ~3px -> 2px ring, matching letters)

function buildRuns(m) {
	let d = '';
	for (let y = 0; y < H; y++) {
		let x = 0;
		while (x < W) {
			if (!m[y * W + x]) { x++; continue; }
			let x2 = x + 1;
			while (x2 < W && m[y * W + x2]) x2++;
			d += `M${x} ${y}h${x2 - x}v1h-${x2 - x}z`;
			x = x2;
		}
	}
	return d;
}

// letters band: hollow 2px outlines (the earlier-good style)
const RING_R = 2;
const inset = eroded(letterMask, RING_R);
const whiteMask = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) whiteMask[i] = letterMask[i] && !inset[i] ? 1 : 0;

const whiteD = buildRuns(whiteMask);

// V: canonical vector path, styled exactly like static/logo.svg —
// single band via evenodd fill (no stroke, no double line), brand weight
const CANON_D = 'M0 0H40V40H50V0H80V45H70V60H55V70H25V60H10V45H0V5ZM10 5H5V40H15V55H30V65H50V55H65V40H75V5H55V45H35V5H15Z';
const vTransform = `translate(${(vBox.x + ox).toFixed(2)} ${(vBox.y + oy).toFixed(2)}) scale(${s.toFixed(4)})`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
<path d="${whiteD}" fill="#ffffff" fill-rule="nonzero"/>
<path d="${CANON_D}" transform="${vTransform}" fill="#ffffff" fill-rule="evenodd"/>
</svg>
`;

console.log(`letters ring ${RING_R}px (V proportion), V = evenodd band (brand weight)`);

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'static', 'version-logo.svg');
writeFileSync(out, svg);
console.log(`wrote ${out} (${W}x${H})`);
