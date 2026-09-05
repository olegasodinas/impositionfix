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

// Crop Marks: Draw crop marks on the sheet (outside the grid)
window.drawSheetCropMarks = function(){
	const containers = document.querySelectorAll('.page');
	if(!containers.length) return;

	// Clear existing marks on all sheets
	document.querySelectorAll('.sheet-crop-marks').forEach(e => e.remove());

	const showCheck = document.getElementById('showCropMarksCheck');
	if(showCheck && !showCheck.checked) return;

	// Get settings
	const getVal = (id, def) => {
		const el = document.getElementById(id);
		if(!el) return def;
		const v = parseFloat(el.value);
		return isFinite(v) ? v : def;
	};

	const pxPerMm = 96 / 25.4;
	const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
	const cols = parseInt(document.getElementById('colsInput')?.value || 1);
	const slotsPerSheet = rows * cols;

	const gapX = getVal('markGapXInput', 3) * pxPerMm;
	const gapY = getVal('markGapYInput', 3) * pxPerMm;
	const len = getVal('markLengthInput', 4) * pxPerMm;
	const bleedX = getVal('cropBleedXInput', 2) * pxPerMm;
	const bleedY = getVal('cropBleedYInput', 2) * pxPerMm;
	const innerBleedX = getVal('innerCropBleedXInput', 0) * pxPerMm;
	const innerBleedY = getVal('innerCropBleedYInput', 0) * pxPerMm;
	
	const innerStyle = document.getElementById('innerCropStyleSelect')?.value || 'solid';
	let innerDash = null;
	if(innerStyle === 'dashed') innerDash = '4,2';
	else if(innerStyle === 'dotted') innerDash = '1,2';

	const createLine = (x1, y1, x2, y2, dashArray) => {
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', x1);
		line.setAttribute('y1', y1);
		line.setAttribute('x2', x2);
		line.setAttribute('y2', y2);
		line.setAttribute('stroke', 'black');
		line.setAttribute('stroke-width', '1');
		if(dashArray) line.setAttribute('stroke-dasharray', dashArray);
		return line;
	};

	// Draw on each sheet
	containers.forEach((container, sheetIndex) => {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('class', 'sheet-crop-marks');
		svg.style.position = 'absolute';
		svg.style.top = '0';
		svg.style.left = '0';
		svg.style.width = '100%';
		svg.style.height = '100%';
		svg.style.pointerEvents = 'none';
		svg.style.zIndex = '9999';
		svg.style.overflow = 'visible';

		// Calculate actual column widths and row heights for this specific sheet
		const colWidths = new Array(cols).fill(0);
		const rowHeights = new Array(rows).fill(0);
		const previews = Array.from(container.querySelectorAll('.preview'));

		previews.forEach((el, i) => {
			const r = Math.floor(i / cols);
			const c = i % cols;
			const pageNum = parseInt(el.dataset.pageNum);
			const slotT = (window.__slotTransforms && window.__slotTransforms[sheetIndex * slotsPerSheet + i]) || {};
			const pageT = (pageNum && window.__pageTransforms && window.__pageTransforms[pageNum]) || {};
			const layout = slotT.layout || pageT.layout || {};

			const w = (layout.width !== undefined) ? layout.width : (window.__slotW || 0);
			const h = (layout.height !== undefined) ? layout.height : (window.__slotH || 0);
			const l_exp = (layout.expandL !== undefined) ? layout.expandL : (window.__expandL || 0);
			const r_exp = (layout.expandR !== undefined) ? layout.expandR : (window.__expandR || 0);
			const t_exp = (layout.expandT !== undefined) ? layout.expandT : (window.__expandT || 0);
			const b_exp = (layout.expandB !== undefined) ? layout.expandB : (window.__expandB || 0);

			const curTrimW = w - (l_exp + r_exp);
			const curTrimH = h - (t_exp + b_exp);

			if (c < cols) colWidths[c] = Math.max(colWidths[c], curTrimW);
			if (r < rows) rowHeights[r] = Math.max(rowHeights[r], curTrimH);
		});

		const gridTotalW = colWidths.reduce((a, b) => a + b, 0);
		const gridTotalH = rowHeights.reduce((a, b) => a + b, 0);

		if (gridTotalW <= 0 || gridTotalH <= 0) return;

		// Calculate metrics per sheet to support mirroring
		let currentSlotX = window.__slotX || 0;
		if (window.__gridDuplexMirror && sheetIndex % 2 !== 0) {
			currentSlotX = -currentSlotX;
		}
		const centerX = (container.clientWidth / 2) + currentSlotX;
		const centerY = (container.clientHeight / 2) + (window.__slotY || 0);

		const gridLeft = centerX - (gridTotalW / 2);
		const gridTop = centerY - (gridTotalH / 2);

		// Vertical Marks (Top/Bottom)
		const startY = gridTop - gapY;
		const endY = startY - len; // Draw UP
		const startY_Bottom = gridTop + gridTotalH + gapY;
		const endY_Bottom = startY_Bottom + len; // Draw DOWN

		// Horizontal Marks (Left/Right)
		const startX_Left = gridLeft - gapX;
		const endX_Left = startX_Left - len; // Draw LEFT
		const startX_Right = gridLeft + gridTotalW + gapX;
		const endX_Right = startX_Right + len; // Draw RIGHT

		// Top-Left Vertical
		const xTL = gridLeft + bleedX;
		svg.appendChild(createLine(xTL, startY, xTL, endY));

		// Top-Right Vertical
		const xTR = gridLeft + gridTotalW - bleedX;
		svg.appendChild(createLine(xTR, startY, xTR, endY));

		// Bottom-Left Vertical
		const xBL = gridLeft + bleedX;
		svg.appendChild(createLine(xBL, startY_Bottom, xBL, endY_Bottom));

		// Bottom-Right Vertical
		const xBR = gridLeft + gridTotalW - bleedX;
		svg.appendChild(createLine(xBR, startY_Bottom, xBR, endY_Bottom));

		// Left-Top Horizontal
		const yLT = gridTop + bleedY;
		svg.appendChild(createLine(startX_Left, yLT, endX_Left, yLT));

		// Left-Bottom Horizontal
		const yLB = gridTop + gridTotalH - bleedY;
		svg.appendChild(createLine(startX_Left, yLB, endX_Left, yLB));

		// Right-Top Horizontal
		const yRT = gridTop + bleedY;
		svg.appendChild(createLine(startX_Right, yRT, endX_Right, yRT));

		// Right-Bottom Horizontal
		const yRB = gridTop + gridTotalH - bleedY;
		svg.appendChild(createLine(startX_Right, yRB, endX_Right, yRB));

		// Inner Vertical Marks (Between columns)
		let currentX = gridLeft;
		for(let i=1; i<cols; i++){
			currentX += colWidths[i-1];
			// Right cut of left slot
			const x1 = currentX - innerBleedX;
			svg.appendChild(createLine(x1, startY, x1, endY, innerDash));
			svg.appendChild(createLine(x1, startY_Bottom, x1, endY_Bottom, innerDash));
			
			// Left cut of right slot
			const x2 = currentX + innerBleedX;
			svg.appendChild(createLine(x2, startY, x2, endY, innerDash));
			svg.appendChild(createLine(x2, startY_Bottom, x2, endY_Bottom, innerDash));
		}

		// Inner Horizontal Marks (Between rows)
		let currentY = gridTop;
		for(let i=1; i<rows; i++){
			currentY += rowHeights[i-1];
			// Bottom cut of top slot
			const y1 = currentY - innerBleedY;
			svg.appendChild(createLine(startX_Left, y1, endX_Left, y1, innerDash));
			svg.appendChild(createLine(startX_Right, y1, endX_Right, y1, innerDash));
			
			// Top cut of bottom slot
			const y2 = currentY + innerBleedY;
			svg.appendChild(createLine(startX_Left, y2, endX_Left, y2, innerDash));
			svg.appendChild(createLine(startX_Right, y2, endX_Right, y2, innerDash));
		}

		container.appendChild(svg);
	});
};