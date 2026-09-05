/*
    ImpositionFix - PDF Optimization (Ghostscript via local server)
    Copyright (C) 2026 Olegas Spausdinimas

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// ---------------- PDF Optimization via Ghostscript ----------------
//
// Optimizes the currently loaded PDF using Ghostscript and saves the result
// under a different file name (<original>_optimized.pdf).
//
// The app runs as a plain static web app (no Electron / no Node in the
// renderer). Ghostscript is executed by the local server (server.js) on the
// /optimize endpoint: the browser POSTs the PDF bytes plus the gs args and
// receives the optimized PDF back.

(function () {
	const OPTIMIZE_URL = '/optimize';

	// ---------------------------------------------------------------------------
	// Ghostscript command building
	// ---------------------------------------------------------------------------

	/**
	 * Collects the Ghostscript arguments from the current UI settings.
	 * @returns {string[]} Array of gs arguments (without input/output files).
	 */
	function gatherGsArgs() {
		const args = ['-sDEVICE=pdfwrite', '-dNOPAUSE', '-dBATCH'];

		// Helper to append an argument from an element (input, select, or toggle button).
		const addArg = (id, prefix, isToggle = false, trueValue = null) => {
			const el = document.getElementById(id);
			if (!el) return;
			if (isToggle) {
				const isActive = el.tagName === 'INPUT' ? el.checked : el.classList.contains('active');
				if (isActive) args.push(trueValue !== null ? `${prefix}${trueValue}` : prefix);
			} else if (el.value && el.value.trim()) {
				args.push(`${prefix}${el.value.trim()}`);
			}
		};

		// Main settings
		addArg('pdfVersion', '-dCompatibilityLevel=');
		addArg('pdfSettings', '-dPDFSETTINGS='); // e.g. /screen, /ebook

		// Color conversion strategy (special handling for Gray)
		const strategyEl = document.getElementById('colorConversionStrategy');
		if (strategyEl && strategyEl.value) {
			const strategy = strategyEl.value;
			if (strategy === '/DeviceGray') {
				args.push('-dProcessColorModel=/DeviceGray');
				args.push('-sColorConversionStrategy=Gray');
			} else {
				args.push('-sColorConversionStrategy=' + strategy);
			}
		}

		addArg('renderIntent', '-dRenderIntent='); // 0=Perceptual, 1=Relative Colorimetric, 2=Saturation, 3=Absolute Colorimetric
		addArg('autoRotatePages', '-dAutoRotatePages=');
		addArg('embedAllFontsCheckbox', '-dEmbedAllFonts=', true, 'true');
		addArg('subsetFonts', '-dSubsetFonts=', true, 'true');
		addArg('safer', '-dSAFER', true);
		addArg('quiet', '-q', true);

		// Optional settings
		addArg('outputIccProfile', '-sOutputICCProfile=');
		addArg('colorImageResolution', '-dColorImageResolution=');
		addArg('colorImageDownsampleType', '-dColorImageDownsampleType=');
		addArg('grayImageResolution', '-dGrayImageResolution=');
		addArg('grayImageDownsampleType', '-dGrayImageDownsampleType=');
		addArg('monoImageResolution', '-dMonoImageResolution=');
		addArg('monoImageDownsampleType', '-dMonoImageDownsampleType=');

		// Free-form extra arguments (space separated)
		const extraEl = document.getElementById('additionalArgs');
		if (extraEl && extraEl.value) {
			extraEl.value.trim().split(/\s+/).filter(Boolean).forEach(function (tok) { args.push(tok); });
		}

		return args;
	}

	/**
	 * Builds a human readable Ghostscript command preview string.
	 * @param {string} inputName - Display name of the input file.
	 * @param {string} outputName - Display name of the output file.
	 * @returns {string}
	 */
	function buildGsCommand(inputName, outputName) {
		const parts = ['gs'].concat(gatherGsArgs());
		parts.push('-sOutputFile=' + outputName);
		parts.push(inputName);
		return parts.join(' ');
	}

	// ---------------------------------------------------------------------------
	// File helpers
	// ---------------------------------------------------------------------------

	/**
	 * Returns the ArrayBuffer of a loaded file (File object or url).
	 */
	async function getInputBuffer(file) {
		if (!file) throw new Error('No file provided');
		if (typeof file.arrayBuffer === 'function') return await file.arrayBuffer();
		if (file.url) {
			const res = await fetch(file.url);
			if (!res.ok) throw new Error('Failed to fetch file from URL: ' + file.url);
			return await res.arrayBuffer();
		}
		throw new Error('Cannot read input file.');
	}

	/**
	 * Triggers a download of the given Blob under a new file name.
	 */
	function downloadBlob(blob, filename) {
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function setStatus(text) {
		const el = document.getElementById('optimizeStatus');
		if (el) el.textContent = text;
	}

	// ---------------------------------------------------------------------------
	// Optimization
	// ---------------------------------------------------------------------------

	/**
	 * Runs the Ghostscript optimization through the local server.
	 */
	async function handleOptimizeClick() {
		const files = window.__importedFiles || [];
		const src = files.find(function (f) { return (f.type && f.type.indexOf('pdf') !== -1) || (f.name && /\.pdf$/i.test(f.name)); });
		if (!src) {
			alert('Please load a PDF file first.');
			return;
		}

		const btn = document.getElementById('optimizeBtn');
		if (btn) { btn.disabled = true; btn.textContent = 'Optimizing...'; }
		setStatus('Optimizing PDF, please wait...');

		try {
			const buffer = await getInputBuffer(src);
			const args = gatherGsArgs();

			const response = await fetch(OPTIMIZE_URL, {
				method: 'POST',
				headers: { 'X-Gs-Args': JSON.stringify(args) },
				body: buffer
			});

			if (!response.ok) {
				throw new Error(await response.text());
			}

			const optimizedBlob = await response.blob();
			const base = (src.name || 'file').replace(/\.pdf$/i, '');
			const outName = base + '_optimized.pdf';
			downloadBlob(optimizedBlob, outName);
			setStatus('Done! Saved as ' + outName);
		} catch (err) {
			console.error(err);
			setStatus(err.message || 'Optimization failed');
			if (!(err && err.message && err.message.indexOf('Ghostscript') === 0)) {
				alert('Error during optimization: ' + (err.message || err) + '\n\nIs the local server running? Start it with: npm start');
			}
		} finally {
			if (btn) { btn.disabled = false; btn.textContent = 'Optimize & Save'; }
		}
	}

	// ---------------------------------------------------------------------------
	// Wiring / UI
	// ---------------------------------------------------------------------------

	document.addEventListener('DOMContentLoaded', function () {
		const preview = document.getElementById('gsCommandPreview');
		const refreshPreview = function () {
			if (!preview) return;
			const files = window.__importedFiles || [];
			const src = files.find(function (f) { return (f.type && f.type.indexOf('pdf') !== -1) || (f.name && /\.pdf$/i.test(f.name)); });
			const inName = src ? src.name : 'input.pdf';
			const outName = (src ? src.name : 'input').replace(/\.pdf$/i, '') + '_optimized.pdf';
			preview.value = buildGsCommand(inName, outName);
		};

		// Expose so other scripts can refresh the preview when files change.
		window.refreshGsCommandPreview = refreshPreview;

		const btn = document.getElementById('optimizeBtn');
		if (btn) btn.addEventListener('click', handleOptimizeClick);

		const copyBtn = document.getElementById('copyGsCommandBtn');
		if (copyBtn) {
			copyBtn.addEventListener('click', function () {
				if (!preview) return;
				navigator.clipboard.writeText(preview.value || '').then(function () {
					copyBtn.textContent = 'Copied!';
					setTimeout(function () { copyBtn.textContent = 'Copy Command'; }, 1500);
				});
			});
		}

		// PDF Settings presets - apply standard Ghostscript values
		const pdfSettingsEl = document.getElementById('pdfSettings');
		const presets = {
			'/screen': {
				colorImageResolution: '72',
				colorImageDownsampleType: '/Subsample',
				grayImageResolution: '72',
				grayImageDownsampleType: '/Subsample',
				monoImageResolution: '72',
				monoImageDownsampleType: '/Subsample'
			},
			'/ebook': {
				colorImageResolution: '150',
				colorImageDownsampleType: '/Bicubic',
				grayImageResolution: '150',
				grayImageDownsampleType: '/Bicubic',
				monoImageResolution: '150',
				monoImageDownsampleType: '/Subsample'
			},
			'/printer': {
				colorImageResolution: '300',
				colorImageDownsampleType: '/Bicubic',
				grayImageResolution: '300',
				grayImageDownsampleType: '/Bicubic',
				monoImageResolution: '300',
				monoImageDownsampleType: '/Subsample'
			},
			'/prepress': {
				colorImageResolution: '300',
				colorImageDownsampleType: '/Bicubic',
				grayImageResolution: '300',
				grayImageDownsampleType: '/Bicubic',
				monoImageResolution: '300',
				monoImageDownsampleType: '/Bicubic'
			}
		};

		// Load custom preset from localStorage
		const CUSTOM_PRESET_KEY = 'gs_custom_preset';
		let customPreset = null;
		try {
			const saved = localStorage.getItem(CUSTOM_PRESET_KEY);
			if (saved) customPreset = JSON.parse(saved);
		} catch (e) {}

		// Add custom preset to dropdown if exists
		if (customPreset) {
			const opt = document.createElement('option');
			opt.value = '__custom__';
			opt.textContent = 'Custom Preset';
			pdfSettingsEl.appendChild(opt);
		}

		// Save current settings as custom preset
		const saveBtn = document.getElementById('savePdfSettingsPreset');
		if (saveBtn) {
			saveBtn.addEventListener('click', function () {
				const currentSettings = {
					colorImageResolution: document.getElementById('colorImageResolution').value,
					colorImageDownsampleType: document.getElementById('colorImageDownsampleType').value,
					grayImageResolution: document.getElementById('grayImageResolution').value,
					grayImageDownsampleType: document.getElementById('grayImageDownsampleType').value,
					monoImageResolution: document.getElementById('monoImageResolution').value,
					monoImageDownsampleType: document.getElementById('monoImageDownsampleType').value
				};
				localStorage.setItem(CUSTOM_PRESET_KEY, JSON.stringify(currentSettings));
				customPreset = currentSettings;
				// Update or add custom option
				let customOpt = pdfSettingsEl.querySelector('option[value="__custom__"]');
				if (!customOpt) {
					customOpt = document.createElement('option');
					customOpt.value = '__custom__';
					customOpt.textContent = 'Custom Preset';
					pdfSettingsEl.appendChild(customOpt);
				}
				pdfSettingsEl.value = '__custom__';
				refreshPreview();
				saveBtn.textContent = 'Saved!';
				setTimeout(() => { saveBtn.innerHTML = '<span class="material-icons" style="font-size:14px; vertical-align:middle">save</span>'; }, 1500);
			});
		}

		if (pdfSettingsEl) {
			pdfSettingsEl.addEventListener('change', function () {
				const val = this.value;
				if (val === '__custom__' && customPreset) {
					document.getElementById('colorImageResolution').value = customPreset.colorImageResolution || '';
					document.getElementById('colorImageDownsampleType').value = customPreset.colorImageDownsampleType || '';
					document.getElementById('grayImageResolution').value = customPreset.grayImageResolution || '';
					document.getElementById('grayImageDownsampleType').value = customPreset.grayImageDownsampleType || '';
					document.getElementById('monoImageResolution').value = customPreset.monoImageResolution || '';
					document.getElementById('monoImageDownsampleType').value = customPreset.monoImageDownsampleType || '';
				} else {
					const preset = presets[val];
					if (!preset) return;
					document.getElementById('colorImageResolution').value = preset.colorImageResolution;
					document.getElementById('colorImageDownsampleType').value = preset.colorImageDownsampleType;
					document.getElementById('grayImageResolution').value = preset.grayImageResolution;
					document.getElementById('grayImageDownsampleType').value = preset.grayImageDownsampleType;
					document.getElementById('monoImageResolution').value = preset.monoImageResolution;
					document.getElementById('monoImageDownsampleType').value = preset.monoImageDownsampleType;
				}
				refreshPreview();
			});
		}

		// Toggle buttons for embedAllFontsCheckbox, subsetFonts, safer, quiet
		const toggleButtons = ['embedAllFontsCheckbox', 'subsetFonts', 'safer', 'quiet'];
		toggleButtons.forEach(function (id) {
			const btn = document.getElementById(id);
			if (btn) {
				btn.addEventListener('click', function () {
					this.classList.toggle('active');
					this.setAttribute('aria-pressed', this.classList.contains('active'));
					refreshPreview();
				});
			}
		});

		// Optimize help button
		const helpBtn = document.getElementById('optimizeHelpBtn');
		if (helpBtn) {
			const helpBalloon = document.createElement('div');
			helpBalloon.className = 'help-balloon';
			helpBalloon.style.display = 'none';
			helpBalloon.innerHTML = `
				<h3 style="margin-top:0; border-bottom:1px solid #444; padding-bottom:8px">PDF Optimization Help</h3>
				<p style="font-size:12px; line-height:1.4><strong style="color:#444">Requires local server:</strong> Start with <code style="background:#333; padding:1px 4px; border-radius:3px; color:#dddddd">npm start</code> (or <code style="background:#333; padding:1px 4px; border-radius:3px; color:#dddddd">node server.js</code>) inside main app folder</p>
				<p style="font-size:12px; line-height:1.4"><strong>How it works:</strong></p>
				<ul style="font-size:12px; line-height:1.5; padding-left:18px; margin:4px 0">
					<li>Load a PDF file first</li>
					<li>Adjust settings if needed (presets available)</li>
					<li>Click <strong>Optimize & Save</strong></li>
					<li>Optimized PDF downloads as <code>name_optimized.pdf</code></li>
				</ul>
				<p style="font-size:12px; line-height:1.4; color:#888"><strong>Note:</strong> Runs Ghostscript on the server. The server must be running for optimization to work.</p>
			`;
			document.body.appendChild(helpBalloon);

			const positionBalloon = () => {
				const rect = helpBtn.getBoundingClientRect();
				const w = helpBalloon.offsetWidth;
				const h = helpBalloon.offsetHeight;
				const vw = window.innerWidth;
				const vh = window.innerHeight;

				// Horizontal flip: try right first, flip left if it overflows
				let left = rect.right + 10;
				if(left + w > vw - 10) left = rect.left - w - 10;
				if(left < 10) left = 10;
				helpBalloon.style.left = left + 'px';

				// Vertical centering with viewport bounds
				let top = rect.top - (h / 2) + (rect.height / 2);
				if(top < 10) top = 10;
				if(top + h > window.innerHeight - 10) top = window.innerHeight - h - 10;
				helpBalloon.style.top = top + 'px';
			};

			helpBtn.addEventListener('click', (e) => { e.stopPropagation(); if(helpBalloon.style.display === 'block') { helpBalloon.style.display = 'none'; } else { helpBalloon.style.display = 'block'; positionBalloon(); } });
			const toolbox = helpBtn.closest('.toolbox');
			if(toolbox) toolbox.addEventListener('scroll', () => { if(helpBalloon.style.display === 'block') positionBalloon(); });
			document.addEventListener('click', (e) => { if (helpBalloon.style.display === 'block' && !helpBalloon.contains(e.target) && e.target !== helpBtn) { helpBalloon.style.display = 'none'; } });
		}

		// Refresh the preview whenever any optimization control changes.
		const container = document.getElementById('optimizationSettings');
		if (container) {
			container.querySelectorAll('input, select, textarea, button.toolbox-btn').forEach(function (ctl) {
				ctl.addEventListener('change', refreshPreview);
				ctl.addEventListener('input', refreshPreview);
				ctl.addEventListener('click', refreshPreview);
			});
		}

		refreshPreview();
	});
})();