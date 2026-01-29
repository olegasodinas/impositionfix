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
	const smartFitCheckbox = document.getElementById('smartFitCheckbox');
	const previewContainer = document.getElementById('previewContainer');
	const unlockRatioCheckbox = document.getElementById('unlockRatioCheckbox');
	const scaleSlider = document.getElementById('scaleSlider');
	const rotationSlider = document.getElementById('rotationSlider');
	const scaleValue = document.getElementById('scaleValue');
	const pageEl = document.querySelector('.page');
	const nativeCheckbox = document.getElementById('nativeCheckbox');
	const offsetXInput = document.getElementById('offsetXInput');
	const offsetYInput = document.getElementById('offsetYInput');
	const skewXInput = document.getElementById('skewXInput');
	const skewYInput = document.getElementById('skewYInput');
	const offsetXSlider = document.getElementById('offsetXSlider');
	const offsetYSlider = document.getElementById('offsetYSlider');
	const skewXSlider = document.getElementById('skewXSlider');
	const skewYSlider = document.getElementById('skewYSlider');
	const boxXInput = document.getElementById('boxXInput');
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
	window.__frameBgCMYK = [0, 0, 0, 0];
	window.__frameBgString = 'transparent';
	window.__selectionMode = false;
	window.__selectionType = 'row'; // 'row' or 'col'
	window.__pdfDoc = null;
	window.__lastObjectURL = null;
	// Prefer upscaling to the viewport instead of rotating the canvas for 90/270°
	window.__preferUpscaleNotRotate = false;
	// Render as Native Object instead of Canvas
	window.__renderNative = false;
	// Which page to render by default (1 = first page). Use 'all' to render all pages.
	window.__currentPage = 1;
	// Toggle to show page numbers instead of content
	window.__showPageNumbers = false;
	// DPI used when rasterizing PDF pages (multiplier relative to 96 DPI).
	window.__placedDpi = 96;

	// PDF.js Configuration
	window.__pdfConfig = {
		src: 'libs/pdf.min.js',
		workerSrc: 'libs/pdf.worker.min.js'
	};
