/* Web Components and lazy-loaded vendors for pretty-html documents. */
(function () {
	const script = document.querySelector('script[src*="components.js"]');
	const assetBase = script ? new URL('.', script.src).href : '';

	const loaders = Object.create(null);

	// Lazy-load a classic script tag (highlight.js, mermaid).
	async function loadScriptOnce(src) {
		const el = document.createElement('script');
		el.src = src;
		const { promise, reject, resolve } = Promise.withResolvers();
		el.addEventListener('load', () => resolve(), { once: true });
		el.addEventListener(
			'error',
			() => reject(new Error('Failed to load ' + src)),
			{ once: true }
		);
		document.head.append(el);

		try {
			await promise;
		} catch (error) {
			delete loaders[src];
			throw error;
		}
	}

	function loadScript(src) {
		if (loaders[src]) {
			return loaders[src];
		}
		loaders[src] = loadScriptOnce(src);
		return loaders[src];
	}

	function ensureHighlightJs() {
		if (globalThis.hljs) {
			return Promise.resolve();
		}
		return loadScript(assetBase + 'lib/highlight.min.js');
	}

	let mermaidReady = null;

	function squirrelsongMermaidTheme() {
		const styles = getComputedStyle(document.documentElement);
		function cssVar(name) {
			return styles.getPropertyValue(name).trim();
		}
		return {
			background: 'transparent',
			primaryColor: cssVar('--text-background'),
			primaryTextColor: cssVar('--title-foreground'),
			primaryBorderColor: cssVar('--border'),
			secondaryColor: cssVar('--secondary-ui-background'),
			secondaryTextColor: cssVar('--title-foreground'),
			secondaryBorderColor: cssVar('--border'),
			tertiaryColor: cssVar('--ui-background'),
			tertiaryTextColor: cssVar('--text-foreground'),
			tertiaryBorderColor: cssVar('--border'),
			lineColor: cssVar('--link-foreground'),
			textColor: cssVar('--text-foreground'),
			mainBkg: cssVar('--text-background'),
			nodeBorder: cssVar('--border'),
			clusterBkg: cssVar('--ui-background'),
			clusterBorder: cssVar('--border'),
			defaultLinkColor: cssVar('--link-foreground'),
			titleColor: cssVar('--title-foreground'),
			edgeLabelBackground: cssVar('--ui-background'),
			noteBkgColor: cssVar('--info-background'),
			noteTextColor: cssVar('--info-foreground'),
			noteBorderColor: cssVar('--info-border'),
		};
	}

	async function initMermaid() {
		await loadScript(assetBase + 'lib/mermaid.min.js');
		globalThis.mermaid.initialize({
			securityLevel: 'loose',
			startOnLoad: false,
			theme: 'base',
			themeVariables: squirrelsongMermaidTheme(),
		});
	}

	async function ensureMermaidLoaded() {
		try {
			await initMermaid();
		} catch (error) {
			mermaidReady = null;
			throw error;
		}
	}

	function ensureMermaid() {
		mermaidReady ??= ensureMermaidLoaded();
		return mermaidReady;
	}

	// Remove common leading whitespace from indented source blocks.
	function dedent(text) {
		const lines = text.replace(/^\n/, '').replace(/\n$/, '').split('\n');
		let indent = null;
		for (const line of lines) {
			if (!line.trim()) {
				continue;
			}
			const match = line.match(/^(\s*)/);
			const size = match ? match[1].length : 0;
			indent = indent === null ? size : Math.min(indent, size);
		}
		if (!indent) {
			return lines.join('\n');
		}
		return lines
			.map(function (line) {
				return line.slice(indent);
			})
			.join('\n');
	}

	function highlightSource(source, language) {
		if (language && globalThis.hljs.getLanguage(language)) {
			return globalThis.hljs.highlight(source, { language });
		}
		return globalThis.hljs.highlightAuto(source);
	}

	// Raw source in textContent; highlight.js runs on connect.
	class SsCode extends HTMLElement {
		async connectedCallback() {
			if (this.dataset.highlighted) {
				return;
			}
			const language = this.getAttribute('language') ?? '';
			const source = dedent(this.textContent);
			try {
				await ensureHighlightJs();
				if (!globalThis.hljs) {
					throw new Error('highlight.js did not load');
				}
				const pre = document.createElement('pre');
				const codeEl = document.createElement('code');
				const result = highlightSource(source, language);
				codeEl.innerHTML = result.value;
				codeEl.classList.add('hljs');
				pre.append(codeEl);
				this.textContent = '';
				this.append(pre);
				this.dataset.highlighted = 'true';
			} catch (error) {
				console.error('[ss-code]', error);
				this.textContent = source;
				this.dataset.highlightError = 'true';
			}
		}
	}

	// Mermaid source in textContent; rendered on connect.
	class SsDiagram extends HTMLElement {
		async connectedCallback() {
			if (this.dataset.rendered) {
				return;
			}
			const source = this.textContent.trim();
			if (!source) {
				return;
			}
			try {
				await ensureMermaid();
				const container = document.createElement('div');
				container.className = 'mermaid';
				container.textContent = source;
				this.textContent = '';
				this.append(container);
				await globalThis.mermaid.run({ nodes: [container] });
				this.dataset.rendered = 'true';
			} catch (error) {
				console.error('[ss-diagram]', error);
				this.textContent = source;
			}
		}
	}

	function wrapSrcdoc(html) {
		const reset =
			'<style>html,body{margin:0;padding:0;overflow:hidden;}</style>';
		const resize =
			'<script>' +
			'function ssDemoResize(){var d=document.documentElement,b=document.body;' +
			'var h=Math.max(d.scrollHeight,b.scrollHeight,d.offsetHeight,b.offsetHeight);' +
			'parent.postMessage({type:"ss-demo-resize",height:h},"*");}' +
			'window.addEventListener("load",ssDemoResize);' +
			'if(typeof ResizeObserver!=="undefined"){new ResizeObserver(ssDemoResize).observe(document.body);}' +
			'</script>';
		return (
			'<!DOCTYPE html><html><head><meta charset="utf-8">' +
			reset +
			'</head><body>' +
			html +
			resize +
			'</body></html>'
		);
	}

	let ssDemoResizeBound = false;

	// Child HTML in innerHTML; shown in a sandboxed auto-resizing iframe.
	class SsDemo extends HTMLElement {
		connectedCallback() {
			if (this.dataset.built) {
				return;
			}

			if (!ssDemoResizeBound) {
				ssDemoResizeBound = true;
				globalThis.addEventListener('message', (event) => {
					if (event.data?.type !== 'ss-demo-resize') {
						return;
					}
					const height = Number(event.data.height);
					if (!Number.isFinite(height) || height <= 0) {
						return;
					}
					const iframes = document.querySelectorAll('ss-demo iframe');
					for (const iframe of iframes) {
						if (iframe.contentWindow === event.source) {
							iframe.style.height = `${height}px`;
							break;
						}
					}
				});
			}

			// HTML is indented in source files; dedent before srcdoc injection.
			const source = dedent(this.innerHTML);
			const iframe = document.createElement('iframe');
			iframe.setAttribute('sandbox', 'allow-scripts');
			iframe.setAttribute('scrolling', 'no');
			iframe.srcdoc = wrapSrcdoc(source);
			this.replaceChildren(iframe);
			this.dataset.built = 'true';
		}
	}

	customElements.define('ss-code', SsCode);
	customElements.define('ss-diagram', SsDiagram);
	customElements.define('ss-demo', SsDemo);
})();
