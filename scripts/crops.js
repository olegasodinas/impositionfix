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

	// Get settings
	const getVal = (id, def) => {
		const el = document.getElementById(id);
		if(!el) return def;
		const v = parseFloat(el.value);
		return isFinite(v) ? v : def;
	};

	const pxPerMm = 96 / 25.4;
	// Use trim size if available (base size without expansion), else full slot size
	const trimW = window.__trimW || window.__slotW;
	const trimH = window.__trimH || window.__slotH;
	const slotW = trimW;
	const slotH = trimH;
	if(!slotW || !slotH) return;

	const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
	const cols = parseInt(document.getElementById('colsInput')?.value || 1);
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

	// Assume all sheets are same size, calculate metrics once
	const refSheet = containers[0];
	const centerX = (refSheet.clientWidth / 2) + (window.__slotX || 0);
	const centerY = (refSheet.clientHeight / 2) + (window.__slotY || 0);

	// Calculate Grid Metrics
	// The grid is centered on the sheet (at centerX, centerY).
	// Grid total size is cols*slotW, rows*slotH.
	const gridTotalW = cols * slotW;
	const gridTotalH = rows * slotH;
	const gridLeft = centerX - (gridTotalW / 2);
	const gridTop = centerY - (gridTotalH / 2);

	// Vertical Marks (Top/Bottom)
	// Positioned relative to the center of the grid (or sheet)
	// Top marks start above the grid top edge
	const startY = gridTop - gapY;
	const endY = startY - len; // Draw UP
	const startY_Bottom = gridTop + gridTotalH + gapY;
	const endY_Bottom = startY_Bottom + len; // Draw DOWN

	// Horizontal Marks (Left/Right)
	const startX_Left = gridLeft - gapX;
	const endX_Left = startX_Left - len; // Draw LEFT
	const startX_Right = gridLeft + gridTotalW + gapX;
	const endX_Right = startX_Right + len; // Draw RIGHT

	// Helper to get center of slot i
	const getSlotCenterX = (colIndex) => gridLeft + (colIndex * slotW) + (slotW / 2);
	const getSlotCenterY = (rowIndex) => gridTop + (rowIndex * slotH) + (slotH / 2);

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
	containers.forEach(container => {
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
		for(let i=1; i<cols; i++){
			const x = gridLeft + (i * slotW);
			// Right cut of left slot
			const x1 = x - innerBleedX;
			svg.appendChild(createLine(x1, startY, x1, endY, innerDash));
			svg.appendChild(createLine(x1, startY_Bottom, x1, endY_Bottom, innerDash));
			
			// Left cut of right slot
			const x2 = x + innerBleedX;
			svg.appendChild(createLine(x2, startY, x2, endY, innerDash));
			svg.appendChild(createLine(x2, startY_Bottom, x2, endY_Bottom, innerDash));
		}

		// Inner Horizontal Marks (Between rows)
		for(let i=1; i<rows; i++){
			const y = gridTop + (i * slotH);
			// Bottom cut of top slot
			const y1 = y - innerBleedY;
			svg.appendChild(createLine(startX_Left, y1, endX_Left, y1, innerDash));
			svg.appendChild(createLine(startX_Right, y1, endX_Right, y1, innerDash));
			
			// Top cut of bottom slot
			const y2 = y + innerBleedY;
			svg.appendChild(createLine(startX_Left, y2, endX_Left, y2, innerDash));
			svg.appendChild(createLine(startX_Right, y2, endX_Right, y2, innerDash));
		}

		container.appendChild(svg);
	});
};