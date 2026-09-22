import sanitizeHtml from 'sanitize-html';

/** Hosts treated as our own: links to them stay in the current tab. */
const INTERNAL_HOSTS = new Set(['versionradio.live', 'www.versionradio.live', 'dev.versionradio.live']);

/** Whether an href points within the site (relative, hash, mail/tel, our hosts). */
function isInternalHref(href: string): boolean {
	if (!href) return false;
	if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) return true;
	if (href.startsWith('mailto:') || href.startsWith('tel:')) return true;
	try {
		const host = new URL(href).hostname;
		return INTERNAL_HOSTS.has(host) || host.endsWith('.pages.dev');
	} catch {
		return false;
	}
}

/**
 * Allowlist sanitizer for rich-text descriptions.
 *
 * Runs server-side only (never ships to the client) on both write and read
 * paths. Rich text is stored as HTML in D1 and rendered with `{@html}`, so
 * everything that reaches a public page must pass through here — it strips
 * scripts, event handlers, styles, media and any tag outside the list below.
 *
 * The allowlist mirrors what the Tipex editor (StarterKit + Link) emits:
 * paragraphs, headings, lists, quotes, inline code/code blocks and emphasis.
 * Internal links navigate in the same tab; external links open in a new one
 * with `rel=noopener noreferrer`.
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
		// Links: internal nav stays in-tab; external opens a new tab safely.
		transformTags: {
			a: (tagName, attribs) => {
				const href = attribs.href ?? '';
				const out: Record<string, string> = { href };
				if (!isInternalHref(href)) {
					out.rel = 'noopener noreferrer nofollow';
					out.target = '_blank';
				}
				return { tagName, attribs: out };
			}
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
export function descriptionToText(html: unknown): string {
	const raw = typeof html === 'string' ? html : '';
	return raw
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
