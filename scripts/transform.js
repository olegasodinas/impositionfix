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

	// Debounce helper for expensive renders
	let __transformRenderTimeout;
	function triggerRenderDebounced(){
		clearTimeout(__transformRenderTimeout);
		__transformRenderTimeout = setTimeout(() => {
			if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		}, 100);
	}

	// Calculate offset vector to center content when rotating/skewing in PDF
	// PDF-Lib transforms around the anchor point (bottom-left). 
	// To keep content centered, we calculate the shift needed.
	window.calculatePdfTransformOffset = function(width, height, rotation, skewX, skewY, skewFactor){
		const halfW = width / 2;
		const halfH = height / 2;
		
		const rad = -(rotation || 0) * (Math.PI / 180);
		const skX = (skewFactor || -1) * (skewX || 0) * (Math.PI / 180);
		const skY = (skewFactor || -1) * (skewY || 0) * (Math.PI / 180);

		// 1. Apply Skew to the center vector
		const skewedX = halfW + halfH * Math.tan(skX);
		const skewedY = halfH + halfW * Math.tan(skY);

		// 2. Apply Rotation to the skewed vector
		const vecX = skewedX * Math.cos(rad) - skewedY * Math.sin(rad);
		const vecY = skewedX * Math.sin(rad) + skewedY * Math.cos(rad);
		
		return { x: vecX, y: vecY };
	};

	// Helper: Apply transform to a layer (avoids duplication)
	window.applyPageTransform = function(el, x, y, rot, sX, sY, skX, skY){
		if(!el) return;
		el.style.transform = 'translate(' + (x||0) + 'px,' + (y||0) + 'px) rotate(' + (rot||0) + 'deg) scale(' + (sX||1) + ', ' + (sY||1) + ') skew(' + (skX||0) + 'deg,' + (skY||0) + 'deg)';
	};

	// Optimized update: Apply transforms to existing DOM without re-rendering PDF
	window.updatePageTransformsOnly = function(){
		const previewEls = document.getElementsByClassName('preview');

		// Globals
		const gRot = window.__currentRotation || 0;
		let gSX = window.__currentScaleX || 1;
		let gSY = window.__currentScaleY || 1;
		let gOffX = window.__offsetX || 0;
		let gOffY = window.__offsetY || 0;
		const gSkX = window.__skewX || 0;
		const gSkY = window.__skewY || 0;

		let globalFitMode = null;
		if (window.__preferUpscaleNotRotate) globalFitMode = 'fit';
		else if (window.__fillImage) globalFitMode = 'fill';
		else if (window.__stretchImage) globalFitMode = 'stretch';

		// Note: We check per-slot override inside the loop
		const globalIgnore = !!globalFitMode;
		if(globalIgnore) { gOffX = 0; gOffY = 0; }

		for(let i=0; i<previewEls.length; i++){
			const container = previewEls[i].querySelector('.preview-page-layer');
			if(!container) continue;
			
			// Read actual page number from the DOM (handles snake/reordering correctly)
			const pageNum = parseInt(previewEls[i].dataset.pageNum);
			if(!pageNum) continue;

			const slotT = (window.__slotTransforms && window.__slotTransforms[i]) || {};
			const pageT = (window.__pageTransforms && window.__pageTransforms[pageNum]) || {};

			const fitMode = slotT.fitMode || pageT.fitMode || globalFitMode;
			const ignoreTransforms = !!fitMode;

			const r = (typeof slotT.rotation === 'number') ? slotT.rotation : ((typeof pageT.rotation === 'number') ? pageT.rotation : gRot);
			let sx = (typeof slotT.scaleX === 'number') ? slotT.scaleX : ((typeof pageT.scaleX === 'number') ? pageT.scaleX : gSX);
			let sy = (typeof slotT.scaleY === 'number') ? slotT.scaleY : ((typeof pageT.scaleY === 'number') ? pageT.scaleY : gSY);
			let offX = (typeof slotT.offsetX === 'number') ? slotT.offsetX : ((typeof pageT.offsetX === 'number') ? pageT.offsetX : gOffX);
			let offY = (typeof slotT.offsetY === 'number') ? slotT.offsetY : ((typeof pageT.offsetY === 'number') ? pageT.offsetY : gOffY);
			
			const skX = (typeof slotT.skewX === 'number') ? slotT.skewX : ((typeof pageT.skewX === 'number') ? pageT.skewX : gSkX);
			const skY = (typeof slotT.skewY === 'number') ? slotT.skewY : ((typeof pageT.skewY === 'number') ? pageT.skewY : gSkY);

			if(ignoreTransforms) { 
				offX = 0; offY = 0; 
				sx = 1; sy = 1; // Reset to 1 so we don't inherit slider values
				// Calculate Smart Fit scale on the fly for CSS update
				const origW = parseFloat(container.dataset.origW);
				const origH = parseFloat(container.dataset.origH);
				const availW = parseFloat(container.dataset.availW);
				const availH = parseFloat(container.dataset.availH);
				const baseScale = parseFloat(container.dataset.baseScale) || 1;
				if(origW && origH && availW && availH && window.calculatePageFit){
					const fit = window.calculatePageFit(origW, origH, availW, availH, r, skX, skY, fitMode);
					if(fitMode === 'stretch'){
						sx = fit.scaleX / baseScale;
						sy = fit.scaleY / baseScale;
					} else {
						sx = fit.scale / baseScale;
						sy = fit.scale / baseScale;
					}
				}
			}

			const baked = parseFloat(container.dataset.bakedRotation) || 0;
			const cssRot = r - baked;

			// Calculate expansion offset per page
			const layout = slotT.layout || pageT.layout || {};
			const l = (layout.expandL !== undefined) ? layout.expandL : (window.__expandL || 0);
			const r_exp = (layout.expandR !== undefined) ? layout.expandR : (window.__expandR || 0);
			const top = (layout.expandT !== undefined) ? layout.expandT : (window.__expandT || 0);
			const bot = (layout.expandB !== undefined) ? layout.expandB : (window.__expandB || 0);
			const expandOffsetX = (l - r_exp) / 2;
			const expandOffsetY = (top - bot) / 2;

			if(window.applyPageTransform) window.applyPageTransform(container, offX + expandOffsetX, offY + expandOffsetY, cssRot, sx, sy, skX, skY);
		}
	};

	// Adjust content scaling (external API)
	window.adjustContentScale = function(scaleX, scaleY, pageNums){
		const transformAll = document.getElementById('transformAllPagesCheckbox')?.checked;
		if(!transformAll && window.__selectedSlots && window.__selectedSlots.length > 0){
			window.__selectedSlots.forEach(i => {
				if(!window.__slotTransforms[i]) window.__slotTransforms[i] = {};
				if(typeof scaleX === 'number') window.__slotTransforms[i].scaleX = scaleX;
				if(typeof scaleY === 'number') window.__slotTransforms[i].scaleY = scaleY;
			});
			window.updatePageTransformsOnly();
			return;
		}

		const pages = (Array.isArray(pageNums)) ? pageNums : (pageNums ? [pageNums] : []);
		const firstPage = pages.length > 0 ? pages[0] : null;

		// Resolve X
		if(typeof scaleX !== 'number'){
			scaleX = (firstPage && window.__pageTransforms[firstPage] && typeof window.__pageTransforms[firstPage].scaleX === 'number') 
				? window.__pageTransforms[firstPage].scaleX 
				: (window.__currentScaleX || 1);
		}
		// Resolve Y
		if(typeof scaleY !== 'number'){
			scaleY = (firstPage && window.__pageTransforms[firstPage] && typeof window.__pageTransforms[firstPage].scaleY === 'number') 
				? window.__pageTransforms[firstPage].scaleY 
				: (window.__currentScaleY || 1);
		}

		if(pages.length > 0){
			pages.forEach(p => {
				if(!window.__pageTransforms[p]) window.__pageTransforms[p] = {};
				window.__pageTransforms[p].scaleX = scaleX;
				window.__pageTransforms[p].scaleY = scaleY;
			});
		} else {
			if(transformAll){
				// Clear overrides to enforce global
				if(window.__slotTransforms) Object.values(window.__slotTransforms).forEach(t => { delete t.scaleX; delete t.scaleY; });
				if(window.__pageTransforms) Object.values(window.__pageTransforms).forEach(t => { delete t.scaleX; delete t.scaleY; });
				// Also clear fit modes that might conflict
				window.__preferUpscaleNotRotate = false;
				window.__fillImage = false;
				window.__stretchImage = false;
			}

			window.__currentScale = scaleX; // Legacy/Reference
			window.__currentScaleX = scaleX;
			window.__currentScaleY = scaleY;
		}

		const offX = window.__offsetX || 0;
		const offY = window.__offsetY || 0;
		// Update transforms directly
		window.updatePageTransformsOnly();

		// Update mm inputs if available and not focused
		if(window.__fileWidthMm && window.__fileHeightMm){
			const wIn = document.getElementById('widthInput');
			const hIn = document.getElementById('heightInput');
			if(wIn && document.activeElement !== wIn) wIn.value = (window.__fileWidthMm * scaleX).toFixed(2);
			if(hIn && document.activeElement !== hIn) hIn.value = (window.__fileHeightMm * scaleY).toFixed(2);
		}

		// Update slider
		const slider = document.getElementById('scaleSlider');
		const valEl = document.getElementById('scaleValue');
		if(slider && document.activeElement !== slider){
			slider.value = Math.round(scaleX * 100);
			if(valEl) valEl.textContent = Math.round(scaleX * 100) + '%';
		}
	};

	// Adjust content offset (external API)
	window.adjustContentOffset = function(x, y, pageNums){
		const transformAll = document.getElementById('transformAllPagesCheckbox')?.checked;
		if(!transformAll && window.__selectedSlots && window.__selectedSlots.length > 0){
			window.__selectedSlots.forEach(i => {
				if(!window.__slotTransforms[i]) window.__slotTransforms[i] = {};
				if(typeof x === 'number') window.__slotTransforms[i].offsetX = x;
				if(typeof y === 'number') window.__slotTransforms[i].offsetY = y;
			});
			window.updatePageTransformsOnly();
			return;
		}

		const pages = (Array.isArray(pageNums)) ? pageNums : (pageNums ? [pageNums] : []);
		const firstPage = pages.length > 0 ? pages[0] : null;

		if(typeof x !== 'number') x = (firstPage && window.__pageTransforms[firstPage] ? window.__pageTransforms[firstPage].offsetX : window.__offsetX) || 0;
		if(typeof y !== 'number') y = (firstPage && window.__pageTransforms[firstPage] ? window.__pageTransforms[firstPage].offsetY : window.__offsetY) || 0;

		if(pages.length > 0){
			pages.forEach(p => {
				if(!window.__pageTransforms[p]) window.__pageTransforms[p] = {};
				window.__pageTransforms[p].offsetX = x;
				window.__pageTransforms[p].offsetY = y;
			});
		} else {
			if(transformAll){
				if(window.__slotTransforms) Object.values(window.__slotTransforms).forEach(t => { delete t.offsetX; delete t.offsetY; });
				if(window.__pageTransforms) Object.values(window.__pageTransforms).forEach(t => { delete t.offsetX; delete t.offsetY; });
			}
			window.__offsetX = x;
			window.__offsetY = y;
		}

		const pxPerMm = 96 / 25.4;
		if(typeof offsetXInput !== 'undefined' && offsetXInput && document.activeElement !== offsetXInput) offsetXInput.value = (x / pxPerMm).toFixed(2);
		if(typeof offsetYInput !== 'undefined' && offsetYInput && document.activeElement !== offsetYInput) offsetYInput.value = (y / pxPerMm).toFixed(2);

		const sX = window.__currentScaleX || 1;
		const sY = window.__currentScaleY || 1;
		// Update transforms directly
		window.updatePageTransformsOnly();
	};

	// Adjust slot position (external API)
	window.adjustSlotPosition = function(x, y, pageNums){
		const transformAll = document.getElementById('transformAllPagesCheckbox')?.checked;
		if(!transformAll && window.__selectedSlots && window.__selectedSlots.length > 0){
			window.__selectedSlots.forEach(i => {
				if(!window.__slotTransforms[i]) window.__slotTransforms[i] = {};
				if(typeof x === 'number') window.__slotTransforms[i].slotX = x;
				if(typeof y === 'number') window.__slotTransforms[i].slotY = y;
			});
			window.applyLayoutToPreviews(); // Position is handled in layout/render, not just transform
			return;
		}

		const pages = (Array.isArray(pageNums)) ? pageNums : (pageNums ? [pageNums] : []);
		const firstPage = pages.length > 0 ? pages[0] : null;

		if(typeof x !== 'number') x = (firstPage && window.__pageTransforms[firstPage] ? window.__pageTransforms[firstPage].slotX : window.__slotX) || 0;
		if(typeof y !== 'number') y = (firstPage && window.__pageTransforms[firstPage] ? window.__pageTransforms[firstPage].slotY : window.__slotY) || 0;

		if(pages.length > 0){
			pages.forEach(p => {
				if(!window.__pageTransforms[p]) window.__pageTransforms[p] = {};
				window.__pageTransforms[p].slotX = x;
				window.__pageTransforms[p].slotY = y;
			});
		} else {
			if(transformAll){
				if(window.__slotTransforms) Object.values(window.__slotTransforms).forEach(t => { delete t.slotX; delete t.slotY; });
				if(window.__pageTransforms) Object.values(window.__pageTransforms).forEach(t => { delete t.slotX; delete t.slotY; });
			}
			window.__slotX = x;
			window.__slotY = y;
		}

		const pxPerMm = 96 / 25.4;
		if(typeof boxXInput !== 'undefined' && boxXInput && document.activeElement !== boxXInput) boxXInput.value = (x / pxPerMm).toFixed(2);
		if(typeof boxYInput !== 'undefined' && boxYInput && document.activeElement !== boxYInput) boxYInput.value = (y / pxPerMm).toFixed(2);

		const startPage = parseInt(window.__currentPage, 10) || 1;
		const els = document.getElementsByClassName('preview');
		
		const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
		const cols = parseInt(document.getElementById('colsInput')?.value || 1);
		const slotsPerSheet = Math.max(1, rows * cols);

		for(let i=0; i<els.length; i++){
			const el = els[i];
			const pageNum = startPage + i;
			const slotT = (window.__slotTransforms && window.__slotTransforms[i]) || {};
			const pageT = (window.__pageTransforms && window.__pageTransforms[pageNum]) || {};
			
			let globalX = window.__slotX || 0;
			if (window.__gridDuplexMirror) {
				const sheetIndex = Math.floor(i / slotsPerSheet);
				if (sheetIndex % 2 !== 0) globalX = -globalX;
			}

			const effX = (typeof slotT.slotX === 'number') ? slotT.slotX : ((typeof pageT.slotX === 'number') ? pageT.slotX : globalX);
			const effY = (typeof slotT.slotY === 'number') ? slotT.slotY : ((typeof pageT.slotY === 'number') ? pageT.slotY : (window.__slotY || 0));
			el.style.transform = 'translate(' + effX + 'px, ' + effY + 'px)';
		}
		if(window.drawSheetCropMarks) window.drawSheetCropMarks();
	};

	// Adjust content skew (external API)
	window.adjustContentSkew = function(x, y, pageNums){
		const transformAll = document.getElementById('transformAllPagesCheckbox')?.checked;
		if(!transformAll && window.__selectedSlots && window.__selectedSlots.length > 0){
			window.__selectedSlots.forEach(i => {
				if(!window.__slotTransforms[i]) window.__slotTransforms[i] = {};
				if(x !== undefined) window.__slotTransforms[i].skewX = x;
				if(y !== undefined) window.__slotTransforms[i].skewY = y;
			});
			window.updatePageTransformsOnly();
			return;
		}

		const pages = (Array.isArray(pageNums)) ? pageNums : (pageNums ? [pageNums] : []);

		if(pages.length > 0){
			if(!window.__pageTransforms) window.__pageTransforms = {};
			pages.forEach(p => {
				if(!window.__pageTransforms[p]) window.__pageTransforms[p] = {};
				if(x !== undefined) window.__pageTransforms[p].skewX = x;
				if(y !== undefined) window.__pageTransforms[p].skewY = y;
			});
		} else {
			if(transformAll){
				if(window.__slotTransforms) Object.values(window.__slotTransforms).forEach(t => { delete t.skewX; delete t.skewY; });
				if(window.__pageTransforms) Object.values(window.__pageTransforms).forEach(t => { delete t.skewX; delete t.skewY; });
			}
			if(x !== undefined) window.__skewX = x;
			if(y !== undefined) window.__skewY = y;
		}

		if(typeof skewXInput !== 'undefined' && skewXInput && document.activeElement !== skewXInput && x !== undefined) skewXInput.value = x;
		if(typeof skewYInput !== 'undefined' && skewYInput && document.activeElement !== skewYInput && y !== undefined) skewYInput.value = y;

		// Update transforms directly
		if(window.__preferUpscaleNotRotate || window.__fillImage || window.__stretchImage){
			window.updatePageTransformsOnly();
			triggerRenderDebounced();
		} else {
			window.updatePageTransformsOnly();
		}
	};

	// Adjust content rotation and trigger render
	window.adjustContentRotation = function(deg, pageNums){
		const transformAll = document.getElementById('transformAllPagesCheckbox')?.checked;
		let r = (parseFloat(deg) || 0) % 360;
		if(r < 0) r += 360;
		
		if(!transformAll && window.__selectedSlots && window.__selectedSlots.length > 0){
			window.__selectedSlots.forEach(i => {
				if(!window.__slotTransforms[i]) window.__slotTransforms[i] = {};
				window.__slotTransforms[i].rotation = r;
			});
			if(window.__preferUpscaleNotRotate || window.__fillImage || window.__stretchImage){
				window.updatePageTransformsOnly();
				triggerRenderDebounced();
			} else {
				window.updatePageTransformsOnly();
			}
			return;
		}

		const pages = (Array.isArray(pageNums)) ? pageNums : (pageNums ? [pageNums] : []);
		if(pages.length > 0){
			pages.forEach(p => {
				if(!window.__pageTransforms[p]) window.__pageTransforms[p] = {};
				window.__pageTransforms[p].rotation = r;
			});
		} else {
			if(transformAll){
				if(window.__slotTransforms) Object.values(window.__slotTransforms).forEach(t => { delete t.rotation; });
				if(window.__pageTransforms) Object.values(window.__pageTransforms).forEach(t => { delete t.rotation; });
			}
			window.__currentRotation = r;
			if(rotationInput && document.activeElement !== rotationInput) rotationInput.value = String(r);
		}
		// Update transforms directly
		if(window.__preferUpscaleNotRotate || window.__fillImage || window.__stretchImage){
			window.updatePageTransformsOnly();
			triggerRenderDebounced();
		} else {
			window.updatePageTransformsOnly();
		}
	};

	// Apply Fit/Fill/Stretch to selected slots (or all) by calculating and saving specific scales
	window.applyFitToSelection = async function(mode) {
		if (!window.__pdfDoc) return;
		const transformAll = document.getElementById('transformAllPagesCheckbox')?.checked;

		if (!transformAll && (!window.__selectedSlots || window.__selectedSlots.length === 0)) return;
		
		// Disable global modes to ensure we rely on per-cell transforms
		window.__preferUpscaleNotRotate = false;
		window.__fillImage = false;
		window.__stretchImage = false;

		// Update UI buttons
		['fitImageBtn', 'fillImageBtn', 'stretchImageBtn'].forEach(id => {
			document.getElementById(id)?.classList.remove('active');
		});

		const previewEls = document.getElementsByClassName('preview');
		const pageRangeStr = document.getElementById('pageRangeInput')?.value || '';
		const cols = parseInt(document.getElementById('colsInput')?.value || 1);
		const pagesToRender = window.mapPagesToSlots ? window.mapPagesToSlots(pageRangeStr, previewEls.length, cols) : [];
		
		let targets = [];
		if (!transformAll && window.__selectedSlots && window.__selectedSlots.length > 0) {
			targets = window.__selectedSlots;
		} else {
			// All slots
			targets = Array.from({length: previewEls.length}, (_, i) => i);
		}

		for (const i of targets) {
			if (i >= pagesToRender.length) continue;
			const pageNum = pagesToRender[i];
			if (pageNum <= 0) continue;

			const el = previewEls[i];
			const slotT = (window.__slotTransforms && window.__slotTransforms[i]) || {};
			const pageT = (window.__pageTransforms && window.__pageTransforms[pageNum]) || {};
			const layout = slotT.layout || pageT.layout || {};
			
			const globalW = window.__slotW || (el ? el.clientWidth : 100);
			const globalH = window.__slotH || (el ? el.clientHeight : 100);
			const inset = window.getBorderSize ? window.getBorderSize(el) : {h:0, v:0};
			
			const w = (layout.width !== undefined) ? layout.width : globalW;
			const h = (layout.height !== undefined) ? layout.height : globalH;
			const availW = Math.max(w - inset.h, 1);
			const availH = Math.max(h - inset.v, 1);

			let pdfPageNum = pageNum;
			if (window.__mergeSource && window.__mergeSource.mode === 'single' && pageNum > 0) {
				pdfPageNum = parseInt(window.__mergeSource.page) || 1;
			}
			if (pdfPageNum > window.__pdfDoc.numPages) pdfPageNum = 1;
			
			try {
				const page = await window.__pdfDoc.getPage(pdfPageNum);
				const vp = page.getViewport({scale: 1});
				const rotation = (typeof slotT.rotation === 'number') ? slotT.rotation : ((typeof pageT.rotation === 'number') ? pageT.rotation : (window.__currentRotation || 0));
				const skewX = (typeof slotT.skewX === 'number') ? slotT.skewX : ((typeof pageT.skewX === 'number') ? pageT.skewX : (window.__skewX || 0));
				const skewY = (typeof slotT.skewY === 'number') ? slotT.skewY : ((typeof pageT.skewY === 'number') ? pageT.skewY : (window.__skewY || 0));

				if(window.calculatePageFit){
					const fit = window.calculatePageFit(vp.width, vp.height, availW, availH, rotation, skewX, skewY, mode);
					
					const nativeScale = 96 / 72;
					if (!window.__slotTransforms[i]) window.__slotTransforms[i] = {};
					window.__slotTransforms[i].scaleX = fit.scaleX / nativeScale;
					window.__slotTransforms[i].scaleY = fit.scaleY / nativeScale;
					// Clear dynamic mode if present
					delete window.__slotTransforms[i].fitMode;
					window.__slotTransforms[i].fitToPage = false;
				}
			} catch(e) { console.warn("Error fitting page", e); }
		}

		
		if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		if(window.syncSelectionToUI) window.syncSelectionToUI();
	};