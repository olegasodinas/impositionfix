/*
    ImpositionFix - PDF Imposition Tool
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

// data.js - Handles overlays and data merging visualization

window.__overlays = [];

// Helper to check page range
function isPageInRange(pageNum, rangeStr) {
	if (!rangeStr || !rangeStr.trim()) return true;

	if (window.parsePageOrder) {
		if (!isPageInRange.cache || isPageInRange.renderId !== window.__renderId) {
			isPageInRange.cache = {};
			isPageInRange.renderId = window.__renderId;
		}
		if (!isPageInRange.cache[rangeStr]) {
			try {
				isPageInRange.cache[rangeStr] = new Set(window.parsePageOrder(rangeStr));
			} catch (e) {
				isPageInRange.cache[rangeStr] = new Set();
			}
		}
		return isPageInRange.cache[rangeStr].has(pageNum);
	}

	const parts = rangeStr.split(/[\s,]+/);
	for (const part of parts) {
		if (!part) continue;
		if (part.includes('-')) {
			const [s, e] = part.split('-');
			const start = s ? parseInt(s, 10) : 1;
			const end = e ? parseInt(e, 10) : Infinity;
			if (!isNaN(start) && !isNaN(end)) {
				if (pageNum >= start && pageNum <= end) return true;
			}
		} else {
			const n = parseInt(part, 10);
			if (!isNaN(n) && pageNum === n) return true;
		}
	}
	return false;
}

// Helper to calculate row index for data merge based on filter
function getMergeRowIndex(pageNum, startPage, filter) {
	if (pageNum < startPage) return -1;
	if (filter === 'all') return pageNum - startPage;
	if (filter === 'odd') {
		const oddsUpTo = (n) => Math.ceil(n / 2);
		return oddsUpTo(pageNum) - oddsUpTo(startPage - 1) - 1;
	}
	if (filter === 'even') {
		const evensUpTo = (n) => Math.floor(n / 2);
		return evensUpTo(pageNum) - evensUpTo(startPage - 1) - 1;
	}
	return -1;
}

// Helper to get file index for page
function getFileIndexForPage(pageNum) {
	if (!window.__filePageCounts || window.__filePageCounts.length === 0) return 0;
	let countSoFar = 0;
	for (let k = 0; k < window.__filePageCounts.length; k++) {
		if (pageNum <= countSoFar + window.__filePageCounts[k]) {
			return k;
		}
		countSoFar += window.__filePageCounts[k];
	}
	return window.__filePageCounts.length - 1;
}

// Helper to get file name for page
function getFileNameForPage(pageNum) {
	if (!window.__filePageCounts || !window.__fileNames || window.__filePageCounts.length === 0) {
		return (window.__fileNames && window.__fileNames[0]) || "";
	}
	let countSoFar = 0;
	for (let k = 0; k < window.__filePageCounts.length; k++) {
		if (pageNum <= countSoFar + window.__filePageCounts[k]) {
			if(window.__importedFiles && window.__importedFiles[k] && window.__importedFiles[k].type === 'group'){
				const group = window.__importedFiles[k];
				const localIdx = pageNum - countSoFar - 1;
				if(group.files && group.files[localIdx]){
					return group.files[localIdx].name;
				}
			}
			return window.__fileNames[k] || "";
		}
		countSoFar += window.__filePageCounts[k];
	}
	return window.__fileNames[window.__fileNames.length - 1] || "";
}

// Helper to get ordered pages for numbering (cached on overlay)
function getOverlayPageList(overlay) {
	const key = overlay.useSpecificPages ? overlay.specificPages : overlay.pageRange;
	if (!key || !key.trim()) return null;
	
	if (overlay._cachedRangeStr !== key || !overlay._cachedPageList || overlay._cachedRenderId !== window.__renderId) {
		overlay._cachedRangeStr = key;
		overlay._cachedRenderId = window.__renderId;
		try {
			overlay._cachedPageList = window.parsePageOrder ? window.parsePageOrder(key) : [];
		} catch (e) { overlay._cachedPageList = []; }
	}
	return overlay._cachedPageList;
}

// Add overlays to the HTML preview slot
window.addPreviewOverlays = function(container, pageNum, offset, slotIndex, pagesToRender) {
	const pxPerMm = 96 / 25.4;
	const offX = offset ? (offset.x || 0) : 0;
	const offY = offset ? (offset.y || 0) : 0;
	const offR = offset ? (offset.r || 0) : 0;
	
	const toRgb = (c, m, y, k) => {
		const r = Math.round(255 * (1 - c) * (1 - k));
		const g = Math.round(255 * (1 - m) * (1 - k));
		const b = Math.round(255 * (1 - y) * (1 - k));
		return `rgb(${r},${g},${b})`;
	};

	window.__overlays.forEach(overlay => {
		if (overlay.visible === false) return;
		if (overlay._pluginName) return; // Plugin overlays have their own render path (drawPreview)
		if (['colorbar', 'duplex', 'sigmark'].includes(overlay.type)) return;

		const totalW = offset.w || container.clientWidth || parseFloat(container.style.width) || 0;
		const totalH = offset.h || container.clientHeight || parseFloat(container.style.height) || 0;

		// Position relative to trim box (offset by expansion)
		const x = (parseFloat(overlay.x) || 0) * pxPerMm + offX;
		const y = (parseFloat(overlay.y) || 0) * pxPerMm + offY;
		
		const div = document.createElement('div');
		div.className = 'data-overlay';
		div.style.position = 'absolute';
		div.style.left = x + 'px';
		div.style.top = y + 'px'; // Preview is top-left origin
		div.style.zIndex = '5';
		div.style.pointerEvents = 'none';

		if (overlay.type === 'numbering' || overlay.type === 'filename') {
			if (pageNum <= 0) return; // Don't number empty pages
			
			let textContent = "";

			if (overlay.type === 'numbering') {
				const start = (typeof overlay.startFrom === 'number') ? overlay.startFrom : 1;
				let pageIndex = -1;
				const pageList = getOverlayPageList(overlay);
				
				if (pageList) {
					pageIndex = pageList.indexOf(pageNum);
				} else if (pageNum > 0 && !overlay.useSpecificPages) {
					pageIndex = pageNum - 1;
				}

				if (pageIndex !== -1) {
					const count = pageIndex + 1;
					let num = count;
					num = num + start - 1;
					const prefix = overlay.prefix || '';
					const digits = parseInt(overlay.digits) || 0;
					textContent = prefix + String(num).padStart(digits, '0');
				} else return;
				div.textContent = textContent;
			} else {
				if (overlay.allFiles === false && overlay.fileIndex !== undefined) {
					if (getFileIndexForPage(pageNum) !== overlay.fileIndex) return;
				}
				const rawName = getFileNameForPage(pageNum);
				div.textContent = (overlay.includeExtension !== false) ? rawName : rawName.replace(/\.[^/.]+$/, "");
			}
			
			if (overlay.facingPages && pageNum % 2 === 0) {
				const xMm = parseFloat(overlay.x) || 0;
				const rightPos = offR + xMm * pxPerMm;
				div.style.left = 'auto';
				div.style.right = rightPos + 'px';
				div.style.textAlign = 'right';
			}

			const style = (window.__textStyles && overlay.styleId) ? window.__textStyles[overlay.styleId] : null;
			
			let fontSize = 12;
			let fontFamily = 'sans-serif';
			let fontWeight = 'normal';
			let fontStyle = 'normal';
			let color = 'black';
			let opacity = 1;
			let fontVariationSettings = '';

			if (style) {
				fontSize = parseFloat(style.fontSize) || 12;
				const fam = style.fontFamily || 'Helvetica';
				const fontData = window.__customFonts && window.__customFonts[fam];
				if (fontData && fontData.buffer) {
					fontFamily = `"${fam}", sans-serif`;
				} else if (fam.startsWith('Times')) fontFamily = '"Times New Roman", serif';
				else if (fam.startsWith('Courier')) fontFamily = '"Courier New", monospace';
				else fontFamily = 'sans-serif';

				const fStyle = style.fontStyle || 'Normal';
				
				// Check for variable font mapping
				if (fontData && window.__fontVariationsCache && window.__fontVariationsCache[fam] && window.__fontVariationsCache[fam].map[fStyle]) {
					const settings = window.__fontVariationsCache[fam].map[fStyle];
					// Map known axes to CSS
					const cssSettings = [];
					for (const [axis, value] of Object.entries(settings)) {
						cssSettings.push(`'${axis}' ${value}`);
					}
					fontVariationSettings = cssSettings.join(', ');
				} else {
					if (fStyle.includes('Bold')) fontWeight = 'bold';
					if (fStyle.includes('Italic')) fontStyle = 'italic';
				}

				const colorCss = (window.styleColorToCss) ? window.styleColorToCss(style) : 'black';
				color = colorCss;
				if (style.opacity !== undefined) opacity = style.opacity;
				
				if (style.align === 'center') div.style.transform = 'translateX(-50%)';
				else if (style.align === 'right') div.style.transform = 'translateX(-100%)';
			}

			// Convert pt to px for preview (1pt = 96/72 px)
			const pxSize = fontSize * (96/72);
			div.style.fontSize = pxSize + 'px';
			div.style.fontFamily = fontFamily;
			div.style.fontWeight = fontWeight;
			div.style.fontStyle = fontStyle;
			div.style.color = color;
			div.style.opacity = opacity;
			if(fontVariationSettings) div.style.fontVariationSettings = fontVariationSettings;
			div.style.whiteSpace = 'nowrap';
		} else if (overlay.type === 'frame') {
			const trimW = totalW - (offset.x + (offset.r || 0));
			const trimH = totalH - (offset.y + (offset.b || 0));
			const thick = (parseFloat(overlay.thickness) || 0.2) * pxPerMm;
			const margin = (parseFloat(overlay.offset) || 0) * pxPerMm;
			const c = overlay.cmyk || [0, 0, 0, 1];
			
			div.style.left = (offset.x + margin) + 'px';
			if (overlay.facingPages && pageNum % 2 === 0) {
				div.style.left = 'auto';
				div.style.right = ((offset.r || 0) + margin) + 'px';
			}
			div.style.top = (offset.y + margin) + 'px';
			div.style.width = Math.max(0, trimW - 2 * margin) + 'px';
			div.style.height = Math.max(0, trimH - 2 * margin) + 'px';
			div.style.outline = `${thick}px solid ${toRgb(c[0], c[1], c[2], c[3])}`;
			div.style.outlineOffset = `-${thick}px`;
			div.style.opacity = (overlay.opacity !== undefined) ? overlay.opacity : 1;
		} else if (overlay.type === 'bleed') {
			const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
			const cols = parseInt(document.getElementById('colsInput')?.value || 1);
			const slotsPerSheet = rows * cols;
			const localIdx = slotIndex % slotsPerSheet;
			const rIdx = Math.floor(localIdx / cols);
			const cIdx = localIdx % cols;

			const bOutX = parseFloat(document.getElementById('cropBleedXInput')?.value || 0);
			const bOutY = parseFloat(document.getElementById('cropBleedYInput')?.value || 0);
			const bInX = parseFloat(document.getElementById('innerCropBleedXInput')?.value || 0);
			const bInY = parseFloat(document.getElementById('innerCropBleedYInput')?.value || 0);

			const bleedL = ((cIdx === 0) ? bOutX : bInX) * pxPerMm;
			const bleedR = ((cIdx === cols - 1) ? bOutX : bInX) * pxPerMm;
			const bleedT = ((rIdx === 0) ? bOutY : bInY) * pxPerMm;
			const bleedB = ((rIdx === rows - 1) ? bOutY : bInY) * pxPerMm;

			const trimW = totalW - (offset.x + (offset.r || 0));
			const trimH = totalH - (offset.y + (offset.b || 0));
			const c = overlay.cmyk || [0, 1, 1, 0];
			
			div.style.left = offset.x + 'px';
			if (overlay.facingPages && pageNum % 2 === 0) {
				div.style.left = 'auto';
				div.style.right = (offset.r || 0) + 'px';
			}
			div.style.top = offset.y + 'px';
			div.style.width = trimW + 'px';
			div.style.height = trimH + 'px';
			div.style.borderStyle = 'solid';
			div.style.borderWidth = `${bleedT}px ${bleedR}px ${bleedB}px ${bleedL}px`;
			div.style.borderColor = toRgb(c[0], c[1], c[2], c[3]);
			div.style.boxSizing = 'border-box';
			div.style.opacity = (overlay.opacity !== undefined) ? overlay.opacity : 0.5;
		} else if (overlay.type === 'size') {
			const trimW = totalW - (offset.x + (offset.r || 0));
			const trimH = totalH - (offset.y + (offset.b || 0));
			const c = overlay.cmyk || [0, 0, 0, 1];
			
			div.style.left = offset.x + 'px';
			if (overlay.facingPages && pageNum % 2 === 0) {
				div.style.left = 'auto';
				div.style.right = (offset.r || 0) + 'px';
			}
			div.style.top = offset.y + 'px';
			div.style.width = trimW + 'px';
			div.style.height = trimH + 'px';
			div.style.outline = `4px solid ${toRgb(c[0], c[1], c[2], c[3])}`;
			div.style.outlineOffset = '-2px';
			div.style.boxSizing = 'border-box';
			div.style.opacity = (overlay.opacity !== undefined) ? overlay.opacity : 1;
			div.style.display = 'flex';
			div.style.alignItems = 'center';
			div.style.justifyContent = 'center';

			const wMm = (trimW / pxPerMm).toFixed(2);
			const hMm = (trimH / pxPerMm).toFixed(2);

			const label = document.createElement('span');
			label.textContent = `${parseFloat(wMm)} × ${parseFloat(hMm)}`;
			label.style.background = 'rgba(255,255,255,0.8)';
			label.style.padding = '1px 3px';
			label.style.fontSize = '30px';
			label.style.color = 'black';
			label.style.borderRadius = '2px';
			div.appendChild(label);
		} else if (overlay.type === 'safety') {
			const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
			const cols = parseInt(document.getElementById('colsInput')?.value || 1);
			const slotsPerSheet = rows * cols;
			const localIdx = slotIndex % slotsPerSheet;
			const rIdx = Math.floor(localIdx / cols);
			const cIdx = localIdx % cols;

			const bOutX = parseFloat(document.getElementById('cropBleedXInput')?.value || 0);
			const bOutY = parseFloat(document.getElementById('cropBleedYInput')?.value || 0);
			const bInX = parseFloat(document.getElementById('innerCropBleedXInput')?.value || 0);
			const bInY = parseFloat(document.getElementById('innerCropBleedYInput')?.value || 0);

			const bleedL = ((cIdx === 0) ? bOutX : bInX) * pxPerMm;
			const bleedR = ((cIdx === cols - 1) ? bOutX : bInX) * pxPerMm;
			const bleedT = ((rIdx === 0) ? bOutY : bInY) * pxPerMm;
			const bleedB = ((rIdx === rows - 1) ? bOutY : bInY) * pxPerMm;

			const trimW = totalW - (offset.x + (offset.r || 0));
			const trimH = totalH - (offset.y + (offset.b || 0));
			const c = overlay.cmyk || [0, 1, 1, 0];
			
			div.style.left = (offset.x + bleedL) + 'px';
			if (overlay.facingPages && pageNum % 2 === 0) {
				div.style.left = 'auto';
				div.style.right = ((offset.r || 0) + bleedR) + 'px';
			}
			div.style.top = (offset.y + bleedT) + 'px';
			div.style.width = Math.max(0, trimW - bleedL - bleedR) + 'px';
			div.style.height = Math.max(0, trimH - bleedT - bleedB) + 'px';
			div.style.outline = `2.5px dashed ${toRgb(c[0], c[1], c[2], c[3])}`;
			div.style.outlineOffset = '-2.5px';
			div.style.boxSizing = 'border-box';
			div.style.opacity = (overlay.opacity !== undefined) ? overlay.opacity : 0.8;
			div.style.display = 'flex';
			div.style.alignItems = 'center';
			div.style.justifyContent = 'center';

			const wMm = ((trimW - bleedL - bleedR) / pxPerMm).toFixed(2);
			const hMm = ((trimH - bleedT - bleedB) / pxPerMm).toFixed(2);
			const label = document.createElement('span');
			label.textContent = `${parseFloat(wMm)} × ${parseFloat(hMm)}`;
			label.style.fontSize = '30px';
			label.style.background = 'rgba(255,255,255,0.7)';
			label.style.padding = '1px 3px';
			label.style.borderRadius = '2px';
			label.style.color = toRgb(c[0], c[1], c[2], c[3]);
			div.appendChild(label);
		} else {
			// Default square
			const w = (parseFloat(overlay.width) || 0) * pxPerMm;
			const h = (parseFloat(overlay.height) || 0) * pxPerMm;
			const c = overlay.cmyk || [0.5, 0, 0.5, 0];
			div.style.width = w + 'px';
			div.style.height = h + 'px';
			div.style.backgroundColor = toRgb(c[0], c[1], c[2], c[3]);
			div.style.opacity = (overlay.opacity !== undefined) ? overlay.opacity : 0.5;

			if (overlay.facingPages && pageNum % 2 === 0) {
				const xMm = parseFloat(overlay.x) || 0;
				const rightPos = offR + xMm * pxPerMm;
				div.style.left = 'auto';
				div.style.right = rightPos + 'px';
			}
		}
		
		container.appendChild(div);
	});

	// Data Merge Overlays
	if(window.__mergeEnabled && window.__mergeData && window.__mergeData.headers && window.__mergeConfig){
		window.__mergeData.headers.forEach((header, colIndex) => {
			const cfg = window.__mergeConfig[header];
			if(!cfg || !cfg.visible) return;

			const pageFilter = cfg.pageFilter || 'all';
			if (pageNum <= 0) return; // Don't show on empty slots
			if (pageFilter === 'odd' && pageNum % 2 === 0) return;
			if (pageFilter === 'even' && pageNum % 2 !== 0) return;

			const startPage = parseInt(cfg.startPage) || 1;
			const rowIndex = getMergeRowIndex(pageNum, startPage, pageFilter);

			if(rowIndex >= 0 && rowIndex < window.__mergeData.rows.length){
				const row = window.__mergeData.rows[rowIndex];
				const text = (row && row[colIndex] !== undefined) ? String(row[colIndex]) : '';
				const style = (window.__textStyles && cfg.styleId) ? window.__textStyles[cfg.styleId] : null;
				
				if(text && style){
					const x = (parseFloat(cfg.x) || 0) * pxPerMm + offX;
					const y = (parseFloat(cfg.y) || 0) * pxPerMm + offY;
					
					const div = document.createElement('div');
					div.className = 'data-merge-overlay';
					div.style.position = 'absolute';
					div.style.left = x + 'px';
					div.style.top = y + 'px';
					if (style.align === 'center') {
						div.style.transform = 'translateX(-50%)';
					} else if (style.align === 'right') {
						div.style.transform = 'translateX(-100%)';
					}
					div.style.zIndex = '6';
					div.style.pointerEvents = 'none';
					div.textContent = text;
					
					const ptSize = parseFloat(style.fontSize) || 12;
					const pxSize = ptSize * (96/72);
					div.style.fontSize = pxSize + 'px';
					
					const fam = style.fontFamily || 'Helvetica';
					const fontData = window.__customFonts && window.__customFonts[fam];
					if (fontData && fontData.buffer) {
						div.style.fontFamily = `"${fam}", sans-serif`;
					} else if (fam.startsWith('Times')) div.style.fontFamily = '"Times New Roman", serif';
					else if (fam.startsWith('Courier')) div.style.fontFamily = '"Courier New", monospace';
					else div.style.fontFamily = 'sans-serif';

					const fStyle = style.fontStyle || 'Normal';
					
					if (fontData && window.__fontVariationsCache && window.__fontVariationsCache[fam] && window.__fontVariationsCache[fam].map[fStyle]) {
						const settings = window.__fontVariationsCache[fam].map[fStyle];
						const cssSettings = [];
						for (const [axis, value] of Object.entries(settings)) {
							cssSettings.push(`'${axis}' ${value}`);
						}
						div.style.fontVariationSettings = cssSettings.join(', ');
					} else {
						if (fStyle.includes('Bold')) div.style.fontWeight = 'bold';
						if (fStyle.includes('Italic')) div.style.fontStyle = 'italic';
					}
					
					div.style.color = (window.styleColorToCss) ? window.styleColorToCss(style) : 'black';
					if (style.opacity !== undefined) div.style.opacity = style.opacity;
					div.style.whiteSpace = 'nowrap';

					container.appendChild(div);
				}
			}
		});
	}
	window.impositionfix._overlays.forEach(o => {
		if (o.visible === false) return;
		if (typeof o.drawPreview === 'function') {
			try { o.drawPreview.call(o, container, pageNum, slotIndex, { window }); } catch(e) { console.error('Overlay drawPreview error:', o.id || o.name, e); }
		}
	});

};

window.updatePreviewOverlays = function(container, pageNum, offset) {
	const existing = container.querySelectorAll('.data-overlay');
	existing.forEach(el => el.remove());
	window.addPreviewOverlays(container, pageNum, offset);
};

// Draw overlays on the PDF page
window.drawPdfOverlays = async function(newPage, boxX, boxY, boxW, boxH, pdfLib, pageNum, offset, slotIndex, pagesToRender) {
    try {
        const { rgb, cmyk } = pdfLib;
		const ptPerMm = 72 / 25.4;
		const offX = offset ? (offset.x || 0) : 0;
		const offY = offset ? (offset.y || 0) : 0;
		const offR = offset ? (offset.r || 0) : 0;

		// Initialize font cache on the document if needed to avoid re-embedding
		if (!newPage.doc.__fontCache) newPage.doc.__fontCache = new Map();
		const fontCache = newPage.doc.__fontCache;

		for (const overlay of window.__overlays) {
			if (overlay.visible === false) continue;
			if (overlay._pluginName) continue; // Plugin overlays have their own drawPdf path below
			if (['colorbar', 'duplex', 'sigmark'].includes(overlay.type)) continue;
			const xMm = parseFloat(overlay.x) || 0;
			const yMm = parseFloat(overlay.y) || 0;
			const xPt = xMm * ptPerMm;
			const yPt = yMm * ptPerMm;
			
			if (overlay.type === 'numbering' || overlay.type === 'filename') {
				if (pageNum <= 0) continue;
				
				let text = '';
				if (overlay.type === 'numbering') {
					const start = (typeof overlay.startFrom === 'number') ? overlay.startFrom : 1;
					let pageIndex = -1;
					const pageList = getOverlayPageList(overlay);
					
					if (pageList) {
						pageIndex = pageList.indexOf(pageNum);
					} else if (pageNum > 0 && !overlay.useSpecificPages) {
						pageIndex = pageNum - 1;
					}

					if (pageIndex !== -1) {
						const count = pageIndex + 1;
						let num = count;
						num = num + start - 1;
						const prefix = overlay.prefix || '';
						const digits = parseInt(overlay.digits) || 0;
						text = prefix + String(num).padStart(digits, '0');
					} else continue;
				} else {
					if (overlay.allFiles === false && overlay.fileIndex !== undefined) {
						if (getFileIndexForPage(pageNum) !== overlay.fileIndex) continue;
					}
					const rawName = getFileNameForPage(pageNum);
					text = (overlay.includeExtension !== false) ? rawName : rawName.replace(/\.[^/.]+$/, "");
				}

				const style = (window.__textStyles && overlay.styleId) ? window.__textStyles[overlay.styleId] : null;
				let fontSize = 12;
				let fontName = 'Helvetica';
				let color = [0,0,0,1];
				let opacity = 1;
				let align = 'left';

				if (style) {
					fontSize = parseFloat(style.fontSize) || 12;
					fontName = style.fontFamily || 'Helvetica';
					const fStyle = style.fontStyle || 'Normal';
					const isCustom = window.__customFonts && window.__customFonts[fontName];
					
					if (!isCustom && fontName !== 'Symbol' && fontName !== 'ZapfDingbats') {
						if (fontName === 'Times') fontName = 'Times-Roman';
						if (fStyle === 'Bold') {
							if (fontName === 'Times-Roman') fontName = 'Times-Bold';
							else fontName += '-Bold';
						} else if (fStyle === 'Italic') {
							if (fontName === 'Times-Roman') fontName = 'Times-Italic';
							else if (fontName === 'Helvetica') fontName += '-Oblique';
							else if (fontName === 'Courier') fontName += '-Oblique';
						} else if (fStyle === 'Bold Italic') {
							if (fontName === 'Times-Roman') fontName = 'Times-BoldItalic';
							else if (fontName === 'Helvetica') fontName += '-BoldOblique';
							else if (fontName === 'Courier') fontName += '-BoldOblique';
						}
					}
					color = style.color || [0,0,0,1];
					if (style.opacity !== undefined) opacity = style.opacity;
					align = style.align || 'left';
				}
				
				const fontData = window.__customFonts && window.__customFonts[fontName];
				const isCustom = fontData && fontData.buffer;
				
				// Embed font
				let font = fontCache.get(fontName);
				if (!font) {
					const stdFonts = [
						'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
						'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
						'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
						'Symbol', 'ZapfDingbats'
					];
					try {
						if (isCustom) {
							if (!window.fontkit) {
								throw new Error("fontkit library is missing. Please include it to use custom fonts.");
							}
							font = await newPage.doc.embedFont(fontData.buffer.slice(0), { subset: true });
						} else {
							if (!stdFonts.includes(fontName)) {
								throw new Error(`Custom font "${fontName}" is not loaded. Please reload it.`);
							}
							font = await newPage.doc.embedFont(fontName);
						}
						fontCache.set(fontName, font);
					} catch (e) {
						console.warn('Font not found, falling back to Helvetica', e);
						if (isCustom || !stdFonts.includes(fontName)) {
							alert(`Failed to embed font "${fontName}": ${e.message}\nFalling back to Helvetica.`);
						}
						const fallbackName = pdfLib.StandardFonts.Helvetica;
						font = fontCache.get(fallbackName);
						if (!font) {
							font = await newPage.doc.embedFont(fallbackName);
							fontCache.set(fallbackName, font);
						}
					}
				}

				// PDF coords are bottom-left. 
				// yPt is distance from TOP of trim box.
				// boxY + boxH is top of expanded box.
				// Text is drawn from baseline.
				let drawX = boxX + offX + xPt;
				if (overlay.facingPages && pageNum % 2 === 0) {
					const textWidth = font.widthOfTextAtSize(text, fontSize);
					const trimWidthPt = boxW - offX - offR;
					drawX = boxX + offX + (trimWidthPt - xPt - textWidth);
				}
				else {
					if (align === 'center') {
						const width = font.widthOfTextAtSize(text, fontSize);
						drawX -= width / 2;
					} else if (align === 'right') {
						const width = font.widthOfTextAtSize(text, fontSize);
						drawX -= width;
					}
				}

				const drawY = boxY + boxH - offY - yPt - fontSize; // Approx baseline adjustment

				newPage.drawText(text, {
					x: drawX,
					y: drawY,
					size: fontSize,
					font: font,
					color: (window.styleTextColor) ? window.styleTextColor(style, pdfLib) : cmyk(color[0], color[1], color[2], color[3]),
					opacity: opacity
				});

			} else if (overlay.type === 'frame') {
				const trimW = boxW - (offset.x + (offset.r || 0));
				const trimH = boxH - (offset.y + (offset.b || 0));
				const thick = (parseFloat(overlay.thickness) || 0.2) * ptPerMm;
				const margin = (parseFloat(overlay.offset) || 0) * ptPerMm;
				const c = overlay.cmyk || [0, 0, 0, 1];
				const op = (overlay.opacity !== undefined) ? overlay.opacity : 1;

				let drawX = boxX + offset.x + margin;
				if (overlay.facingPages && pageNum % 2 === 0) {
					drawX = boxX + (offset.r || 0) + margin;
				}
				const drawY = boxY + (offset.b || 0) + margin;
				const w = Math.max(0, trimW - 2 * margin);
				const h = Math.max(0, trimH - 2 * margin);

				newPage.drawRectangle({
					x: drawX,
					y: drawY,
					width: w,
					height: h,
					borderColor: cmyk(c[0], c[1], c[2], c[3]),
					borderWidth: thick,
					opacity: op,
				});
			} else if (overlay.type === 'bleed') {
				const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
				const cols = parseInt(document.getElementById('colsInput')?.value || 1);
				const slotsPerSheet = rows * cols;
				const localIdx = slotIndex % slotsPerSheet;
				const rIdx = Math.floor(localIdx / cols);
				const cIdx = localIdx % cols;

				const bOutX = parseFloat(document.getElementById('cropBleedXInput')?.value || 0);
				const bOutY = parseFloat(document.getElementById('cropBleedYInput')?.value || 0);
				const bInX = parseFloat(document.getElementById('innerCropBleedXInput')?.value || 0);
				const bInY = parseFloat(document.getElementById('innerCropBleedYInput')?.value || 0);

				const bleedL = ((cIdx === 0) ? bOutX : bInX) * ptPerMm;
				const bleedR = ((cIdx === cols - 1) ? bOutX : bInX) * ptPerMm;
				const bleedT = ((rIdx === 0) ? bOutY : bInY) * ptPerMm;
				const bleedB = ((rIdx === rows - 1) ? bOutY : bInY) * ptPerMm;

				const trimW = boxW - (offset.x + (offset.r || 0));
				const trimH = boxH - (offset.y + (offset.b || 0));
				const c = overlay.cmyk || [0, 1, 1, 0];
				const op = (overlay.opacity !== undefined) ? overlay.opacity : 0.5;

				let drawX = boxX + offset.x;
				if (overlay.facingPages && pageNum % 2 === 0) {
					drawX = boxX + (offset.r || 0);
				}
				const drawY = boxY + (offset.b || 0);

				const color = cmyk(c[0], c[1], c[2], c[3]);
				const w = trimW;
				const h = trimH;
				
				// Draw 4 rectangles to handle potential non-uniform bleed accurately
				newPage.drawRectangle({ x: drawX, y: drawY + h - bleedT, width: w, height: bleedT, color, opacity: op }); // Top
				newPage.drawRectangle({ x: drawX, y: drawY, width: w, height: bleedB, color, opacity: op }); // Bottom
				newPage.drawRectangle({ x: drawX, y: drawY + bleedB, width: bleedL, height: Math.max(0, h - bleedT - bleedB), color, opacity: op }); // Left
				newPage.drawRectangle({ x: drawX + w - bleedR, y: drawY + bleedB, width: bleedR, height: Math.max(0, h - bleedT - bleedB), color, opacity: op }); // Right
			} else if (overlay.type === 'size') {
				const trimW = boxW - (offset.x + (offset.r || 0));
				const trimH = boxH - (offset.y + (offset.b || 0));
				const c = overlay.cmyk || [0, 0, 0, 1];
				const op = (overlay.opacity !== undefined) ? overlay.opacity : 1;

				let drawX = boxX + offset.x;
				if (overlay.facingPages && pageNum % 2 === 0) {
					drawX = boxX + (offset.r || 0);
				}
				const drawY = boxY + (offset.b || 0);

				newPage.drawRectangle({
					x: drawX,
					y: drawY,
					width: trimW,
					height: trimH,
					borderColor: cmyk(c[0], c[1], c[2], c[3]),
					borderWidth: 1,
					opacity: op,
				});

				const wMm = (trimW / ptPerMm).toFixed(1);
				const hMm = (trimH / ptPerMm).toFixed(1);
				const labelText = `${wMm} × ${hMm}`;
				const fontSize = 11;
				let font = fontCache.get('Helvetica');
				if (!font) {
					font = await newPage.doc.embedFont(pdfLib.StandardFonts.Helvetica);
					fontCache.set('Helvetica', font);
				}
				const textWidth = font.widthOfTextAtSize(labelText, fontSize);
				
				newPage.drawText(labelText, {
					x: drawX + (trimW - textWidth) / 2,
					y: drawY + (trimH - fontSize) / 2,
					size: fontSize,
					font: font,
					color: cmyk(c[0], c[1], c[2], c[3]),
					opacity: op
				});
			} else if (overlay.type === 'safety') {
				const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
				const cols = parseInt(document.getElementById('colsInput')?.value || 1);
				const slotsPerSheet = rows * cols;
				const localIdx = slotIndex % slotsPerSheet;
				const rIdx = Math.floor(localIdx / cols);
				const cIdx = localIdx % cols;

				const bOutX = parseFloat(document.getElementById('cropBleedXInput')?.value || 0);
				const bOutY = parseFloat(document.getElementById('cropBleedYInput')?.value || 0);
				const bInX = parseFloat(document.getElementById('innerCropBleedXInput')?.value || 0);
				const bInY = parseFloat(document.getElementById('innerCropBleedYInput')?.value || 0);

				const bleedL = ((cIdx === 0) ? bOutX : bInX) * ptPerMm;
				const bleedR = ((cIdx === cols - 1) ? bOutX : bInX) * ptPerMm;
				const bleedT = ((rIdx === 0) ? bOutY : bInY) * ptPerMm;
				const bleedB = ((rIdx === rows - 1) ? bOutY : bInY) * ptPerMm;

				const trimW = boxW - (offset.x + (offset.r || 0));
				const trimH = boxH - (offset.y + (offset.b || 0));
				const c = overlay.cmyk || [0, 1, 1, 0];
				const op = (overlay.opacity !== undefined) ? overlay.opacity : 0.8;

				let drawX = boxX + offset.x + bleedL;
				if (overlay.facingPages && pageNum % 2 === 0) {
					drawX = boxX + (offset.r || 0) + bleedR;
				}
				const drawY = boxY + (offset.b || 0) + bleedB;
				const w = Math.max(0, trimW - bleedL - bleedR);
				const h = Math.max(0, trimH - bleedT - bleedB);

				const color = cmyk(c[0], c[1], c[2], c[3]);
				newPage.drawRectangle({ x: drawX, y: drawY, width: w, height: h, borderColor: color, borderWidth: 1.5, dashArray: [2, 2], opacity: op });

				const wMm = (w / ptPerMm).toFixed(1);
				const hMm = (h / ptPerMm).toFixed(1);
				const labelText = `${wMm} × ${hMm}`;
				const fontSize = 12;
				let font = fontCache.get('Helvetica');
				if (!font) {
					font = await newPage.doc.embedFont(pdfLib.StandardFonts.Helvetica);
					fontCache.set('Helvetica', font);
				}
				const textWidth = font.widthOfTextAtSize(labelText, fontSize);
				
				newPage.drawText(labelText, {
					x: drawX + (w - textWidth) / 2, y: drawY + (h - fontSize) / 2, size: fontSize, font, color, opacity: op
				});
			} else {
				// Default square
				const wMm = parseFloat(overlay.width) || 0;
				const hMm = parseFloat(overlay.height) || 0;
				const wPt = wMm * ptPerMm;
				const hPt = hMm * ptPerMm;
				
				const c = overlay.cmyk || [0.5, 0, 0.5, 0];
				const op = (overlay.opacity !== undefined) ? overlay.opacity : 0.5;

				// Position relative to top-left of the trim box
				let drawX = boxX + offX + xPt;
				if (overlay.facingPages && pageNum % 2 === 0) {
					const trimWidthPt = boxW - offX - offR;
					// Mirror: Right edge of rect is at xPt from Right edge of trim box
					drawX = boxX + offX + (trimWidthPt - xPt - wPt);
				}

				const drawY = boxY + boxH - offY - yPt - hPt;

				newPage.drawRectangle({
					x: drawX,
					y: drawY,
					width: wPt,
					height: hPt,
					color: cmyk(c[0], c[1], c[2], c[3]),
					opacity: op,
				});
			}
        }

		// Data Merge Overlays
		if(window.__mergeEnabled && window.__mergeData && window.__mergeData.headers && window.__mergeConfig){
			for(let colIndex = 0; colIndex < window.__mergeData.headers.length; colIndex++){
				const header = window.__mergeData.headers[colIndex];
				const cfg = window.__mergeConfig[header];
				if(!cfg || !cfg.visible) continue;

				const pageFilter = cfg.pageFilter || 'all';
				if (pageNum <= 0) continue;
				if (pageFilter === 'odd' && pageNum % 2 === 0) continue;
				if (pageFilter === 'even' && pageNum % 2 !== 0) continue;

				const startPage = parseInt(cfg.startPage) || 1;
				const rowIndex = getMergeRowIndex(pageNum, startPage, pageFilter);

				if(rowIndex >= 0 && rowIndex < window.__mergeData.rows.length){
					const row = window.__mergeData.rows[rowIndex];
					const text = (row && row[colIndex] !== undefined) ? String(row[colIndex]) : '';
					const style = (window.__textStyles && cfg.styleId) ? window.__textStyles[cfg.styleId] : null;
					
					if(text && style){
						const xMm = parseFloat(cfg.x) || 0;
						const yMm = parseFloat(cfg.y) || 0;
						const xPt = xMm * ptPerMm;
						const yPt = yMm * ptPerMm;
						const fontSize = parseFloat(style.fontSize) || 12;
						
						let fontName = style.fontFamily || 'Helvetica';
						const fontData = window.__customFonts && window.__customFonts[fontName];
						const isCustom = fontData && fontData.buffer;
						const fStyle = style.fontStyle || 'Normal';
						
						if (!isCustom && fontName !== 'Symbol' && fontName !== 'ZapfDingbats') {
							if (fontName === 'Times') fontName = 'Times-Roman';
							if (fStyle === 'Bold') {
								if (fontName === 'Times-Roman') fontName = 'Times-Bold';
								else fontName += '-Bold';
							} else if (fStyle === 'Italic') {
								if (fontName === 'Times-Roman') fontName = 'Times-Italic';
								else if (fontName === 'Helvetica') fontName += '-Oblique';
								else if (fontName === 'Courier') fontName += '-Oblique';
							} else if (fStyle === 'Bold Italic') {
								if (fontName === 'Times-Roman') fontName = 'Times-BoldItalic';
								else if (fontName === 'Helvetica') fontName += '-BoldOblique';
								else if (fontName === 'Courier') fontName += '-BoldOblique';
							}
						}

						let font = fontCache.get(fontName);
						if (!font) {
							const stdFonts = [
								'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
								'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
								'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
								'Symbol', 'ZapfDingbats'
							];
							try {
								if (isCustom) {
									if (!window.fontkit) {
										throw new Error("fontkit library is missing. Please include it to use custom fonts.");
									}
									font = await newPage.doc.embedFont(fontData.buffer.slice(0), { subset: true });
								} else {
									if (!stdFonts.includes(fontName)) {
										throw new Error(`Custom font "${fontName}" is not loaded. Please reload it.`);
									}
									font = await newPage.doc.embedFont(fontName);
								}
								fontCache.set(fontName, font);
							} catch (e) {
								console.warn('Font not found, falling back to Helvetica', e);
								if (isCustom || !stdFonts.includes(fontName)) {
									alert(`Failed to embed font "${fontName}": ${e.message}\nFalling back to Helvetica.`);
								}
								const fallbackName = pdfLib.StandardFonts.Helvetica;
								font = fontCache.get(fallbackName);
								if (!font) {
									font = await newPage.doc.embedFont(fallbackName);
									fontCache.set(fallbackName, font);
								}
							}
						}

						let drawX = boxX + offX + xPt;
						const drawY = boxY + boxH - offY - yPt - fontSize;
						
						if (style.align === 'center') {
							const width = font.widthOfTextAtSize(text, fontSize);
							drawX -= width / 2;
						} else if (style.align === 'right') {
							const width = font.widthOfTextAtSize(text, fontSize);
							drawX -= width;
						}

						const c = style.color || [0, 0, 0, 1];
						const opacity = style.opacity !== undefined ? style.opacity : 1;

						newPage.drawText(text, { x: drawX, y: drawY, size: fontSize, font: font, color: (window.styleTextColor) ? window.styleTextColor(style, pdfLib) : cmyk(c[0], c[1], c[2], c[3]), opacity: opacity });
					}
				}
			}
		}
	window.drawPdfPageOverlays = async function(newPage, pdfLib) {
    if (!window.__pluginPdfDrawCache) {
        window.__pluginPdfDrawCache = new Map();
    }
    const cache = window.__pluginPdfDrawCache;
    window.impositionfix._overlays.forEach(o => {
        if (o.visible === false) return;
        if (typeof o.drawPdf !== 'function') return;
        if (!cache.has(o)) {
            const origDrawPdf = o.drawPdf;
            const norm = (v) => (v > 1 ? v / 255 : v);
            const wrapColor = (fn) => {
                return (...args) => fn(...args.map(a => (typeof a === 'number' ? norm(a) : a)));
            };
            const wrapped = async function(newPage, boxX, boxY, boxW, boxH, pdfLib, pageNum, offset, slotIndex, pagesToRender) {
                const proxyPage = new Proxy(newPage, {
                    get(target, prop) {
                        const val = target[prop];
                        if (typeof val === 'function') {
                            return function(...args) {
                                const opts = args[0];
                                if (opts && typeof opts === 'object' && 'y' in opts && boxH > 0) {
                                    opts.y = boxY + boxH - opts.y;
                                }
                                return val.call(target, ...args);
                            };
                        }
                        return val;
                    }
                });
                const proxyPdfLib = new Proxy(pdfLib, {
                    get(target, prop) {
                        const val = target[prop];
                        if (prop === 'rgb' || prop === 'cmyk') {
                            return wrapColor(val.bind(target));
                        }
                        return val;
                    }
                });
                await origDrawPdf.call(o, proxyPage, boxX, boxY, boxW, boxH, proxyPdfLib, pageNum, offset, slotIndex, pagesToRender);
            };
            cache.set(o, wrapped);
        }
        try { cache.get(o).call(o, newPage, 0, 0, 0, 0, pdfLib, 1, {x: 0, y: 0, r: 0, b: 0}, -1, null); } catch(e) { console.error('Overlay drawPdf error:', o.id || o.name, e); }
    });
};
    } catch(e){
		console.error('Error drawing overlays: ' + e.message);
	}
};

// Draw sheet-level overlays (like Color Bars)
window.drawSheetOverlays = function() {
	document.querySelectorAll('.sheet-overlay-layer').forEach(e => e.remove());
	if(!window.__overlays || !window.__overlays.length) return;

	const sheets = document.querySelectorAll('.page');
	if (!sheets.length) return;
	
	const pxPerMm = 96 / 25.4;

	// Pre-calculate section config for mixed signature sizes
	const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
	const cols = parseInt(document.getElementById('colsInput')?.value || 1);
	const slotsPerSheet = rows * cols;
	const prVal = document.getElementById('pageRangeInput')?.value || '';
	const isDuplex = prVal.includes('2sided') || prVal.includes('booklet');
	const pagesPerSheet = slotsPerSheet * (isDuplex ? 2 : 1);
	
	let sectionConfig = null;
	const nUpRegex = /(\d+)-?up\s*\(([^)]+)\)/gi;
	const matches = [...prVal.matchAll(nUpRegex)];
	if (matches.length > 0 && window.parsePageOrder) {
		sectionConfig = [];
		let currentSheet = 0;
		let currentSig = 0;
		for (const m of matches) {
			const n = parseInt(m[1], 10);
			const content = m[2];
			const slots = window.parsePageOrder(content).length;
			const sheetsCount = Math.ceil(slots / slotsPerSheet);
			const sheetsPerSig = Math.ceil(n / pagesPerSheet);
			const numSigs = Math.ceil(sheetsCount / sheetsPerSig);
			
			sectionConfig.push({ start: currentSheet, end: currentSheet + sheetsCount, n: n, startSig: currentSig });
			currentSheet += sheetsCount;
			currentSig += numSigs;
		}
	}

	sheets.forEach(sheet => {
		const layer = document.createElement('div');
		layer.className = 'sheet-overlay-layer';
		Object.assign(layer.style, { position:'absolute', top:'0', left:'0', width:'100%', height:'100%', pointerEvents:'none', zIndex:'10000' });

		window.__overlays.forEach(ov => {
			if (ov.visible === false) return;
			if (ov.type === 'colorbar') {
				const cellSize = (parseFloat(ov.cellSize) || 5) * pxPerMm;
				const x = (parseFloat(ov.x) || 0) * pxPerMm;
				const y = (parseFloat(ov.y) || 0) * pxPerMm;
				const limitVal = (parseFloat(ov.limit) || 0) * pxPerMm;
				const isVert = !!ov.vertical;
				const isRepeat = !!ov.repeat;
				const hasRegBorder = !!ov.regBorder;
				const colors = ['#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#808080', '#C0C0C0'];
				
				const sheetLimit = isVert ? sheet.clientHeight : sheet.clientWidth;
				const startPos = isVert ? y : x;
				const endPos = (limitVal > 0) ? (startPos + limitVal) : sheetLimit;
				let i = 0;
				const epsilon = 0.01;

				while (true) {
					const currentPos = startPos + i * cellSize;
					if (currentPos >= endPos - epsilon) break;
					if (!isRepeat && i >= colors.length) break;
					
					const c = colors[i % colors.length];
					const div = document.createElement('div');
					Object.assign(div.style, { position:'absolute', width:cellSize+'px', height:cellSize+'px', backgroundColor:c, boxSizing: 'border-box' });
					if (hasRegBorder) {
						div.style.border = '0.25pt solid black';
					}
					if (isVert) {
						div.style.left = x + 'px';
						div.style.top = currentPos + 'px';
					} else {
						div.style.left = currentPos + 'px';
						div.style.top = y + 'px';
					}
					layer.appendChild(div);
					i++;
				}
			}
			if (ov.type === 'duplex') {
				const size = (parseFloat(ov.size) || 5) * pxPerMm;
				const thick = (parseFloat(ov.thickness) || 0.2) * pxPerMm;
				const marginX = (parseFloat(ov.x) || 0) * pxPerMm;
				const marginY = (parseFloat(ov.y) || 0) * pxPerMm;
				const sheetW = sheet.clientWidth;
				const sheetH = sheet.clientHeight;

				const color = 'black';

				const positions = [
					{ x: marginX, y: marginY },
					{ x: sheetW - marginX, y: marginY },
					{ x: marginX, y: sheetH - marginY },
					{ x: sheetW - marginX, y: sheetH - marginY }
				];

				const sheetIndex = Array.from(sheets).indexOf(sheet);
				const isFront = (sheetIndex % 2 === 0);
				const bubbleSizeMm = isFront ? 1.5 : 3;
				const bubbleSizePx = bubbleSizeMm * pxPerMm;

				positions.forEach(pos => {
					const hDiv = document.createElement('div');
					Object.assign(hDiv.style, { position:'absolute', backgroundColor:color, height:Math.max(1, thick)+'px', width:size+'px', left:(pos.x - size/2)+'px', top:(pos.y - thick/2)+'px' });
					layer.appendChild(hDiv);

					const vDiv = document.createElement('div');
					Object.assign(vDiv.style, { position:'absolute', backgroundColor:color, width:Math.max(1, thick)+'px', height:size+'px', left:(pos.x - thick/2)+'px', top:(pos.y - size/2)+'px' });
					layer.appendChild(vDiv);

					const bubble = document.createElement('div');
					Object.assign(bubble.style, {
						position: 'absolute',
						width: bubbleSizePx + 'px',
						height: bubbleSizePx + 'px',
						borderRadius: '50%',
						left: (pos.x - bubbleSizePx/2) + 'px',
						top: (pos.y - bubbleSizePx/2) + 'px',
						boxSizing: 'border-box'
					});
					if (isFront) {
						bubble.style.backgroundColor = color;
					} else {
						bubble.style.border = Math.max(1, thick) + 'px solid ' + color;
					}
					layer.appendChild(bubble);
				});
			}
			if (ov.type === 'sigmark') {
				const w = (parseFloat(ov.width) || 1) * pxPerMm;
				const h = (parseFloat(ov.height) || 2) * pxPerMm;
				const step = (parseFloat(ov.step) || 0) * pxPerMm;
				const offX = (parseFloat(ov.x) || 0) * pxPerMm;
				const offY = (parseFloat(ov.y) || 0) * pxPerMm;
				
				let sigSize = parseInt(ov.sigSize) || 16;
				const sheetIndex = Array.from(sheets).indexOf(sheet);
				let relIndex = sheetIndex;
				let globalSigIndex = 0;

				if (sectionConfig) {
					const section = sectionConfig.find(s => sheetIndex >= s.start && sheetIndex < s.end);
					if (section) {
						sigSize = section.n;
						relIndex = sheetIndex - section.start;
						const sheetsPerSig = Math.ceil(sigSize / pagesPerSheet);
						globalSigIndex = section.startSig + Math.floor(relIndex / sheetsPerSig);
					}
				} else {
					const sheetsPerSig = Math.ceil(sigSize / pagesPerSheet);
					globalSigIndex = Math.floor(sheetIndex / sheetsPerSig);
				}
				
				const sheetsPerSig = Math.ceil(sigSize / pagesPerSheet);
				
				// Place only on first sheet of signature
				if (relIndex % sheetsPerSig === 0) {
					let slotX = window.__slotX || 0;
					if (window.__gridDuplexMirror && sheetIndex % 2 !== 0) {
						slotX = -slotX;
					}
					const slotY = window.__slotY || 0;
					const slotW = window.__slotW || 0;
					const slotH = window.__slotH || 0;
					
					const sheetW = sheet.clientWidth;
					const sheetH = sheet.clientHeight;
					
					// Calculate Grid Center
					const gridW = cols * slotW;
					const gridH = rows * slotH;
					
					const gridCenterX = (sheetW / 2) + slotX;
					const gridCenterY = (sheetH / 2) + slotY;

					// Left edge of 1st slot (Top-Left)
					const baseX = gridCenterX - (gridW / 2) + slotW;
					// Middle of 1st slot (Top-Left)
					const baseY = gridCenterY - (gridH / 2) + (slotH / 2);
					
					const toRgb = (c, m, y, k) => {
						const r = Math.round(255 * (1 - c) * (1 - k));
						const g = Math.round(255 * (1 - m) * (1 - k));
						const b = Math.round(255 * (1 - y) * (1 - k));
						return `rgb(${r},${g},${b})`;
					};
					const c = ov.cmyk || [0, 0, 0, 1];
					
					const div = document.createElement('div');
					Object.assign(div.style, {
						position: 'absolute',
						width: w + 'px',
						height: h + 'px',
						backgroundColor: toRgb(c[0], c[1], c[2], c[3]),
						left: (baseX - w/2 + offX) + 'px',
						top: (baseY - h/2 + offY + (globalSigIndex * step)) + 'px'
					});
					layer.appendChild(div);
				}
			}
		});
		sheet.appendChild(layer);
	});
};

window.drawPdfSheetOverlays = async function(newPage, pxToPt, pdfLib, sheetIndex, sheetWidthPt) {
	if(!window.__overlays) return;
	const { cmyk } = pdfLib;
	const pageH = newPage.getHeight();
	const mmToPt = 72 / 25.4;

	// Pre-calculate section config for mixed signature sizes
	const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
	const cols = parseInt(document.getElementById('colsInput')?.value || 1);
	const slotsPerSheet = rows * cols;
	const prVal = document.getElementById('pageRangeInput')?.value || '';
	const isDuplex = prVal.includes('2sided') || prVal.includes('booklet');
	const pagesPerSheet = slotsPerSheet * (isDuplex ? 2 : 1);
	
	let sectionConfig = null;
	const nUpRegex = /(\d+)-?up\s*\(([^)]+)\)/gi;
	const matches = [...prVal.matchAll(nUpRegex)];
	if (matches.length > 0 && window.parsePageOrder) {
		sectionConfig = [];
		let currentSheet = 0;
		let currentSig = 0;
		for (const m of matches) {
			const n = parseInt(m[1], 10);
			const content = m[2];
			const slots = window.parsePageOrder(content).length;
			const sheetsCount = Math.ceil(slots / slotsPerSheet);
			const sheetsPerSig = Math.ceil(n / pagesPerSheet);
			const numSigs = Math.ceil(sheetsCount / sheetsPerSig);

			sectionConfig.push({ start: currentSheet, end: currentSheet + sheetsCount, n: n, startSig: currentSig });
			currentSheet += sheetsCount;
			currentSig += numSigs;
		}
	}

	window.__overlays.forEach(ov => {
		if (ov.visible === false) return;
		if (ov.type === 'colorbar') {
			const cellSize = (parseFloat(ov.cellSize) || 5) * mmToPt;
			const x = (parseFloat(ov.x) || 0) * mmToPt;
			const yRaw = (parseFloat(ov.y) || 0) * mmToPt;
			const limitVal = (parseFloat(ov.limit) || 0) * mmToPt;
			const isVert = !!ov.vertical;
			const isRepeat = !!ov.repeat;
			const hasRegBorder = !!ov.regBorder;
			const colors = [
				[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], 
				[0, 0, 0, 1], [0, 0, 0, 0.5], [0, 0, 0, 0.25]
			];
			
			const pageW = newPage.getWidth();
			const pageLimit = isVert ? pageH : pageW;
			const startPos = isVert ? yRaw : x;
			const endPos = (limitVal > 0) ? (startPos + limitVal) : pageLimit;
			let i = 0;
			const epsilon = 0.01;

			while (true) {
				const currentPos = startPos + i * cellSize;
				if (currentPos >= endPos - epsilon) break;
				if (!isRepeat && i >= colors.length) break;

				const c = colors[i % colors.length];
				let drawX, drawY;
				if (isVert) {
					drawX = x;
					drawY = pageH - currentPos - cellSize;
				} else {
					drawX = currentPos;
					drawY = pageH - yRaw - cellSize;
				}
				const rectOptions = { x: drawX, y: drawY, width: cellSize, height: cellSize, color: cmyk(...c) };
				if (hasRegBorder) {
					rectOptions.borderColor = cmyk(1, 1, 1, 1);
					rectOptions.borderWidth = 0.25;
				}
				newPage.drawRectangle(rectOptions);
				i++;
			}
		}
		if (ov.type === 'duplex') {
			const size = (parseFloat(ov.size) || 5) * mmToPt;
			const thick = (parseFloat(ov.thickness) || 0.2) * mmToPt;
			const marginX = (parseFloat(ov.x) || 0) * mmToPt;
			const marginY = (parseFloat(ov.y) || 0) * mmToPt;
			const pageW = newPage.getWidth();

			// PDF Coords: (0,0) is Bottom-Left
			const positions = [
				{ x: marginX, y: pageH - marginY },
				{ x: pageW - marginX, y: pageH - marginY },
				{ x: marginX, y: marginY },
				{ x: pageW - marginX, y: marginY }
			];

			const color = cmyk(1,1,1,1);
			const isFront = (sheetIndex % 2 === 0);
			const bubbleDiamMm = isFront ? 1.5 : 3;
			const bubbleRadiusPt = (bubbleDiamMm / 2) * mmToPt;

			positions.forEach(pos => {
				newPage.drawRectangle({ x: pos.x - size/2, y: pos.y - thick/2, width: size, height: thick, color: color });
				newPage.drawRectangle({ x: pos.x - thick/2, y: pos.y - size/2, width: thick, height: size, color: color });
				if (isFront) {
					newPage.drawCircle({ x: pos.x, y: pos.y, size: bubbleRadiusPt, color: color });
				} else {
					newPage.drawCircle({ x: pos.x, y: pos.y, size: bubbleRadiusPt, borderColor: color, borderWidth: thick });
				}
			});
		}
		if (ov.type === 'sigmark') {
			const w = (parseFloat(ov.width) || 1) * mmToPt;
			const h = (parseFloat(ov.height) || 2) * mmToPt;
			const step = (parseFloat(ov.step) || 0) * mmToPt;
			const offX = (parseFloat(ov.x) || 0) * mmToPt;
			const offY = (parseFloat(ov.y) || 0) * mmToPt;
			
			let sigSize = parseInt(ov.sigSize) || 16;
			let relIndex = sheetIndex;
			let globalSigIndex = 0;

			if (sectionConfig) {
				const section = sectionConfig.find(s => sheetIndex >= s.start && sheetIndex < s.end);
				if (section) {
					sigSize = section.n;
					relIndex = sheetIndex - section.start;
					const sheetsPerSig = Math.ceil(sigSize / pagesPerSheet);
					globalSigIndex = section.startSig + Math.floor(relIndex / sheetsPerSig);
				}
			} else {
				const sheetsPerSig = Math.ceil(sigSize / pagesPerSheet);
				globalSigIndex = Math.floor(sheetIndex / sheetsPerSig);
			}
			
			const sheetsPerSig = Math.ceil(sigSize / pagesPerSheet);
			if (relIndex % sheetsPerSig === 0) {
				let slotX = (window.__slotX || 0) * pxToPt;
				if (window.__gridDuplexMirror && sheetIndex % 2 !== 0) {
					slotX = -slotX;
				}
				const slotY = (window.__slotY || 0) * pxToPt;
				const slotW = (window.__slotW || 0) * pxToPt;
				const slotH = (window.__slotH || 0) * pxToPt;
				
				// PDF Coords: (0,0) is Bottom-Left
				const pageW = newPage.getWidth();
				
				// Center of sheet in PDF coords
				const gridCenterX = (pageW / 2) + slotX;
				const gridCenterY = (pageH / 2) - slotY; // Invert Y for PDF
				
				const gridW = cols * slotW;
				const gridH = rows * slotH;

				// Left edge of 1st slot (Top-Left)
				const baseX = gridCenterX - (gridW / 2) + slotW;
				// Middle of 1st slot (Top-Left). Y is up, so Top is gridCenterY + gridH/2.
				const baseY = gridCenterY + (gridH / 2) - (slotH / 2);
				
				// Apply step (downwards in PDF means decreasing Y)
				const drawY = baseY - h/2 - offY - (globalSigIndex * step);
				const drawX = baseX - w/2 + offX;

				const c = ov.cmyk || [0, 0, 0, 1];

				newPage.drawRectangle({
					x: drawX,
					y: drawY,
					width: w,
					height: h,
					color: cmyk(c[0], c[1], c[2], c[3])
				});
			}
		}

	});
};

// --- Creep Compensation (Booklet / N-Up, Data tab) ---
// Detects folded-signature imposition and segments sides (.page elements)
// into signatures. Section ranges are global side indices.
window.getCreepInfo = function() {
    const rows = parseInt(document.getElementById('rowsInput')?.value || 1) || 1;
    const cols = parseInt(document.getElementById('colsInput')?.value || 1) || 1;
    const slotsPerSide = Math.max(1, rows * cols);
    const prVal = document.getElementById('pageRangeInput')?.value || '';
    const totalSides = document.querySelectorAll('.page').length;

    const isNUp = /(\d+)-?up/i.test(prVal);
    const isBooklet = prVal.includes('booklet');
    if(!isNUp && !isBooklet){
        return { active: false, reason: 'No booklet or N-up imposition in Page Range' };
    }
    if(totalSides <= 0){
        return { active: false, reason: 'No sheets in layout yet' };
    }
    if(cols < 2 || cols % 2 !== 0){
        return { active: false, reason: 'Grid needs an even number of columns (spine at horizontal centerline)' };
    }

    // Build signature sections:
    // - "N-up(...)" with content: actual slot count of the content
    // - bare "N-up": signature of N pages repeating to fill all sides
    // - remaining/booklet sides: one nested booklet signature
    let sections = [];
    let covered = 0;

    const bareRegex = /(?:^|[\s(])(\d+)-?up(?=\s|\)|$)/gi;
    let bm;
    while((bm = bareRegex.exec(prVal)) !== null){
        const n = parseInt(bm[1], 10);
        if(n >= 4 && n % 4 === 0){
            const sidesPerSig = Math.max(1, Math.ceil(n / slotsPerSide));
            for(let s = covered; s < totalSides; s += sidesPerSig){
                sections.push({ start: s, end: Math.min(s + sidesPerSig, totalSides) });
                covered = Math.min(s + sidesPerSig, totalSides);
                if(covered >= totalSides) break;
            }
            break; // one bare N-up token fills the whole document
        }
    }

    if(sections.length === 0){
        const nUpRegex = /(\d+)-?up\s*\(([^)]+)\)/gi;
        let m;
        while((m = nUpRegex.exec(prVal)) !== null && covered < totalSides){
            const n = parseInt(m[1], 10);
            if(!(n >= 4)) continue;
            let slotCount = n;
            try {
                const contentSlots = window.parsePageOrder ? window.parsePageOrder(m[2]).length : 0;
                if(contentSlots > 0) slotCount = Math.min(n, contentSlots);
            } catch(e){}
            // Parser rounds partial chunks up to a multiple of 4 pages
            slotCount = Math.ceil(slotCount / 4) * 4;
            const sidesCount = Math.max(1, Math.ceil(slotCount / slotsPerSide));
            for(let s = covered; s < totalSides; s += sidesCount){
                sections.push({ start: s, end: Math.min(s + sidesCount, totalSides) });
                covered = Math.min(s + sidesCount, totalSides);
                if(covered >= totalSides) break;
            }
            break; // one N-up expression fills the whole document range
        }
        if(covered < totalSides){
            sections.push({ start: Math.min(covered, totalSides), end: totalSides });
        }
    } else if(covered < totalSides){
        sections.push({ start: covered, end: totalSides });
    }

    return {
        active: true,
        rows: rows, cols: cols, slotsPerSide: slotsPerSide, totalSides: totalSides,
        sidesPerSheet: 2, // booklet & N-up are duplex: front/back per physical sheet
        sections: sections
    };
};

// Horizontal creep offset (mm) applied to a global preview slot index.
// Sign convention: away from the spine/gutter (spine = sheet centerline):
//   left-of-spine slots shift left (-x), right-of-spine slots shift right (+x).
// Innermost sheets get the biggest shift; outermost stays put unless centered
// distribution is on (then shifts are symmetric around the centerline).
window.getCreepOffsetMm = function(globalSlotIndex) {
    if(!window.__creepEnabled) return 0;
    const C = parseFloat(window.__creepTotal);
    if(!C || !isFinite(C)) return 0; // allow positive (away from spine) and negative (opposite side)
    if(typeof window.getCreepInfo !== 'function') return 0;
    const info = window.getCreepInfo();
    if(!info.active) return 0;

    const sheetIdx = Math.floor(globalSlotIndex / info.slotsPerSide);
    if(isNaN(sheetIdx) || sheetIdx < 0) return 0;
    const colInSide = Math.floor(globalSlotIndex % info.slotsPerSide) % info.cols;
    const mid = info.cols / 2;
    if(info.cols > 2 && colInSide === mid) return 0; // odd middle column safety
    const sign = (colInSide < mid) ? -1 : 1;

    const seg = info.sections.find(function(s){ return sheetIdx >= s.start && sheetIdx < s.end; });
    if(!seg) return 0;

    const segSides = seg.end - seg.start;
    const physSheets = Math.ceil(segSides / info.sidesPerSheet);
    if(physSheets < 2) return 0; // single-sheet signature has no pushout

    const localSide = sheetIdx - seg.start;
    const physIdx = Math.floor(localSide / info.sidesPerSheet); // 0-based from the first (outermost) sheet

    // Application modes:
    //   'total':     the entered value is distributed evenly over the N-1 steps
    //                between the anchored sheet and the far end.
    //   'per-sheet': the entered value itself is one fixed step added on top of
    //                each sheet as it moves away from the anchored sheet.
    //
    // Direction (which sheet of the signature is anchored / never moves):
    //   '1-n': the FIRST (outermost imposed) sheet of the signature stays in
    //          position; every following sheet shifts progressively further
    //          inward (this is the original monotonic growth).
    //   'n-1' (default): the INSIDE (last imposed / innermost) sheet stays in
    //          position, and the shift grows OUTWARD toward the first sheet.
    const anchorFirst = (window.__creepDirection === '1-n');
    const k = anchorFirst ? physIdx : (physSheets - 1 - physIdx); // 0 at the anchored sheet

    const stepSize = (window.__creepMode === 'per-sheet') ? C : (C / Math.max(1, physSheets - 1));
    return sign * (stepSize * k);
};

