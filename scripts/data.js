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

// Add overlays to the HTML preview slot
window.addPreviewOverlays = function(container, pageNum, offset) {
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

		if (overlay.type === 'numbering') {
			if (pageNum <= 0) return; // Don't number empty pages
			if (!isPageInRange(pageNum, overlay.pageRange)) return;
			const prefix = overlay.prefix || '';
			const digits = parseInt(overlay.digits) || 0;
			const numStr = String(pageNum).padStart(digits, '0');
			div.textContent = prefix + numStr;
			
			if (overlay.facingPages && pageNum % 2 === 0) {
				const xMm = parseFloat(overlay.x) || 0;
				const rightPos = offR + xMm * pxPerMm;
				div.style.left = 'auto';
				div.style.right = rightPos + 'px';
				div.style.textAlign = 'right';
			}

			// Convert pt to px for preview (1pt = 96/72 px)
			const ptSize = parseFloat(overlay.fontSize) || 12;
			const pxSize = ptSize * (96/72);
			div.style.fontSize = pxSize + 'px';
			
			// Map PDF font to CSS
			let fontFamily = 'sans-serif';
			let fontWeight = 'normal';
			let fontStyle = 'normal';
			const f = overlay.font || 'Helvetica';
			
			if(f.startsWith('Times')) fontFamily = '"Times New Roman", serif';
			else if(f.startsWith('Courier')) fontFamily = '"Courier New", monospace';
			
			if(f.includes('Bold')) fontWeight = 'bold';
			if(f.includes('Italic') || f.includes('Oblique')) fontStyle = 'italic';

			div.style.fontFamily = fontFamily;
			div.style.fontWeight = fontWeight;
			div.style.fontStyle = fontStyle;
			const c = overlay.cmyk || [0, 0, 0, 1];
			div.style.color = toRgb(c[0], c[1], c[2], c[3]);
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
};

window.updatePreviewOverlays = function(container, pageNum, offset) {
	const existing = container.querySelectorAll('.data-overlay');
	existing.forEach(el => el.remove());
	window.addPreviewOverlays(container, pageNum, offset);
};

// Draw overlays on the PDF page
window.drawPdfOverlays = async function(newPage, boxX, boxY, boxW, boxH, pdfLib, pageNum, offset) {
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
			const xMm = parseFloat(overlay.x) || 0;
			const yMm = parseFloat(overlay.y) || 0;
			const xPt = xMm * ptPerMm;
			const yPt = yMm * ptPerMm;
			
			if (overlay.type === 'numbering') {
				if (pageNum <= 0) continue;
				if (!isPageInRange(pageNum, overlay.pageRange)) continue;
				const fontSize = parseFloat(overlay.fontSize) || 12;
				const fontName = overlay.font || 'Helvetica';
				const prefix = overlay.prefix || '';
				const digits = parseInt(overlay.digits) || 0;
				const numStr = String(pageNum).padStart(digits, '0');
				const text = prefix + numStr;
				
				// Embed font
				let font = fontCache.get(fontName);
				if (!font) {
					try {
						font = await newPage.doc.embedFont(fontName);
						fontCache.set(fontName, font);
					} catch (e) {
						console.warn('Font not found, falling back to Helvetica', e);
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

				const drawY = boxY + boxH - offY - yPt - fontSize; // Approx baseline adjustment

				const c = overlay.cmyk || [0, 0, 0, 1];
				newPage.drawText(text, {
					x: drawX,
					y: drawY,
					size: fontSize,
					font: font,
					color: cmyk(c[0], c[1], c[2], c[3]),
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
		});
		sheet.appendChild(layer);
	});
};

window.drawPdfSheetOverlays = async function(newPage, pxToPt, pdfLib, sheetIndex, sheetWidthPt) {
	if(!window.__overlays) return;
	const { cmyk } = pdfLib;
	const pageH = newPage.getHeight();
	const mmToPt = 72 / 25.4;

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
	});
};
