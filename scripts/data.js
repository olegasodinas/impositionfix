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
		if (['colorbar', 'duplex', 'sigmark'].includes(overlay.type)) return;

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
				if (window.__customFonts && window.__customFonts[fam]) {
					fontFamily = `"${fam}", sans-serif`;
				} else if (fam.startsWith('Times')) fontFamily = '"Times New Roman", serif';
				else if (fam.startsWith('Courier')) fontFamily = '"Courier New", monospace';
				else fontFamily = 'sans-serif';

				const fStyle = style.fontStyle || 'Normal';
				
				// Check for variable font mapping
				if (window.__fontVariationsCache && window.__fontVariationsCache[fam] && window.__fontVariationsCache[fam].map[fStyle]) {
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

				const c = style.color || [0, 0, 0, 1];
				color = `rgb(${Math.round(255*(1-c[0])*(1-c[3]))},${Math.round(255*(1-c[1])*(1-c[3]))},${Math.round(255*(1-c[2])*(1-c[3]))})`;
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
	if(window.__mergeData && window.__mergeData.headers && window.__mergeConfig){
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
					if (window.__customFonts && window.__customFonts[fam]) {
						div.style.fontFamily = `"${fam}", sans-serif`;
					} else if (fam.startsWith('Times')) div.style.fontFamily = '"Times New Roman", serif';
					else if (fam.startsWith('Courier')) div.style.fontFamily = '"Courier New", monospace';
					else div.style.fontFamily = 'sans-serif';

					const fStyle = style.fontStyle || 'Normal';
					
					if (window.__fontVariationsCache && window.__fontVariationsCache[fam] && window.__fontVariationsCache[fam].map[fStyle]) {
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
					
					const c = style.color || [0, 0, 0, 1];
					div.style.color = toRgb(c[0], c[1], c[2], c[3]);
					if (style.opacity !== undefined) div.style.opacity = style.opacity;
					div.style.whiteSpace = 'nowrap';

					container.appendChild(div);
				}
			}
		});
	}
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
				
				const isCustom = window.__customFonts && window.__customFonts[fontName];
				
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
							font = await newPage.doc.embedFont(window.__customFonts[fontName].slice(0), { subset: true });
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
					color: cmyk(color[0], color[1], color[2], color[3]),
					opacity: opacity
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
		if(window.__mergeData && window.__mergeData.headers && window.__mergeConfig){
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
						const isCustom = window.__customFonts && window.__customFonts[fontName];
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
									font = await newPage.doc.embedFont(window.__customFonts[fontName].slice(0), { subset: true });
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

						newPage.drawText(text, { x: drawX, y: drawY, size: fontSize, font: font, color: cmyk(c[0], c[1], c[2], c[3]), opacity: opacity });
					}
				}
			}
		}

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
