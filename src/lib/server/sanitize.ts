import sanitizeHtml from 'sanitize-html';

/**
 * Allowlist sanitizer for rich-text descriptions.
 *
 * Runs server-side only (never ships to the client) on both write and read
 * paths. Rich text is stored as HTML in D1 and rendered with `{@html}`, so
 * everything that reaches a public page must pass through here — it strips
 * scripts, event handlers, styles, media and any tag outside the list below.
 *
 * The allowlist mirrors what the Tipex editor (StarterKit + Link) emits:
 * paragraphs, headings, lists, quotes, inline code/code blocks, emphasis,
 * and safe `target=_blank rel=noopener noreferrer` links.
 */
export function sanitizeDescription(input: unknown): string {
	const raw = typeof input === 'string' ? input : '';

	const clean = sanitizeHtml(raw, {
		allowedTags: [
			'p',
			'br',
			'a',
			'ul',
			'ol',
			'li',
			'strong',
			'b',
			'em',
			'i',
			'u',
			's',
			'h1',
			'h2',
			'h3',
			'h4',
			'blockquote',
			'code',
			'pre',
			'hr'
		],
		allowedAttributes: {
			a: ['href', 'rel', 'target']
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		allowedSchemesByTag: { a: ['http', 'https', 'mailto'] },
		// Hard-force link safety regardless of what the editor/author wrote.
		transformTags: {
			a: (tagName, attribs) => ({
				tagName,
				attribs: {
					href: attribs.href ?? '',
					rel: 'noopener noreferrer nofollow',
					target: '_blank'
				}
			})
		},
		// Drop links whose href was stripped by the scheme filter (e.g.
		// javascript:) instead of leaving an empty shell behind.
		exclusiveFilter: (frame) => frame.tag === 'a' && !frame.attribs.href,
		parser: {
			decodeEntities: true
		}
	});

	// Normalise "empty" editor output to a clean empty string.
	const textOnly = clean
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (textOnly === '') return '';

	return clean;
}

/** Cap rich-text payloads (HTML is ~5–8× more verbose than plain text). */
export const DESCRIPTION_MAX = 8000;

/** Plain-text rendering of sanitized HTML (for list cards / teasers). */
export function descriptionToText(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}
