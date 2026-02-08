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

	// helper: compute inset (padding+border) for preview element
	window.getBorderSize = function(el){
		if(!el) return {h:0,v:0};
		const s = getComputedStyle(el);
		const padH = parseFloat(s.paddingLeft||0) + parseFloat(s.paddingRight||0);
		const padV = parseFloat(s.paddingTop||0) + parseFloat(s.paddingBottom||0);
		const borderH = parseFloat(s.borderLeftWidth||0) + parseFloat(s.borderRightWidth||0);
		const borderV = parseFloat(s.borderTopWidth||0) + parseFloat(s.borderBottomWidth||0);
		return { h: (padH+borderH)||0, v: (padV+borderV)||0 };
	};

	// Create/adjust paper sheet size (mm) by setting .page dimensions
	window.createPaperSheet = function({widthMm=320, heightMm=450} = {}){
		const pages = document.querySelectorAll('.page');
		pages.forEach(p => {
			p.style.width = widthMm + 'mm';
			p.style.height = heightMm + 'mm';
		});
	};

	// Set slot frame size in pixels (keeps centered)
	window.setSlotFrame = function(widthPx, heightPx){
		window.__fitToPage = true;
		window.__slotW = widthPx;
		window.__slotH = heightPx;
		window.applyLayoutToPreviews();
		if(window.updateStatusSlotInfo) window.updateStatusSlotInfo();
	};

	// Set slot size without forcing content to fit (keeps content scale)
	window.setSlotSize = function(widthPx, heightPx){
		window.__fitToPage = false;
		window.__slotW = widthPx;
		window.__slotH = heightPx;
		window.applyLayoutToPreviews();
		if(window.updateStatusSlotInfo) window.updateStatusSlotInfo();
	};

	// Apply layout (size, margins) to all previews, respecting overrides
	window.applyLayoutToPreviews = function(){
		const els = document.getElementsByClassName('preview');
		for(let i=0; i<els.length; i++){
			const el = els[i];
			const pageNum = parseInt(el.dataset.pageNum);
			const slotT = (window.__slotTransforms && window.__slotTransforms[i]) || {};
			const pageT = (window.__pageTransforms && window.__pageTransforms[pageNum]) || {};
			const layout = slotT.layout || pageT.layout || {};

			// Use override if present, else global
			const w = (layout.width !== undefined) ? layout.width : window.__slotW;
			const h = (layout.height !== undefined) ? layout.height : window.__slotH;
			const l = (layout.expandL !== undefined) ? layout.expandL : (window.__expandL || 0);
			const r = (layout.expandR !== undefined) ? layout.expandR : (window.__expandR || 0);
			const top = (layout.expandT !== undefined) ? layout.expandT : (window.__expandT || 0);
			const bot = (layout.expandB !== undefined) ? layout.expandB : (window.__expandB || 0);

			el.style.width = (w ? (w + 'px') : 'auto');
			el.style.height = (h ? (h + 'px') : 'auto');
			el.style.overflow = 'visible';
			el.style.minHeight = '0';
			el.style.marginLeft = -l + 'px';
			el.style.marginRight = -r + 'px';
			el.style.marginTop = -top + 'px';
			el.style.marginBottom = -bot + 'px';
			
			const wrap = el.firstElementChild;
			if(wrap && wrap.tagName === 'DIV' && !wrap.classList.contains('preview-page-layer')){
				wrap.style.width = (w ? (w + 'px') : 'auto');
				wrap.style.height = (h ? (h + 'px') : 'auto');
				if(window.updatePreviewOverlays) window.updatePreviewOverlays(wrap, pageNum, {x: l, y: top});
			}
		}
		if(window.updatePageTransformsOnly) window.updatePageTransformsOnly();
		if(window.drawSheetCropMarks) window.drawSheetCropMarks();
	};

	// Generate grid of slots
	window.generatePreviewGrid = function(rows, cols){
		const workspace = document.querySelector('.workspace');
		if(!workspace) return;

		// Calculate needed sheets
		const pageRangeStr = (typeof pageRangeInput !== 'undefined' && pageRangeInput) ? pageRangeInput.value : '';
		const items = (window.parsePageOrder && pageRangeStr) ? window.parsePageOrder(pageRangeStr) : [];
		const totalItems = items.length || 1;
		const slotsPerSheet = (rows||1) * (cols||1);
		const numSheets = Math.max(1, Math.ceil(totalItems / slotsPerSheet));

		// Manage Sheets
		const sheets = Array.from(workspace.querySelectorAll('.page'));
		const template = sheets[0];
		if(!template) return;

		// Add needed sheets
		if(sheets.length < numSheets){
			for(let i=sheets.length; i<numSheets; i++){
				const clone = template.cloneNode(true);
				const cContainer = clone.querySelector('#previewContainer');
				if(cContainer) cContainer.removeAttribute('id');
				clone.querySelectorAll('.sheet-crop-marks').forEach(e=>e.remove());
				workspace.appendChild(clone);
			}
		} else if(sheets.length > numSheets){
			// Remove excess sheets
			for(let i=sheets.length-1; i>=numSheets; i--){
				sheets[i].remove();
			}
		}

		// Update Grid in each sheet
		const allSheets = workspace.querySelectorAll('.page');
		const w = window.__slotW;
		const h = window.__slotH;
		const x = window.__slotX || 0;
		const y = window.__slotY || 0;
		const l = window.__expandL || 0;
		const r = window.__expandR || 0;
		const t = window.__expandT || 0;
		const b = window.__expandB || 0;

		allSheets.forEach((sheet, sheetIndex) => {
			const container = sheet.querySelector('.preview-grid-layer') || sheet.querySelector('#previewContainer');
			if(!container) return;

			container.innerHTML = '';
			container.style.display = 'grid';
			container.style.gridTemplateColumns = 'repeat(' + (cols||1) + ', max-content)';
			container.style.gridTemplateRows = 'repeat(' + (rows||1) + ', max-content)';
			container.style.gap = '0';
			container.style.alignContent = 'center';
			container.style.justifyContent = 'center';

			let sheetX = x;
			if (window.__gridDuplexMirror && sheetIndex % 2 !== 0) {
				sheetX = -x;
			}

			for(let i=0; i<slotsPerSheet; i++){
				const globalIndex = (sheetIndex * slotsPerSheet) + i;
				const div = document.createElement('div');
				div.className = 'preview';
				div.setAttribute('aria-live', 'polite');
				div.style.width = (w ? w+'px' : 'auto');
				div.style.height = (h ? h+'px' : 'auto');
				if(h) div.style.minHeight = '0';
				// Note: Margins are applied in applyLayoutToPreviews, but we set initial here
				div.style.margin = '0';
				div.style.transform = 'translate(' + sheetX + 'px, ' + y + 'px)';
				div.style.marginLeft = -l + 'px';
				div.style.marginRight = -r + 'px';
				div.style.marginTop = -t + 'px';
				div.style.marginBottom = -b + 'px';
				div.style.backgroundColor = window.__frameBgString || '#ffffff';
				
				// Add click listener for selection tool
				div.onclick = (e) => window.handleWorkspaceClick(e, div, globalIndex);
				
				// Drag & Drop for Swap Tool
				div.draggable = true;
				div.addEventListener('dragstart', (e) => {
					const btn = document.getElementById('toolSwapBtn');
					if(!btn || !btn.classList.contains('active')) {
						e.preventDefault();
						return;
					}
					e.dataTransfer.setData('text/plain', globalIndex);
					e.dataTransfer.effectAllowed = 'move';
					
					// Determine slots to include in ghost image
					let slots = [div];
					if(window.__selectionMode){
						const cols = parseInt(document.getElementById('colsInput')?.value || 1);
						const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
						const slotsPerSheet = Math.max(1, cols * rows);
						const sheetIndex = Math.floor(globalIndex / slotsPerSheet);
						const localIndex = globalIndex % slotsPerSheet;
						const allPreviews = document.getElementsByClassName('preview');

						if(window.__selectionType === 'row'){
							const row = Math.floor(localIndex / cols);
							const start = (sheetIndex * slotsPerSheet) + (row * cols);
							slots = [];
							for(let c=0; c<cols; c++) {
								if(allPreviews[start+c]) slots.push(allPreviews[start+c]);
							}
						} else if(window.__selectionType === 'col'){
							const col = localIndex % cols;
							slots = [];
							for(let r=0; r<rows; r++){
								const idx = (sheetIndex * slotsPerSheet) + (r * cols) + col;
								if(allPreviews[idx]) slots.push(allPreviews[idx]);
							}
						}
					}

					// Calculate bounds
					let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
					slots.forEach(el => {
						const r = el.getBoundingClientRect();
						if(r.left < minX) minX = r.left;
						if(r.top < minY) minY = r.top;
						if(r.right > maxX) maxX = r.right;
						if(r.bottom > maxY) maxY = r.bottom;
					});

					const ghostW = Math.ceil(maxX - minX);
					const ghostH = Math.ceil(maxY - minY);

					const ghost = document.createElement('div');
					ghost.style.width = ghostW + 'px';
					ghost.style.height = ghostH + 'px';
					ghost.style.position = 'absolute';
					ghost.style.top = '-9999px';
					ghost.style.left = '-9999px';
					ghost.style.zIndex = '100000';
					
					// Create canvas
					const c = document.createElement('canvas');
					c.width = ghostW;
					c.height = ghostH;
					const ctx = c.getContext('2d');
					
					slots.forEach(el => {
						const r = el.getBoundingClientRect();
						const dx = r.left - minX;
						const dy = r.top - minY;
						const dw = r.width;
						const dh = r.height;

						const compStyle = window.getComputedStyle(el);
						const bg = (compStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && compStyle.backgroundColor !== 'transparent') ? compStyle.backgroundColor : '#ffffff';
						
						ctx.fillStyle = bg;
						ctx.fillRect(dx, dy, dw, dh);

						const srcCanvas = el.querySelector('canvas');
						if(srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0){
							ctx.drawImage(srcCanvas, dx, dy, dw, dh);
						} else {
							const text = el.innerText.trim();
							if(text){
								ctx.fillStyle = '#000000';
								ctx.font = 'bold 20px sans-serif';
								ctx.textAlign = 'center';
								ctx.textBaseline = 'middle';
								ctx.fillText(text.substring(0, 20).replace(/\n/g, ' '), dx + dw/2, dy + dh/2);
							} else if(el.querySelector('embed')){
								ctx.fillStyle = '#666666';
								ctx.font = 'bold 14px sans-serif';
								ctx.textAlign = 'center';
								ctx.textBaseline = 'middle';
								ctx.fillText("PDF", dx + dw/2, dy + dh/2);
							}
						}
						
						// Outline
						ctx.strokeStyle = '#00bcd4';
						ctx.lineWidth = 4;
						ctx.strokeRect(dx, dy, dw, dh);
					});

					c.style.width = '100%';
					c.style.height = '100%';
					ghost.appendChild(c);

					document.body.appendChild(ghost);
					
					// Center on clicked slot
					const divRect = div.getBoundingClientRect();
					const offX = (divRect.left - minX) + (divRect.width / 2);
					const offY = (divRect.top - minY) + (divRect.height / 2);
					
					e.dataTransfer.setDragImage(ghost, offX, offY);
					setTimeout(() => document.body.removeChild(ghost), 0);

					// Mark source slots
					slots.forEach(el => {
						el.classList.add('swap-source');
						el.style.outline = '6px solid #00bcd4';
						el.style.zIndex = '1000';
						setTimeout(() => {
							if(el.classList.contains('swap-source') && el.firstElementChild) el.firstElementChild.style.visibility = 'hidden';
						}, 0);
					});
				});
				
				div.addEventListener('dragend', () => {
					document.querySelectorAll('.swap-source').forEach(el => {
						el.classList.remove('swap-source');
						if(el.firstElementChild) el.firstElementChild.style.visibility = '';
						el.style.outline = '';
						el.style.zIndex = '';
					});
					document.querySelectorAll('.preview').forEach(el => {
						el.style.outline = '';
						el.style.zIndex = '';
					});
				});
				
				div.addEventListener('dragover', (e) => {
					const btn = document.getElementById('toolSwapBtn');
					if(!btn || !btn.classList.contains('active')) return;
					e.preventDefault();
					e.dataTransfer.dropEffect = 'move';
				});

				div.addEventListener('dragenter', () => {
					const btn = document.getElementById('toolSwapBtn');
					if(btn && btn.classList.contains('active') && !div.classList.contains('swap-source')) {
						div.style.outline = '6px solid #00bcd4';
						div.style.zIndex = '100';
					}
				});

				div.addEventListener('dragleave', () => {
					if(!div.classList.contains('swap-source')) {
						div.style.outline = '';
						div.style.zIndex = '';
					}
				});

				div.addEventListener('drop', (e) => {
					const btn = document.getElementById('toolSwapBtn');
					if(!btn || !btn.classList.contains('active')) return;
					e.preventDefault();
					const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
					if(!isNaN(fromIdx) && fromIdx !== globalIndex) window.swapSlots(fromIdx, globalIndex, e.shiftKey);
				});

				container.appendChild(div);
			}
		});
		
		// Re-apply any existing overrides
		window.applyLayoutToPreviews();

		// Redraw crops
		if(window.drawSheetCropMarks) window.drawSheetCropMarks();
	};

	// Calculate scale and rotation settings for fitting content
	window.calculatePageFit = function(w, h, availW, availH, rotation, skewX, skewY, fitMode){
		let r = (rotation || 0) % 360;
		if(r < 0) r += 360;
		const skX = skewX || 0;
		const skY = skewY || 0;

		// Resolve fitMode if not passed (fallback to globals)
		if (!fitMode) {
			if (window.__preferUpscaleNotRotate) fitMode = 'fit';
			else if (window.__fillImage) fitMode = 'fill';
			else if (window.__stretchImage) fitMode = 'stretch';
		}

		const useSmartFit = !!fitMode;
		let scale;
		let scaleX = 1;
		let scaleY = 1;

		if(useSmartFit){
			if(fitMode === 'stretch'){
				// Stretch logic: Fill X and Y independently
				// For 90/270 rotation, swap dimensions
				const rMod = Math.abs(r % 180);
				const isRotated90 = rMod > 45 && rMod < 135;
				scaleX = isRotated90 ? (availH / w) : (availW / w);
				scaleY = isRotated90 ? (availW / h) : (availH / h);
				scale = 1; // Base scale is 1, distortion handled via scaleX/scaleY
			} else {
			// Calculate bounding box of rotated and skewed page
			const rad = r * Math.PI / 180;
			const radSkX = skX * Math.PI / 180;
			const radSkY = skY * Math.PI / 180;
			
			const c = Math.cos(rad);
			const s = Math.sin(rad);
			const tX = Math.tan(radSkX);
			const tY = Math.tan(radSkY);

			// Transform matrix components for Rotate -> Skew
			// CSS transform order: rotate() skew() => Matrix = R * Sk
			const m11 = c - s * tY;
			const m12 = c * tX - s;
			const m21 = s + c * tY;
			const m22 = s * tX + c;

			const bboxW = Math.abs(m11 * w) + Math.abs(m12 * h);
			const bboxH = Math.abs(m21 * w) + Math.abs(m22 * h);
			if(fitMode === 'fill'){
				scale = Math.max(availW / bboxW, availH / bboxH);
			} else {
				scale = Math.min(availW / bboxW, availH / bboxH);
			}
			scaleX = scale;
			scaleY = scale;
			}
		} else {
			// Standard fit: fit based on original dimensions (0 degree), ignoring rotation adjustments
			if(fitMode === 'fill'){
				scale = Math.max(availW / w, availH / h);
			} else {
				scale = Math.min(availW / w, availH / h);
			}
			scaleX = scale;
			scaleY = scale;
		}

		if(!isFinite(scale) || scale <= 0) scale = 1;
		if(!isFinite(scaleX) || scaleX <= 0) scaleX = 1;
		if(!isFinite(scaleY) || scaleY <= 0) scaleY = 1;

		const isVertical = (r === 90 || r === 270);
		const treatAsRotated = isVertical && useSmartFit && Math.abs(skX) < 0.01 && Math.abs(skY) < 0.01 && fitMode !== 'stretch';

		return { scale, scaleX, scaleY, rotation: r, treatAsRotated };
	};

	// Calculate the optimal grid fit based on item and sheet size
	window.calculateGridFit = function(itemWidthPx, itemHeightPx){
		if(!pageEl || !itemWidthPx || !itemHeightPx) return {rows: 1, cols: 1};

		const sheetWidthPx = pageEl.clientWidth;
		const sheetHeightPx = pageEl.clientHeight;

		const cols = Math.floor(sheetWidthPx / itemWidthPx);
		const rows = Math.floor(sheetHeightPx / itemHeightPx);

		return {
			rows: rows > 0 ? rows : 1,
			cols: cols > 0 ? cols : 1
		};
	};

	// Helper to update slot size from UI inputs
	window.updateSlotSizeFromInputs = function(source){
		const wIn = document.getElementById('slotWidthInput');
		const hIn = document.getElementById('slotHeightInput');
		const scaleIn = document.getElementById('slotScalePercentInput');
		const propCheck = document.getElementById('slotProportionalCheckbox');
		const linkScale = document.getElementById('linkSlotScaleCheckbox')?.checked;
		const resizeAll = document.getElementById('resizeAllFramesCheckbox')?.checked;

		if(wIn && hIn){
			if (resizeAll && window.__selectionMode) {
				window.__selectionMode = false;
				window.__selectedSlots = [];
				window.__selectedPages = [];
				['toolSelectRowBtn', 'toolSelectColBtn', 'toolSelectSlotBtn'].forEach(id => {
					document.getElementById(id)?.classList.remove('active');
				});
				document.querySelectorAll('.preview.selected-frame').forEach(el => el.classList.remove('selected-frame'));
			}

			const fileW = window.__fileWidthMm;
			const fileH = window.__fileHeightMm;
			const isProp = propCheck && propCheck.checked && fileW && fileH;

			if(source === 'scale' && scaleIn && fileW && fileH){
				const pct = parseFloat(scaleIn.value) || 100;
				const factor = pct / 100;
				wIn.value = (fileW * factor).toFixed(2);
				hIn.value = (fileH * factor).toFixed(2);
			} else if(isProp){
				if(source === 'w'){
					const w = parseFloat(wIn.value) || 0;
					if(w > 0){
						const factor = w / fileW;
						hIn.value = (fileH * factor).toFixed(2);
						if(scaleIn) scaleIn.value = Math.round(factor * 100);
					}
				} else if(source === 'h'){
					const h = parseFloat(hIn.value) || 0;
					if(h > 0){
						const factor = h / fileH;
						wIn.value = (fileW * factor).toFixed(2);
						if(scaleIn) scaleIn.value = Math.round(factor * 100);
					}
				}
			}

			if(window.__fileWidthMm){
				const v = parseFloat(wIn.value);
				wIn.style.color = (Math.abs(v - window.__fileWidthMm) > 0.05) ? '#ff9f9fff' : '';
			}
			if(window.__fileHeightMm){
				const v = parseFloat(hIn.value);
				hIn.style.color = (Math.abs(v - window.__fileHeightMm) > 0.05) ? '#ff9f9fff' : '';
			}

			const expL = document.getElementById('expandLeftInput');
			const expR = document.getElementById('expandRightInput');
			const expT = document.getElementById('expandTopInput');
			const expB = document.getElementById('expandBottomInput');

			const pxPerMm = 96 / 25.4;
			
			// Inputs represent the desired trim size and expansion
			const inputTrimW = (parseFloat(wIn.value)||0) * pxPerMm;
			const inputTrimH = (parseFloat(hIn.value)||0) * pxPerMm;

			// Read expansion inputs.
			const l = (parseFloat(expL?.value)||0) * pxPerMm;
			const r = (parseFloat(expR?.value)||0) * pxPerMm;
			const t = (parseFloat(expT?.value)||0) * pxPerMm;
			const b = (parseFloat(expB?.value)||0) * pxPerMm;

			if (linkScale) {
				window.__fitToPage = true;
				if (!window.__selectedSlots || window.__selectedSlots.length === 0) {
					window.__currentScaleX = 1;
					window.__currentScaleY = 1;
				}
			} else {
				window.__fitToPage = false;
			}

			if(!resizeAll && window.__selectedSlots && window.__selectedSlots.length > 0){
				// Selection exists: Apply inputs as overrides to selected slots.
				window.__selectedSlots.forEach(i => {
					if(!window.__slotTransforms[i]) window.__slotTransforms[i] = {};
					// Use the input trim size + input expansion for the override.
					window.__slotTransforms[i].layout = {
						width: inputTrimW + l + r,
						height: inputTrimH + t + b,
						expandL: l, expandR: r, expandT: t, expandB: b
					};
					if (linkScale) {
						window.__slotTransforms[i].fitToPage = true;
						window.__slotTransforms[i].scaleX = 1;
						window.__slotTransforms[i].scaleY = 1;
					} else {
						window.__slotTransforms[i].fitToPage = false;
					}
				});
			} else {
				// No selection: Apply inputs globally.
				window.__trimW = inputTrimW;
				window.__trimH = inputTrimH;
				window.__expandL = l;
				window.__expandR = r;
				window.__expandT = t;
				window.__expandB = b;
				window.__slotW = window.__trimW + window.__expandL + window.__expandR;
				window.__slotH = window.__trimH + window.__expandT + window.__expandB;

				if(resizeAll && window.__slotTransforms){
					Object.keys(window.__slotTransforms).forEach(k => {
						if(window.__slotTransforms[k].layout) delete window.__slotTransforms[k].layout;
					});
				}
			}
			// Apply all changes to the DOM.
			window.applyLayoutToPreviews();
			if(window.updateStatusSlotInfo) window.updateStatusSlotInfo();

			// Recalculate grid fit based on trim size (ignoring expansion)
			const autoGridCheck = document.getElementById('autoGridCheck');
			const allowAutoFit = autoGridCheck ? autoGridCheck.checked : (!document.getElementById('layoutSelect') || document.getElementById('layoutSelect').value === 'Default');
			let rendered = false;

			if(allowAutoFit && window.calculateGridFit && window.__trimW && window.__trimH && (!window.__selectedSlots || window.__selectedSlots.length === 0)){
				const fit = window.calculateGridFit(window.__trimW, window.__trimH);
				const rInput = document.getElementById('rowsInput');
				const cInput = document.getElementById('colsInput');
				const curR = parseInt(rInput ? rInput.value : 1) || 1;
				const curC = parseInt(cInput ? cInput.value : 1) || 1;
				if(fit.rows !== curR || fit.cols !== curC){
					if(rInput) rInput.value = fit.rows;
					if(cInput) cInput.value = fit.cols;
					if(window.generatePreviewGrid) window.generatePreviewGrid(fit.rows, fit.cols);
					if(window.renderPages) {
						window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
						rendered = true;
					}
				}
			}
			
			if(!rendered && (linkScale || window.__preferUpscaleNotRotate || window.__fillImage || window.__stretchImage) && window.renderPages){
				window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
			}
			if(window.syncSelectionToUI) window.syncSelectionToUI();
		}
	};

	// Toggle Selection Mode
	window.toggleSelectionMode = function(btn, type){
		const rowBtn = document.getElementById('toolSelectRowBtn');
		const colBtn = document.getElementById('toolSelectColBtn');
		const slotBtn = document.getElementById('toolSelectSlotBtn');

		if(window.__selectionMode && window.__selectionType === type){
			window.__selectionMode = false;
		} else {
			window.__selectionMode = true;
			window.__selectionType = type || 'row';
		}

		if(rowBtn) rowBtn.classList.toggle('active', window.__selectionMode && window.__selectionType === 'row');
		if(colBtn) colBtn.classList.toggle('active', window.__selectionMode && window.__selectionType === 'col');
		if(slotBtn) slotBtn.classList.toggle('active', window.__selectionMode && window.__selectionType === 'single');

		if(!window.__selectionMode){
			// Clear selection
			window.__selectedPages = [];
			window.__selectedSlots = [];
			document.querySelectorAll('.preview.selected-frame').forEach(el => el.classList.remove('selected-frame'));
			if(window.updateStatusSlotInfo) window.updateStatusSlotInfo();
			if(window.syncSelectionToUI) window.syncSelectionToUI();
		}
	};

	// Handle click on workspace/preview
	window.handleWorkspaceClick = function(e, el, index){
		if(!window.__selectionMode) return;
		e.stopPropagation(); // Prevent deselecting if we click a frame

		const els = document.getElementsByClassName('preview');
		let selectedIndices = [];
		
		const cols = parseInt(document.getElementById('colsInput')?.value || 1);
		const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
		const slotsPerSheet = Math.max(1, cols * rows);

		const clickedSheet = Math.floor(index / slotsPerSheet);
		const clickedLocalIndex = index % slotsPerSheet;
		
		let mergeWithExisting = e.ctrlKey || e.metaKey;
		const selectAllSheets = e.shiftKey;

		if(window.__selectionType === 'single'){
			for(let i=0; i<els.length; i++){
				const currentSheet = Math.floor(i / slotsPerSheet);
				const currentLocalIndex = i % slotsPerSheet;
				if(!selectAllSheets && currentSheet !== clickedSheet) continue;
				if(currentLocalIndex === clickedLocalIndex) selectedIndices.push(i);
			}
		} else {
			const clickedRow = Math.floor(clickedLocalIndex / cols);
			const clickedCol = clickedLocalIndex % cols;
			const isColSelect = (window.__selectionType === 'col');

			// Find all indices in this row or column
			for(let i=0; i<els.length; i++){
				const currentSheet = Math.floor(i / slotsPerSheet);
				const currentLocalIndex = i % slotsPerSheet;
				const r = Math.floor(currentLocalIndex / cols);
				const c = currentLocalIndex % cols;

				if(!selectAllSheets && currentSheet !== clickedSheet) continue;

				if(isColSelect){
					if(c === clickedCol) selectedIndices.push(i);
				} else {
					if(r === clickedRow) selectedIndices.push(i);
				}
			}
		}

		// Update selection state
		if(mergeWithExisting){
			const current = new Set(window.__selectedSlots || []);
			const allPresent = selectedIndices.every(i => current.has(i));
			if(allPresent){
				selectedIndices.forEach(i => current.delete(i));
			} else {
				selectedIndices.forEach(i => current.add(i));
			}
			window.__selectedSlots = Array.from(current);
		} else {
			window.__selectedSlots = selectedIndices;
		}

		window.__selectedPages = [];
		document.querySelectorAll('.preview.selected-frame').forEach(e => e.classList.remove('selected-frame'));

		window.__selectedSlots.forEach(i => {
			const target = els[i];
			if(target){
				target.classList.add('selected-frame');
				const pNum = parseInt(target.dataset.pageNum);
				if(pNum) window.__selectedPages.push(pNum);
			}
		});
		if(window.updateStatusSlotInfo) window.updateStatusSlotInfo();
		if(window.syncSelectionToUI) window.syncSelectionToUI();
	};

	// Swap content of two slots by modifying the page range input
	window.swapSlots = function(idx1, idx2, allSheets){
		const input = document.getElementById('pageRangeInput');
		if(!input) return;
		
		// Get current flattened list of pages
		let pages = window.parsePageOrder ? window.parsePageOrder(input.value) : [];

		const formatPage = (p) => {
			const val = parseInt(p, 10);
			if (val === -1) return '0';
			if (val === 0) return 'empty';
			return val;
		};
		
		// Auto-detect allSheets from selection if dragging a selected item
		if(!allSheets && window.__selectedSlots && window.__selectedSlots.includes(idx1)){
			const cols = parseInt(document.getElementById('colsInput')?.value || 1);
			const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
			const slotsPerSheet = Math.max(1, cols * rows);
			
			const firstSheet = Math.floor(window.__selectedSlots[0] / slotsPerSheet);
			for(let i=1; i<window.__selectedSlots.length; i++){
				if(Math.floor(window.__selectedSlots[i] / slotsPerSheet) !== firstSheet){
					allSheets = true;
					break;
				}
			}
		}

		// Check if we should swap Rows or Cols based on selection mode
		if(window.__selectionMode){
			if(window.__selectionType === 'row') return window.swapRows(idx1, idx2, allSheets);
			if(window.__selectionType === 'col') return window.swapCols(idx1, idx2, allSheets);
		}

		// Default: Single Slot Swap
		if(allSheets){
			const cols = parseInt(document.getElementById('colsInput')?.value || 1);
			const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
			const slotsPerSheet = Math.max(1, cols * rows);
			
			const local1 = idx1 % slotsPerSheet;
			const local2 = idx2 % slotsPerSheet;
			
			// Iterate through all sheets that have content
			const numSheets = Math.ceil(pages.length / slotsPerSheet);
			
			for(let s=0; s<numSheets; s++){
				const p1 = s * slotsPerSheet + local1;
				const p2 = s * slotsPerSheet + local2;
				
				const max = Math.max(p1, p2);
				while(pages.length <= max) pages.push(0);
				
				const temp = pages[p1];
				pages[p1] = pages[p2];
				pages[p2] = temp;
			}
		} else {
			// Ensure array is large enough to cover both indices
			const maxIdx = Math.max(idx1, idx2);
			while(pages.length <= maxIdx) pages.push(0);
			
			// Swap
			const temp = pages[idx1];
			pages[idx1] = pages[idx2];
			pages[idx2] = temp;
		}

		// Trim trailing empty slots
		while(pages.length > 0 && pages[pages.length - 1] === 0) {
			pages.pop();
		}
		
		// Update input and trigger refresh
		input.value = pages.map(formatPage).join(' ');
		input.dispatchEvent(new Event('input'));
	};

	// Swap Rows
	window.swapRows = function(idx1, idx2, allSheets){
		const input = document.getElementById('pageRangeInput');
		if(!input) return;
		let pages = window.parsePageOrder ? window.parsePageOrder(input.value) : [];

		const formatPage = (p) => {
			const val = parseInt(p, 10);
			if (val === -1) return '0';
			if (val === 0) return 'empty';
			return val;
		};

		const cols = parseInt(document.getElementById('colsInput')?.value || 1);
		const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
		const slotsPerSheet = Math.max(1, cols * rows);

		const sheet1 = Math.floor(idx1 / slotsPerSheet);
		const local1 = idx1 % slotsPerSheet;
		const row1 = Math.floor(local1 / cols);

		const sheet2 = Math.floor(idx2 / slotsPerSheet);
		const local2 = idx2 % slotsPerSheet;
		const row2 = Math.floor(local2 / cols);

		const swap = (i, j) => {
			const max = Math.max(i, j);
			while(pages.length <= max) pages.push(0);
			const t = pages[i];
			pages[i] = pages[j];
			pages[j] = t;
		};

		if(allSheets){
			const numSheets = Math.ceil(pages.length / slotsPerSheet);
			for(let s=0; s<numSheets; s++){
				const base = s * slotsPerSheet;
				for(let c=0; c<cols; c++){
					const i1 = base + row1 * cols + c;
					const i2 = base + row2 * cols + c;
					swap(i1, i2);
				}
			}
		} else {
			const base1 = sheet1 * slotsPerSheet;
			const base2 = sheet2 * slotsPerSheet;
			for(let c=0; c<cols; c++){
				const i1 = base1 + row1 * cols + c;
				const i2 = base2 + row2 * cols + c;
				swap(i1, i2);
			}
		}

		// Trim trailing empty slots
		while(pages.length > 0 && pages[pages.length - 1] === 0) {
			pages.pop();
		}

		input.value = pages.map(formatPage).join(' ');
		input.dispatchEvent(new Event('input'));
	};

	// Swap Columns
	window.swapCols = function(idx1, idx2, allSheets){
		const input = document.getElementById('pageRangeInput');
		if(!input) return;
		let pages = window.parsePageOrder ? window.parsePageOrder(input.value) : [];

		const formatPage = (p) => {
			const val = parseInt(p, 10);
			if (val === -1) return '0';
			if (val === 0) return 'empty';
			return val;
		};

		const cols = parseInt(document.getElementById('colsInput')?.value || 1);
		const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
		const slotsPerSheet = Math.max(1, cols * rows);

		const sheet1 = Math.floor(idx1 / slotsPerSheet);
		const local1 = idx1 % slotsPerSheet;
		const col1 = local1 % cols;

		const sheet2 = Math.floor(idx2 / slotsPerSheet);
		const local2 = idx2 % slotsPerSheet;
		const col2 = local2 % cols;

		const swap = (i, j) => {
			const max = Math.max(i, j);
			while(pages.length <= max) pages.push(0);
			const t = pages[i];
			pages[i] = pages[j];
			pages[j] = t;
		};

		if(allSheets){
			const numSheets = Math.ceil(pages.length / slotsPerSheet);
			for(let s=0; s<numSheets; s++){
				const base = s * slotsPerSheet;
				for(let r=0; r<rows; r++){
					const i1 = base + r * cols + col1;
					const i2 = base + r * cols + col2;
					swap(i1, i2);
				}
			}
		} else {
			const base1 = sheet1 * slotsPerSheet;
			const base2 = sheet2 * slotsPerSheet;
			for(let r=0; r<rows; r++){
				const i1 = base1 + r * cols + col1;
				const i2 = base2 + r * cols + col2;
				swap(i1, i2);
			}
		}

		// Trim trailing empty slots
		while(pages.length > 0 && pages[pages.length - 1] === 0) {
			pages.pop();
		}

		input.value = pages.map(formatPage).join(' ');
		input.dispatchEvent(new Event('input'));
	};

	// Auto-fit sheets to workspace
	window.fitSheetsToWorkspace = function(forceScale){
		const workspace = document.querySelector('.workspace');
		const sheets = document.querySelectorAll('.page');
		if(!workspace || !sheets.length) return;

		// Reset to get natural dimensions
		sheets.forEach(s => {
			s.style.transform = '';
			s.style.marginBottom = '';
			s.style.marginTop = '';
			s.style.marginLeft = '';
			s.style.marginRight = '';
		});

		// Get computed styles for accuracy
		const style = window.getComputedStyle(workspace);
		const padTop = parseFloat(style.paddingTop) || 0;
		const padBottom = parseFloat(style.paddingBottom) || 0;
		const padLeft = parseFloat(style.paddingLeft) || 0;
		const padRight = parseFloat(style.paddingRight) || 0;
		const gap = parseFloat(style.gap) || 0;

		const availW = workspace.clientWidth - padLeft - padRight - 40;
		const availH = workspace.clientHeight - padTop - padBottom - 40;
		
		const sheetW = sheets[0].offsetWidth;
		const sheetH = sheets[0].offsetHeight;
		if(sheetW === 0 || sheetH === 0) return;

		let scale;
		if(typeof forceScale === 'number'){
			scale = forceScale;
		} else {
			scale = Math.min(availW / sheetW, availH / sheetH);
			scale = Math.min(1, Math.max(0.1, scale)); // Cap at 100% scale, min 10%
		}

		// Update UI
		const slider = document.getElementById('sheetZoomSlider');
		const label = document.getElementById('sheetZoomValue');
		if(slider && document.activeElement !== slider) slider.value = Math.round(scale * 100);
		if(label) label.textContent = Math.round(scale * 100) + '%';

		// Calculate vertical centering
		const totalVisualH = (sheets.length * sheetH * scale) + ((sheets.length - 1) * gap);
		const topOffset = Math.max(0, (availH - totalVisualH) / 2);
		
		// Calculate horizontal centering
		const visualW = sheetW * scale;
		const leftOffset = Math.max(0, (availW - visualW) / 2);

		sheets.forEach((s, i) => {
			// Use translate for centering to avoid margin:auto issues with large unscaled widths
			s.style.transform = `translate(${leftOffset}px, 0px) scale(${scale})`;
			s.style.transformOrigin = 'top left';
			s.style.margin = '0'; // Override CSS margin: 0 auto

			const heightDiff = sheetH * (1 - scale);
			s.style.marginBottom = `-${heightDiff}px`;

			const widthDiff = sheetW * (1 - scale);
			s.style.marginRight = `-${widthDiff}px`;
			
			if(i === 0) s.style.marginTop = `${topOffset}px`;
		});
	};

	// Update status bar with slot info
	window.updateStatusSlotInfo = function(){
		const statusSlot = document.getElementById('statusSlotSize');
		if(!statusSlot) return;

		const pxPerMm = 96 / 25.4;
		let w, h, trimW, trimH;

		if(window.__selectedSlots && window.__selectedSlots.length > 0){
			const i = window.__selectedSlots[0];
			const el = document.getElementsByClassName('preview')[i];
			const pageNum = el ? parseInt(el.dataset.pageNum) : null;
			
			const slotT = (window.__slotTransforms && window.__slotTransforms[i]) || {};
			const pageT = (pageNum && window.__pageTransforms && window.__pageTransforms[pageNum]) || {};
			const layout = slotT.layout || pageT.layout || {};

			w = (layout.width !== undefined) ? layout.width : (window.__slotW || 0);
			h = (layout.height !== undefined) ? layout.height : (window.__slotH || 0);

			const l = (layout.expandL !== undefined) ? layout.expandL : (window.__expandL || 0);
			const r = (layout.expandR !== undefined) ? layout.expandR : (window.__expandR || 0);
			const t = (layout.expandT !== undefined) ? layout.expandT : (window.__expandT || 0);
			const b = (layout.expandB !== undefined) ? layout.expandB : (window.__expandB || 0);

			trimW = w - (l + r);
			trimH = h - (t + b);
		} else {
			w = window.__slotW || 0;
			h = window.__slotH || 0;
			trimW = window.__trimW || (w - ((window.__expandL||0) + (window.__expandR||0)));
			trimH = window.__trimH || (h - ((window.__expandT||0) + (window.__expandB||0)));
		}

		const bleedX = parseFloat(document.getElementById('cropBleedXInput')?.value || 0);
		const bleedY = parseFloat(document.getElementById('cropBleedYInput')?.value || 0);
		const cropW = Math.max(0, (trimW/pxPerMm) - (2 * bleedX));
		const cropH = Math.max(0, (trimH/pxPerMm) - (2 * bleedY));

		statusSlot.textContent = `Slot: ${(w/pxPerMm).toFixed(2)} × ${(h/pxPerMm).toFixed(2)} mm (Cropped: ${cropW.toFixed(2)} × ${cropH.toFixed(2)} mm)`;
	};
