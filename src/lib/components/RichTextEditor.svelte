<script lang="ts">
	import { Tipex, defaultExtensions } from '@friendofsvelte/tipex';
	import { Placeholder } from '@tiptap/extension-placeholder';
	import '@friendofsvelte/tipex/styles/index.css';

	let { value = $bindable(''), placeholder = 'Add a description…' }: {
		value?: string;
		placeholder?: string;
	} = $props();

	// Tipex mutates the array it is given (appends the floating menu on mount),
	// so build a fresh copy per instance — never touch the shared default.
	let extensions = $state(
		defaultExtensions
			.map((ext) => {
				if (ext.name === 'image') return null; // no base64 images in D1
				if (ext.name === 'placeholder') {
					return Placeholder.configure({
						placeholder,
						showOnlyWhenEditable: false
					});
				}
				return ext;
			})
			.filter((ext): ext is NonNullable<typeof ext> => ext !== null)
	);

	// The editor instance (bound via Tipex's `bind:tipex`).
	let editor = $state<any>(undefined);

	// Last HTML we pushed into the editor. Tracks external writes so `value`
	// changes coming from the parent (save-reseed, Clear button) actually
	// replace the editor content instead of being ignored.
	let lastApplied = $state(value);

	function onUpdate() {
		const html = editor?.getHTML() ?? '';
		lastApplied = html;
		value = html;
	}

	$effect(() => {
		const ed = editor;
		if (!ed) return;
		const want = value ?? '';
		if (want === lastApplied) return;
		lastApplied = want;
		ed.commands.setContent(want || '<p></p>');
	});
</script>

<div class="vr-richtext dark">
	<Tipex
		{extensions}
		body={value}
		bind:tipex={editor}
		onupdate={onUpdate}
		autofocus={false}
	/>
</div>

<style>
	.vr-richtext {
		--radius-tipex-sm: 0;
		--radius-tipex-md: 0;
		--radius-lg: 0;
		--color-tipex-50: var(--vr-surface);
		--color-tipex-100: var(--vr-surface-low);
		--color-tipex-200: var(--vr-line-muted);
		--color-tipex-300: var(--vr-muted);
		--color-tipex-400: var(--vr-faint);
		--color-tipex-500: var(--vr-text);
		--color-tipex-600: var(--vr-muted);
		--color-tipex-700: var(--vr-line-muted);
		--color-tipex-800: var(--vr-surface-med);
		--color-tipex-900: var(--vr-surface-high);
		font-family: var(--vr-font-body);
	}

	.vr-richtext :global(.tipex-editor) {
		background: var(--vr-surface-low);
		border: 1px solid var(--vr-line);
		border-radius: 0;
	}

	.vr-richtext :global(.tipex-editor-section) {
		min-height: 8rem;
	}

	.vr-richtext :global(.ProseMirror) {
		color: var(--vr-text);
		font-family: var(--vr-font-body);
	}

	.vr-richtext :global(.ProseMirror p) {
		margin: 0 0 0.5rem;
	}

	.vr-richtext :global(.ProseMirror h1),
	.vr-richtext :global(.ProseMirror h2),
	.vr-richtext :global(.ProseMirror h3),
	.vr-richtext :global(.ProseMirror h4) {
		font-family: var(--vr-font-body);
		font-weight: 600;
		color: var(--vr-text);
	}

	.vr-richtext :global(.ProseMirror a) {
		color: var(--vr-green);
		text-decoration: underline;
	}

	.vr-richtext :global(.tipex-controller) {
		background: var(--vr-surface-med);
		border-top: 1px solid var(--vr-line-muted);
		border-radius: 0;
		gap: 0.25rem;
	}

	.vr-richtext :global(.tipex-edit-button) {
		border: 1px solid transparent;
		background: transparent;
		color: var(--vr-muted);
		padding: 0.25rem 0.5rem;
		font-family: var(--vr-font-mono);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
	}

	.vr-richtext :global(.tipex-edit-button:hover) {
		background: var(--vr-text);
		color: var(--vr-black);
		border-color: var(--vr-line);
	}

	.vr-richtext :global(.tipex-edit-button.active) {
		background: var(--vr-text);
		color: var(--vr-black);
		border-color: var(--vr-line);
	}
</style>
