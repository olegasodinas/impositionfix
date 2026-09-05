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

	const input = document.getElementById('fileInput');
	const info = document.getElementById('fileInfo');
	const boxInfo = document.getElementById('boxInfo');
	const preview = document.getElementById('filePreview');
	const previewElements = document.getElementsByClassName('preview');
	const rotationInput = document.getElementById('rotationInput');
	const fitImageBtn = document.getElementById('fitImageBtn');
	const previewContainer = document.getElementById('previewContainer');
	const transformProportionalCheckbox = document.getElementById('transformProportionalCheckbox');
	const scaleSlider = document.getElementById('scaleSlider');
	const rotationSlider = document.getElementById('rotationSlider');
	const scaleValue = document.getElementById('scaleValue');
	const pageEl = document.querySelector('.page');
	const nativeCheckbox = document.getElementById('nativeCheckbox');
	const offsetXInput = document.getElementById("offsetXInput");
	const offsetYInput = document.getElementById("offsetYInput");
	const skewXInput = document.getElementById("skewXInput");
	const skewYInput = document.getElementById("skewYInput");
	const slotXInput = null; // No dedicated slot transform inputs (placeholder for syncUI safety)
	const slotYInput = null; // No dedicated slot transform inputs (placeholder for syncUI safety)
	const offsetXSlider = document.getElementById("offsetXSlider");
	const offsetYSlider = document.getElementById("offsetYSlider");
	const skewXSlider = document.getElementById("skewXSlider");
	const skewYSlider = document.getElementById("skewYSlider");
	const boxXInput = document.getElementById("boxXInput");
	const boxYInput = document.getElementById('boxYInput');
	const rowsInput = document.getElementById('rowsInput');
	const colsInput = document.getElementById('colsInput');
	const rotPageCheck = document.getElementById('rotPageCheck');
	const rotPageNum = document.getElementById('rotPageNum');
	const scalePageCheck = document.getElementById('scalePageCheck');
	const scalePageNum = document.getElementById('scalePageNum');
	const skewPageCheck = document.getElementById('skewPageCheck');
	const skewPageNum = document.getElementById('skewPageNum');
	const offsetPageCheck = document.getElementById('offsetPageCheck');
	const offsetPageNum = document.getElementById('offsetPageNum');
	const slotPageCheck = document.getElementById('slotPageCheck');
	const slotPageNum = document.getElementById('slotPageNum');
	const pageRangeInput = document.getElementById('pageRangeInput');

	window.__currentScale = 1;
	window.__currentScaleX = 1;
	window.__currentScaleY = 1;
	window.__currentRotation = 0;
	window.__offsetX = 0;
	window.__offsetY = 0;
	window.__skewX = 0;
	window.__skewY = 0;
	window.__slotX = 0;
	window.__slotY = 0;
	window.__pageTransforms = {}; // { pageNum: { rotation, scaleX, scaleY, skewX, skewY } }
	window.__slotTransforms = {}; // { slotIndex: { rotation, scaleX, scaleY, skewX, skewY, layout, slotX, slotY } }
	window.__slotW = null;
	window.__slotH = null;
	window.__trimW = null;
	window.__trimH = null;
	window.__expandL = 0;
	window.__expandR = 0;
	window.__expandT = 0;
	window.__expandB = 0;
	window.__selectedPages = []; // Array of selected page numbers
	window.__selectedSlots = []; // Array of selected slot indices
	window.__filePageCounts = []; // Array of page counts for imported files [12, 28]
	window.__fileNames = []; // Array of file names corresponding to filePageCounts
	window.__importedFiles = []; // Array of File objects for reordering
	window.__selectedFileListPages = new Map(); // Map<fileIndex, Set<originalPageIndex>>
	window.__lastFileListClicked = null; // { fileIdx, viewIdx }
	window.__expandedFiles = new Set(); // Set of indices of expanded files in the list
	window.__frameBgCMYK = [0, 0, 0, 0];
	window.__frameBgString = 'transparent';
	window.__selectionMode = false;
	window.__selectionType = 'row'; // 'row' or 'col'
	window.__gridDuplexMirror = false;
	window.__mergeData = null;
	window.__mergeEnabled = false; // data merge active only when fold is open
	window.__mergeConfig = {};
	window.__mergeSource = { mode: 'all', page: 1 };
	window.__pdfDoc = null;
	window.__lastObjectURL = null;
	window.__appendFilesMode = false;
	window.__projectActive = false;
	window.__projectName = '';
	window.__preservePageRange = false;
	// Prefer upscaling to the viewport instead of rotating the canvas for 90/270°
	window.__preferUpscaleNotRotate = true;
	// Render as Native Object instead of Canvas
	window.__renderNative = false;
	// Which page to render by default (1 = first page). Use 'all' to render all pages.
	window.__currentPage = 1;
	// Toggle to show page numbers instead of content
	window.__showPageNumbers = false;
	// DPI used when rasterizing PDF pages (multiplier relative to 96 DPI).
	window.__placedDpi = 96;

	// Creep compensation for Booklet / N-up imposition (Data tab).
	// __creepTotal = total pushout allowance in mm across a signature depth.
	window.__creepEnabled = false;
	// Signed amount (mm): positive = shift away from the spine, negative = opposite side.
	window.__creepTotal = 0;
	window.__creepCentered = true;
	// Direction of anchoring within each signature:
	//   'n-1' (default): the INSIDE (last imposed / innermost) sheet stays in
	//          position, creep grows outward to the first sheet.
	//   '1-n': the FIRST (outermost) sheet stays in position, creep grows inward.
	window.__creepDirection = 'n-1';
	// 'total': distribute Total Creep evenly across the signature depth.
	// 'per-sheet': value acts as fixed step; every sheet further from the
	// anchored sheet shifts by one additional full step.
	window.__creepMode = 'total';
	// Apply creep to content only (false) OR shift the slot frame together (true).
	window.__creepWithFrame = true;
	window.__placedDpi = 96;

	// PDF.js Configuration
	window.__pdfConfig = {
		src: 'libs/pdf.min.js',
		workerSrc: 'libs/pdf.worker.min.js'
	};

	// Helper to create consistent toolbox buttons
	window.createToolboxBtn = function(icon, text, onClick, title) {
		const btn = document.createElement('button');
		btn.className = 'toolbox-btn';
		btn.style.display = 'flex';
		btn.style.alignItems = 'center';
		btn.style.justifyContent = 'center';
		btn.style.gap = '4px';
		let html = '';
		if (icon) html += `<span class="material-icons" style="vertical-align:middle; font-size:16px">${icon}</span>`;
		if (text) html += text;
		btn.innerHTML = html;
		if (onClick) btn.onclick = onClick;
		if (title) btn.title = title;
		return btn;
	};
	window.createDeleteBtn = function(onClick, title = "Delete") {
		const btn = window.createToolboxBtn('delete', null, onClick, title);
		btn.classList.add('toolbox-icon-btn');
		return btn;
	};

	// Helper for prompts (custom in-page dialog instead of native prompt())
	window.showPrompt = function(message, defaultValue, callback) {
		const dialog = document.createElement('div');
		Object.assign(dialog.style, {
			position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
			backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '3500', display: 'flex',
			alignItems: 'center', justifyContent: 'center'
		});

		const content = document.createElement('div');
		Object.assign(content.style, {
			backgroundColor: '#222', padding: '20px', borderRadius: '8px',
			border: '1px solid #444', width: '300px', color: '#eee',
			boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
		});

		content.innerHTML = `
			<h3 style="margin-top:0; margin-bottom:15px; font-size:14px; color:#fff">${message}</h3>
			<input type="text" id="promptInput" class="toolbox-input" style="width:100%; margin-bottom:20px; box-sizing:border-box" value="${defaultValue || ''}">
			<div style="display:flex; justify-content:flex-end; gap:10px">
				<button id="promptCancel" class="toolbox-btn" style="width:auto; padding:6px 12px">Cancel</button>
				<button id="promptOk" class="toolbox-btn" style="width:auto; padding:6px 12px; background-color:#00bcd4; color:#000; font-weight:bold">OK</button>
			</div>
		`;

		dialog.appendChild(content);
		document.body.appendChild(dialog);

		const input = document.getElementById('promptInput');
		input.focus();
		input.select();

		const close = () => document.body.removeChild(dialog);

		document.getElementById('promptCancel').onclick = close;
		
		const confirm = () => {
			const val = input.value.trim();
			close();
			if (callback) callback(val);
		};

		document.getElementById('promptOk').onclick = confirm;
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') confirm();
			if (e.key === 'Escape') close();
		});
	};
