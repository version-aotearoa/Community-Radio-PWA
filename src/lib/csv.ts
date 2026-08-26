export interface CsvTrack {
	title: string;
	artist: string;
	album: string;
}

export interface TrackCsvResult {
	tracks: CsvTrack[];
	header: boolean;
}

const HEADER_ALIASES = {
	title: ['title', 'track', 'track title', 'name', 'song'],
	artist: ['artist', 'performer', 'band', 'act'],
	album: ['album', 'record', 'lp', 'release']
} as const;

function normalizeCell(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Split one record into fields honoring quoted cells ("a,b", ""escapes""). */
function splitRecord(line: string, delimiter: string): string[] {
	const fields: string[] = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < line.length; i += 1) {
		const ch = line[i];
		if (quoted) {
			if (ch === '"') {
				if (line[i + 1] === '"') {
					field += '"';
					i += 1;
				} else {
					quoted = false;
				}
			} else {
				field += ch;
			}
		} else if (ch === '"') {
			quoted = true;
		} else if (ch === delimiter) {
			fields.push(field);
			field = '';
		} else {
			field += ch;
		}
	}
	fields.push(field);
	return fields;
}

/** Parse a CSV/TSV file into records, handling quoted fields and multiline cells. */
function parseRecords(text: string, delimiter: string): string[][] {
	const records: string[][] = [];
	let record: string[] = [];
	let field = '';
	let quoted = false;

	const endField = () => {
		record.push(field);
		field = '';
	};
	const endRecord = () => {
		endField();
		if (record.some((c) => c.trim() !== '')) records.push(record);
		record = [];
	};

	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 1;
				} else {
					quoted = false;
				}
			} else {
				field += ch;
			}
		} else if (ch === '"') {
			quoted = true;
		} else if (ch === delimiter) {
			endField();
		} else if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && text[i + 1] === '\n') i += 1;
			endRecord();
		} else {
			field += ch;
		}
	}
	endRecord();
	return records;
}

function detectHeader(record: string[]): boolean {
	const cells = record.map(normalizeCell).filter((c) => c !== '');
	return cells.some((c) =>
		(
			[
				...HEADER_ALIASES.title,
				...HEADER_ALIASES.artist,
				...HEADER_ALIASES.album
			] as string[]
		).includes(c)
	);
}

function mapColumn(record: string[], alias: readonly string[]): number | null {
	for (let i = 0; i < record.length; i += 1) {
		if (alias.includes(normalizeCell(record[i]))) return i;
	}
	return null;
}

/**
 * Parse a CSV/TSV tracklist export into { title, artist, album } rows.
 * Header row optional; when absent, columns are read positionally.
 */
export function parseTracksCsv(
	text: string,
	delimiter: ',' | '\t' = text.includes('\t') && !text.includes(',') ? '\t' : ','
): TrackCsvResult {
	const records = parseRecords(text, delimiter);
	if (records.length === 0) return { tracks: [], header: false };

	const header = detectHeader(records[0]);
	let start = 0;
	let titleIdx = 0;
	let artistIdx = 1;
	let albumIdx = 2;
	if (header) {
		start = 1;
		titleIdx = mapColumn(records[0], HEADER_ALIASES.title) ?? 0;
		artistIdx = mapColumn(records[0], HEADER_ALIASES.artist) ?? 1;
		albumIdx = mapColumn(records[0], HEADER_ALIASES.album) ?? 2;
	}

	const tracks: CsvTrack[] = [];
	for (const record of records.slice(start)) {
		const title = (record[titleIdx] ?? '').trim();
		if (title === '') continue;
		tracks.push({
			title: title.slice(0, 300),
			artist: (record[artistIdx] ?? '').trim().slice(0, 200),
			album: (record[albumIdx] ?? '').trim().slice(0, 200)
		});
	}
	return { tracks, header };
}
