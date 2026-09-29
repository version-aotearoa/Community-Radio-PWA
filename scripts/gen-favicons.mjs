/**
 * Generate transparent-background favicon PNGs from the stepped-V mark.
 *
 * Two colourways, selected per colour scheme in app.html:
 *   - favicon-light-*.png -> dark mark (#0e0e0e), for light tab bars
 *   - favicon-dark-*.png  -> white mark (#ffffff), for dark tab bars
 *
 * Transparent (no full-bleed tile) so Safari's favicon tile/padding can't
 * show as a white ring around an opaque square.
 *
 * Usage: node scripts/gen-favicons.mjs
 */
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const V_PATH =
	'M0 0H40V40H50V0H80V45H70V60H55V70H25V60H10V45H0V5ZM10 5H5V40H15V55H30V65H50V55H65V40H75V5H55V45H35V5H15Z';

const COLORS = {
	light: '#000000',
	dark: '#ffffff'
};
const SIZES = [16, 32, 48, 96, 192];
const OUT_DIR = 'static/icons';

/** Stepped-V centred on a transparent square canvas (viewBox 96, mark 80x70). */
function svg(fill) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
	<g transform="translate(8 13)">
		<path fill="${fill}" fill-rule="evenodd" d="${V_PATH}"/>
	</g>
</svg>`;
}

await mkdir(OUT_DIR, { recursive: true });

for (const [scheme, fill] of Object.entries(COLORS)) {
	const src = Buffer.from(svg(fill));
	for (const size of SIZES) {
		const out = `${OUT_DIR}/favicon-${scheme}-${size}.png`;
		await sharp(src, { density: 384 }).resize(size, size, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(out);
		console.log('wrote', out);
	}
}
