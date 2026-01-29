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

	/* PDF Rendering & Loading */
	// renderPages: renders PDF pages into preview according to rotation and scale
	window.renderPages = function(rotation = 0, scale = 1, offset = null, pageIndex = null){
		// Increment render ID to invalidate previous async renders
		window.__renderId = (window.__renderId || 0) + 1;

		// Handle optional offset argument (if 3rd arg is pageIndex)
		if(offset !== null && typeof offset !== 'object'){
			pageIndex = offset;
			offset = null;
		}

		const currentRenderId = window.__renderId;

		if(!window.__pdfDoc) return;
		const numPages = window.__pdfDoc.numPages;
		const previewEls = document.getElementsByClassName('preview');

		const firstEl = previewEls[0];
		const inset = window.getBorderSize(firstEl);
		const globalW = window.__slotW || (firstEl ? firstEl.clientWidth : 100);
		const globalH = window.__slotH || (firstEl ? firstEl.clientHeight : 100);
		const availW = Math.max(globalW - inset.h, 100);
		const availH = Math.max(globalH - inset.v, 100);

		const pageRangeStr = (typeof pageRangeInput !== 'undefined' && pageRangeInput) ? pageRangeInput.value : '';
		const cols = parseInt(document.getElementById('colsInput')?.value || 1);
		const pagesToRender = (window.mapPagesToSlots && window.mapPagesToSlots(pageRangeStr, previewEls.length, cols)) || [];

		const renderPromises = [];
		for(let i=0; i<previewEls.length; i++){
			const targetEl = previewEls[i];
			const rawPageNum = (i < pagesToRender.length) ? pagesToRender[i] : 0;
			const pageNum = (rawPageNum < 0) ? 0 : rawPageNum;
			const logicalIndex = (rawPageNum < 0) ? -rawPageNum : null;

			if(pageNum > numPages || (pageNum < 1 && (pageNum !== 0 || !window.__showPageNumbers))) {
				targetEl.dataset.pageNum = '';
				targetEl.innerHTML = '';
				continue;
			}

			// Check for page-specific overrides
			const slotOverrides = (window.__slotTransforms && window.__slotTransforms[i]) || {};
			const pageOverrides = (window.__pageTransforms && window.__pageTransforms[pageNum]) || {};
			
			const effRotation = (typeof slotOverrides.rotation === 'number') ? slotOverrides.rotation : ((typeof pageOverrides.rotation === 'number') ? pageOverrides.rotation : rotation);
			const globalSX = (typeof scale === 'object') ? scale.x : scale;
			const globalSY = (typeof scale === 'object') ? scale.y : scale;
			const effSX = (typeof slotOverrides.scaleX === 'number') ? slotOverrides.scaleX : ((typeof pageOverrides.scaleX === 'number') ? pageOverrides.scaleX : globalSX);
			const effSY = (typeof slotOverrides.scaleY === 'number') ? slotOverrides.scaleY : ((typeof pageOverrides.scaleY === 'number') ? pageOverrides.scaleY : globalSY);
			const effSkewX = (typeof slotOverrides.skewX === 'number') ? slotOverrides.skewX : ((typeof pageOverrides.skewX === 'number') ? pageOverrides.skewX : (window.__skewX || 0));
			const effSkewY = (typeof slotOverrides.skewY === 'number') ? slotOverrides.skewY : ((typeof pageOverrides.skewY === 'number') ? pageOverrides.skewY : (window.__skewY || 0));
			const effOffsetX = (typeof slotOverrides.offsetX === 'number') ? slotOverrides.offsetX : ((typeof pageOverrides.offsetX === 'number') ? pageOverrides.offsetX : (offset && typeof offset.x === 'number' ? offset.x : (window.__offsetX || 0)));
			const effOffsetY = (typeof slotOverrides.offsetY === 'number') ? slotOverrides.offsetY : ((typeof pageOverrides.offsetY === 'number') ? pageOverrides.offsetY : (offset && typeof offset.y === 'number' ? offset.y : (window.__offsetY || 0)));
			const effSlotX = (typeof slotOverrides.slotX === 'number') ? slotOverrides.slotX : ((typeof pageOverrides.slotX === 'number') ? pageOverrides.slotX : (window.__slotX || 0));
			const effSlotY = (typeof slotOverrides.slotY === 'number') ? slotOverrides.slotY : ((typeof pageOverrides.slotY === 'number') ? pageOverrides.slotY : (window.__slotY || 0));

			const pagePromise = (pageNum > 0) ? window.__pdfDoc.getPage(pageNum) : Promise.resolve(null);

			const p = pagePromise.then(page=>{
					if(window.__renderId !== currentRenderId) return;

					// DPI scale increases raster resolution but should not change CSS display size
					// In Native mode, we don't need high DPI rasterization, so we use 1.
					const useNative = window.__renderNative;
					const dpiScale = useNative ? 1 : ((window.__placedDpi || 96) / 96);

					let viewport;
					let displayBaseScale = 1;
					let r = 0;
					let treatAsRotatedForScale = false;

					if(page){
						const orig = page.getViewport({ scale:1, rotation:0 });
						let fit;
						if(window.calculatePageFit && window.__fitToPage !== false){
							fit = window.calculatePageFit(orig.width, orig.height, availW, availH, effRotation);
							window.__lastFitScale = fit.scale;
						} else {
							fit = { scale: window.__lastFitScale || 1, rotation: effRotation, treatAsRotated: false };
						}
						displayBaseScale = fit.scale;
						r = fit.rotation;
						treatAsRotatedForScale = fit.treatAsRotated;
						const rasterScale = displayBaseScale * dpiScale;
						viewport = page.getViewport({ scale: rasterScale, rotation: treatAsRotatedForScale ? r : 0 });
					} else {
						viewport = { width: availW * dpiScale, height: availH * dpiScale };
					}

					let renderPromise, renderEl;

					if(window.__showPageNumbers){
						// Render simple box with page number
						let html = '';
						let boxColor = 'rgba(0, 106, 255, 1)';
						let boxBg = 'rgba(0, 106, 255, 0.1)';

						if(pageNum === 0){
							if(rawPageNum === -1){
								// Special blank (e.g. 2sided padding)
								html = `<span style="font-size:24px; opacity:0.7">BLANK</span>`;
								boxColor = '#ffb74d'; // Orange-ish
								boxBg = '#fff3e0';
							} else {
								// Empty page: show 0 [imposition index]
								html = `<span style="font-size:40px">0</span><span style="font-size:30px">[${logicalIndex || (i+1)}]</span>`;
								boxColor = '#cccccc';
								boxBg = '#ffffff';
							}
						} else {
							// Resolve file info
							let fIdx = 0;
							let localP = pageNum;
							if(window.__filePageCounts && window.__filePageCounts.length){
								let countSoFar = 0;
								for(let k=0; k<window.__filePageCounts.length; k++){
									if(pageNum <= countSoFar + window.__filePageCounts[k]){
										fIdx = k;
										localP = pageNum - countSoFar;
										break;
									}
									countSoFar += window.__filePageCounts[k];
								}
							}
							const fName = (window.__fileNames && window.__fileNames[fIdx]) ? window.__fileNames[fIdx] : '';
							html = (fName ? `<span style="font-size:18px; margin-bottom:4px">${fName}</span>` : '') + `<span style="font-size:40px">${localP}</span>`;

							// Generate distinct color for each file
							const hue = Math.round((fIdx * 137.508) % 360);
							boxColor = `hsl(${hue}, 80%, 30%)`;
							boxBg = `hsl(${hue}, 80%, 90%)`;
						}

						const div = document.createElement('div');
						div.innerHTML = html;
						div.style.display = 'flex';
						div.style.flexDirection = 'column';
						div.style.alignItems = 'center';
						div.style.justifyContent = 'center';
						div.style.textAlign = 'center';
						div.style.lineHeight = '1.3';
						div.style.padding = '4px';
						div.style.overflow = 'hidden';
						div.style.fontWeight = 'bold';
						div.style.color = boxColor;
						div.style.backgroundColor = boxBg;
						div.style.border = '1px solid ' + boxColor;
						div.style.boxSizing = 'border-box';
						renderEl = div;
						renderPromise = Promise.resolve();
					} else if(useNative && page){
						// Native PDF Rendering: Embed with explicit type often respects toolbar=0 better
						renderEl = document.createElement('embed');
						renderEl.type = 'application/pdf';
						renderEl.src = (window.__lastObjectURL || '') + '#page=' + pageNum + '&toolbar=0&navpanes=0&scrollbar=0&view=Fit';
						renderEl.style.border = 'none';
						renderPromise = Promise.resolve();
					} else if(page) {
						// Raster (Canvas) Rendering
						const canvas = document.createElement('canvas');
						canvas.width = Math.round(viewport.width);
						canvas.height = Math.round(viewport.height);
						const ctx = canvas.getContext('2d');
						renderEl = canvas;
						renderPromise = page.render({ canvasContext: ctx, viewport: viewport }).promise;
					} else {
						return;
					}

					return renderPromise.then(()=>{
						if(window.__renderId !== currentRenderId) return;
						if(!renderEl) return;

						// Common styles for render element (Canvas or SVG)
						renderEl.style.width = (viewport.width / dpiScale) + 'px';
						renderEl.style.height = (viewport.height / dpiScale) + 'px';
						renderEl.style.display = window.__showPageNumbers ? 'flex' : 'block';
						if(window.__previewProfileFilter) renderEl.style.filter = window.__previewProfileFilter;

						// Check for layout overrides
						const layout = slotOverrides.layout || pageOverrides.layout || {};
						const w = (layout.width !== undefined) ? layout.width : availW;
						const h = (layout.height !== undefined) ? layout.height : availH;
						const l = (layout.expandL !== undefined) ? layout.expandL : (window.__expandL || 0);
						const r_exp = (layout.expandR !== undefined) ? layout.expandR : (window.__expandR || 0);
						const top = (layout.expandT !== undefined) ? layout.expandT : (window.__expandT || 0);
						const bot = (layout.expandB !== undefined) ? layout.expandB : (window.__expandB || 0);

						// wrapper keeps preview bounds stable; apply rotation+scale via CSS transform
						const wrap = document.createElement('div');
						wrap.style.width = Math.ceil(w) + 'px';
						wrap.style.height = Math.ceil(h) + 'px';
						wrap.style.display = 'flex';
						wrap.style.alignItems = 'center';
						wrap.style.justifyContent = 'center';
						wrap.style.overflow = 'hidden';
						wrap.style.padding = '0';

						// Container for canvas + overlays (handles rotation/scale)
						const pageContainer = document.createElement('div');
						pageContainer.className = 'preview-page-layer';
						pageContainer.style.position = 'relative';
						pageContainer.style.display = 'inline-block';
						pageContainer.style.transformOrigin = 'center center';

						// Store baked rotation so layout can calculate CSS rotation correctly
						const bakedRot = treatAsRotatedForScale ? r : 0;
						pageContainer.dataset.bakedRotation = bakedRot;

						// If we're preferring upscale over rotation, avoid rotating the canvas.
						pageContainer.dataset.rotation = treatAsRotatedForScale ? 0 : effRotation;
						const appliedRotation = treatAsRotatedForScale ? 0 : effRotation;

						// Calculate offset to keep content aligned with Trim Box despite expansion
						// Expansion adds width/height, centering shifts content. We shift back.
						const expandOffsetX = (l - r_exp) / 2;
						const expandOffsetY = (top - bot) / 2;

						if(window.applyPageTransform) window.applyPageTransform(pageContainer, effOffsetX + expandOffsetX, effOffsetY + expandOffsetY, appliedRotation, effSX, effSY, effSkewX, effSkewY);

						// Add content (Directly append renderEl)
						renderEl.style.transform = '';
						pageContainer.appendChild(renderEl);

						// Add Overlays (e.g. purple square)
						if(window.addPreviewOverlays) window.addPreviewOverlays(wrap, pageNum, {x: l, y: top, r: r_exp});

						// Add Box Overlays
						if(page){
							const createOverlay = (box, color) => {
								if(!box || box.length < 4) return;
								const r = viewport.convertToViewportRectangle(box);
								// Convert raster pixels to CSS pixels
								const x = Math.min(r[0], r[2]) / dpiScale, y = Math.min(r[1], r[3]) / dpiScale;
								const w = Math.abs(r[2] - r[0]) / dpiScale, h = Math.abs(r[3] - r[1]) / dpiScale;
								const div = document.createElement('div');
								Object.assign(div.style, { position:'absolute', left:x+'px', top:y+'px', width:w+'px', height:h+'px', border:'1px solid '+color, boxSizing:'border-box', zIndex:10, pointerEvents:'none' });
								pageContainer.appendChild(div);
							};
							if(page.bleedBox) createOverlay(page.bleedBox, 'red');
							if(page.trimBox) createOverlay(page.trimBox, 'green');
						}

						wrap.appendChild(pageContainer);
						targetEl.dataset.pageNum = pageNum;
						targetEl.innerHTML = ''; // Clear old content only when new content is ready
						targetEl.appendChild(wrap);
						targetEl.style.transform = 'translate(' + effSlotX + 'px, ' + effSlotY + 'px)';
					}).catch(err=>{ console.error('Error rendering page', pageNum, err); });
			}).catch(err=>{ console.error('Error getting page', pageNum, err); });
			renderPromises.push(p);
		}
		return Promise.all(renderPromises).then(()=>{
			if(window.drawSheetCropMarks) window.drawSheetCropMarks();
			if(window.drawSheetOverlays) window.drawSheetOverlays();
		});
	};

	// openPdfFile: accepts File object or URL string
	window.openPdfFile = async function(inputFileOrUrl){
		if(!inputFileOrUrl) return;
		
		const fixCheckbox = document.getElementById('fixPdfCheckbox');
		const shouldFix = fixCheckbox && fixCheckbox.checked;
		let wasFixed = false;
		
		// Handle multiple files (FileList or Array)
		let files = [];
		if(inputFileOrUrl instanceof FileList || (Array.isArray(inputFileOrUrl) && inputFileOrUrl[0] instanceof File)){
			files = Array.from(inputFileOrUrl);
		} else if(inputFileOrUrl instanceof File){
			files = [inputFileOrUrl];
		}

		let url;
		let originalBuffer = null;
		window.__filePageCounts = [];
		window.__fileNames = [];

		if(files.length > 0){
			window.__importedFiles = files;
			window.__fileNames = files.map(f => f.name);
		} else if(typeof inputFileOrUrl === 'string'){
			window.__importedFiles = [];
			window.__fileNames = [inputFileOrUrl.split('/').pop()];
		}

		// If multiple files are provided, merge them
		if(files.length > 1 && window.PDFLib){
			try {
				const { PDFDocument } = window.PDFLib;
				const newDoc = await PDFDocument.create();
				const counts = [];

				for(let file of files){
					const buffer = await file.arrayBuffer();
					const srcDoc = await PDFDocument.load(buffer);
					const pageCount = srcDoc.getPageCount();
					counts.push(pageCount);
					
					// Copy pages (preserves content better than embed+draw, unless fixing is needed)
					// If shouldFix is true, we might want to use embed logic, but for now let's stick to copy for multi-import
					const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices());
					pages.forEach(p => newDoc.addPage(p));
				}
				window.__filePageCounts = counts;

				const pdfBytes = await newDoc.save();
				const blob = new Blob([pdfBytes], { type: 'application/pdf' });
				if(window.__lastObjectURL){ try{ URL.revokeObjectURL(window.__lastObjectURL) }catch(e){} window.__lastObjectURL = null }
				url = URL.createObjectURL(blob);
				window.__lastObjectURL = url;

				// Update Page Range Input with syntax: 1:(1-12) 2:(1-28)
				if(typeof pageRangeInput !== 'undefined' && pageRangeInput){
					const parts = counts.map((count, idx) => `f${idx+1}:(1-${count})`);
					pageRangeInput.value = parts.join(' ');
				}
				
				// Update info text
				if(info) {
					window.renderFileList();
				}

			} catch(e) {
				console.error('Error merging files', e);
				if(files.length === 1) originalBuffer = await files[0].arrayBuffer(); // Fallback
			}
		} else if(typeof inputFileOrUrl === 'string'){
			url = inputFileOrUrl;
			if(shouldFix) originalBuffer = await fetch(url).then(res => res.arrayBuffer());
		} else if(files.length === 1 && !url){
			// Single file fallback if merge logic wasn't used
			if(shouldFix) originalBuffer = await files[0].arrayBuffer();
			else {
				if(window.__lastObjectURL){ try{ URL.revokeObjectURL(window.__lastObjectURL) }catch(e){} window.__lastObjectURL = null }
				url = URL.createObjectURL(files[0]);
				window.__lastObjectURL = url;
			}
		} else {
			if(!url) { console.warn('unsupported input to openPdfFile'); return; }
		}

		if(shouldFix && originalBuffer && window.PDFLib){
			try {
				const { PDFDocument, degrees } = window.PDFLib;
				const srcDoc = await PDFDocument.load(originalBuffer);
				const newDoc = await PDFDocument.create();
				const pages = srcDoc.getPages();
				const embeddedPages = await newDoc.embedPages(pages);
				
				let modified = false;
				for(let i=0; i<pages.length; i++){
					const srcPage = pages[i];
					const embedded = embeddedPages[i];
					const { width, height } = srcPage.getSize();
					const rotAngle = srcPage.getRotation().angle;
					const rotation = (rotAngle % 360 + 360) % 360;

					if(rotation === 0){
						const page = newDoc.addPage([width, height]);
						page.drawPage(embedded, { x: 0, y: 0, width, height, rotate: degrees(0) });
					} else {
						modified = true;
						let newWidth = width;
						let newHeight = height;
						let drawOptions = {};

						if(rotation === 90){
							newWidth = height;
							newHeight = width;
							drawOptions = { x: 0, y: newHeight, rotate: degrees(90) };
						} else if(rotation === 180){
							drawOptions = { x: newWidth, y: newHeight, rotate: degrees(180) };
						} else if(rotation === 270){
							newWidth = height;
							newHeight = width;
							drawOptions = { x: newWidth, y: 0, rotate: degrees(270) };
						}

						const page = newDoc.addPage([newWidth, newHeight]);
						page.drawPage(embedded, {
							...drawOptions,
							width: width,
							height: height
						});
					}
				}
				
				if(modified){
					const pdfBytes = await newDoc.save();
					const blob = new Blob([pdfBytes], { type: 'application/pdf' });
					if(window.__lastObjectURL){ try{ URL.revokeObjectURL(window.__lastObjectURL) }catch(e){} window.__lastObjectURL = null }
					url = URL.createObjectURL(blob);
					window.__lastObjectURL = url;
					wasFixed = true;
				} else {
					if(window.__lastObjectURL){ try{ URL.revokeObjectURL(window.__lastObjectURL) }catch(e){} window.__lastObjectURL = null }
					const blob = new Blob([originalBuffer], { type: 'application/pdf' });
					url = URL.createObjectURL(blob);
					window.__lastObjectURL = url;
				}
			} catch(e){
				console.error('Error fixing PDF:', e);
				if(!url && inputFileOrUrl instanceof File) url = URL.createObjectURL(inputFileOrUrl);
			}
		} else if(shouldFix && !window.PDFLib && !url && inputFileOrUrl instanceof File){
			url = URL.createObjectURL(inputFileOrUrl);
		}

		if(info && typeof info.textContent !== 'undefined' && files.length <= 1){
			if(window.__importedFiles && window.__importedFiles.length > 0){
				window.renderFileList();
			} else {
				const f = files.length ? files[0] : inputFileOrUrl;
				info.textContent = (f.name ? f.name + ' — ' + Math.round((f.size||0)/1024) + ' KB' : 'Loaded PDF') + (wasFixed ? ' (Fixed)' : '');
			}
		}
		if(boxInfo) boxInfo.textContent = '';

		// load PDF.js if needed
		if(!window.pdfjsLib){
			await new Promise((res, rej)=>{
				const s = document.createElement('script');
				s.src = (window.__pdfConfig && window.__pdfConfig.src) || 'libs/pdf.min.js';
				s.onload = res; s.onerror = ()=>rej(new Error('pdfjs load failed'));
				document.head.appendChild(s);
			}).catch(err=>{ preview.textContent = 'Failed to load PDF renderer.'; throw err });
		}

		const pdfjsLib = window.pdfjsLib;
		pdfjsLib.GlobalWorkerOptions.workerSrc = (window.__pdfConfig && window.__pdfConfig.workerSrc) || 'libs/pdf.worker.min.js';
		try{
			const loading = pdfjsLib.getDocument(url).promise;
			const doc = await loading;
			window.__pdfDoc = doc;
			
			const isSingleFile = window.__filePageCounts.length === 0;
			if(isSingleFile){
				window.__filePageCounts = [doc.numPages];
				if(window.__importedFiles && window.__importedFiles.length > 0){
					window.renderFileList();
				}
			}
			// Update page range input
			if(typeof pageRangeInput !== 'undefined' && pageRangeInput && isSingleFile){
				pageRangeInput.value = (doc.numPages > 1) ? ('1-' + doc.numPages) : '1';
			}
			// 1. Get file info (dimensions, color profile, trimbox, bleedbox, etc.)
			let fileInfo = {};
			try{
				fileInfo = await window.extractPdfFileInfo(doc);
			}catch(e){ console.warn('Could not extract full file info', e); }

			// Display box info
			if(boxInfo && fileInfo){
				const lines = [];
				const toMm = (pt) => (pt / 72 * 25.4).toFixed(2);
				const addBox = (name, b) => {
					if(b && b.length >= 4) lines.push(`${name}: ${toMm(Math.abs(b[2]-b[0]))} × ${toMm(Math.abs(b[3]-b[1]))} mm`);
				};
				addBox('Trim', fileInfo.trimBox);
				addBox('Bleed', fileInfo.bleedBox);
				boxInfo.textContent = lines.join('\n');
			}

			// 2. Reset scale and rotation
			window.__currentScale = 1;
			window.__currentScaleX = 1;
			window.__currentScaleY = 1;
			window.__currentRotation = 0;
			window.__offsetX = 0;
			window.__offsetY = 0;
			window.__skewX = 0;
			window.__skewY = 0;
			window.__previewProfileFilter = '';
			const iccSelect = document.getElementById('iccProfileSelect');
			if(iccSelect){
				iccSelect.value = '';
				iccSelect.dispatchEvent(new Event('change'));
			}
			if(scaleSlider){ scaleSlider.value = '100'; scaleSlider.disabled = false; }
			if(rotationInput){ rotationInput.value = '0'; rotationInput.disabled = false; }
			if(rotationSlider){ rotationSlider.value = '0'; rotationSlider.disabled = false; }
			if(smartFitCheckbox){ smartFitCheckbox.disabled = false; smartFitCheckbox.checked = window.__preferUpscaleNotRotate; }
			if(unlockRatioCheckbox){ unlockRatioCheckbox.disabled = false; unlockRatioCheckbox.checked = false; }
			if(nativeCheckbox){ nativeCheckbox.disabled = false; nativeCheckbox.checked = false; window.__renderNative = false; }
			const rotPageCheck = document.getElementById('rotPageCheck');
			const scalePageCheck = document.getElementById('scalePageCheck');
			const skewPageCheck = document.getElementById('skewPageCheck');
			const offsetPageCheck = document.getElementById('offsetPageCheck');
			const previewPageCheck = document.getElementById('previewPageCheck');
			if(rotPageCheck) { rotPageCheck.checked = false; rotPageCheck.dispatchEvent(new Event('change')); }
			if(scalePageCheck) { scalePageCheck.checked = false; scalePageCheck.dispatchEvent(new Event('change')); }
			if(skewPageCheck) { skewPageCheck.checked = false; skewPageCheck.dispatchEvent(new Event('change')); }
			if(offsetPageCheck) { offsetPageCheck.checked = false; offsetPageCheck.dispatchEvent(new Event('change')); }
			if(slotPageCheck) { slotPageCheck.checked = false; slotPageCheck.dispatchEvent(new Event('change')); }
			if(typeof offsetXInput !== 'undefined' && offsetXInput) { offsetXInput.value = '0'; offsetXInput.disabled = false; }
			if(typeof offsetYInput !== 'undefined' && offsetYInput) { offsetYInput.value = '0'; offsetYInput.disabled = false; }
			if(typeof skewXInput !== 'undefined' && skewXInput) { skewXInput.value = '0'; skewXInput.disabled = false; }
			if(typeof skewYInput !== 'undefined' && skewYInput) { skewYInput.value = '0'; skewYInput.disabled = false; }
			if(typeof offsetXSlider !== 'undefined' && offsetXSlider) { offsetXSlider.value = '0'; offsetXSlider.disabled = false; }
			if(typeof offsetYSlider !== 'undefined' && offsetYSlider) { offsetYSlider.value = '0'; offsetYSlider.disabled = false; }
			if(typeof skewXSlider !== 'undefined' && skewXSlider) { skewXSlider.value = '0'; skewXSlider.disabled = false; }
			if(typeof skewYSlider !== 'undefined' && skewYSlider) { skewYSlider.value = '0'; skewYSlider.disabled = false; }
			if(scaleValue) scaleValue.textContent = '100%';
			const bgTransparentCheckbox = document.getElementById('bgTransparentCheckbox');
			if(bgTransparentCheckbox){
				bgTransparentCheckbox.checked = true;
				bgTransparentCheckbox.dispatchEvent(new Event('change'));
			}
			const wIn = document.getElementById('widthInput');
			const hIn = document.getElementById('heightInput');
			if(wIn) { wIn.value = ''; wIn.disabled = true; }
			if(hIn) { hIn.value = ''; hIn.disabled = true; }
			// enable dpi control
			const dpiEl = document.getElementById('dpiInput');
			if(dpiEl){ dpiEl.disabled = false; dpiEl.value = window.__placedDpi || 96; }
			// 3. Send dimensions to slot function for creating slot by these dimensions
			if(fileInfo && isFinite(fileInfo.widthMm) && isFinite(fileInfo.heightMm)){
				// compute preview pixel size using DPI (px per mm = dpi/25.4)
				const dpi = 96;
				const pxPerMm = dpi / 25.4;
				const wpx = Math.max(1, fileInfo.widthMm * pxPerMm);
				const hpx = Math.max(1, fileInfo.heightMm * pxPerMm);
				window.setSlotFrame(wpx, hpx);
				window.__trimW = wpx;
				window.__trimH = hpx;
				window.__expandL = 0;
				window.__expandR = 0;
				window.__expandT = 0;
				window.__expandB = 0;
				['expandLeftInput','expandRightInput','expandTopInput','expandBottomInput'].forEach(id=>{
					const el = document.getElementById(id);
					if(el) el.value = 0;
				});
				const pwIn = document.getElementById('slotWidthInput');
				const phIn = document.getElementById('slotHeightInput');
				if(pwIn && phIn) { 
					pwIn.value = fileInfo.widthMm; 
					phIn.value = fileInfo.heightMm;
					pwIn.style.color = ''; phIn.style.color = '';
				}
				window.__fileWidthMm = fileInfo.widthMm;
				window.__fileHeightMm = fileInfo.heightMm;
				const statusFile = document.getElementById('statusFileDim');
				if(statusFile) statusFile.textContent = `File: ${fileInfo.widthMm} × ${fileInfo.heightMm} mm`;
				if(wIn) { wIn.value = fileInfo.widthMm; wIn.disabled = false; }
				if(hIn) { hIn.value = fileInfo.heightMm; hIn.disabled = false; }
			}

			// 4. Update sheet size (respects UI selection), calc grid fit, and render
			if(window.updateSheetSize){
				window.updateSheetSize();
			} else {
				// Fallback if UI logic is missing
				if(window.calculateGridFit && window.__trimW && window.__trimH){
					const fit = window.calculateGridFit(window.__trimW, window.__trimH);
					if(rowsInput) rowsInput.value = fit.rows;
					if(colsInput) colsInput.value = fit.cols;
				}
				const rInput = document.getElementById('rowsInput');
				const cInput = document.getElementById('colsInput');
				if(window.generatePreviewGrid) {
					window.generatePreviewGrid(parseInt(rInput ? rInput.value : 1, 10) || 1, parseInt(cInput ? cInput.value : 1, 10) || 1);
				}
				window.renderPages(0, 1);
			}
		}catch(err){ preview.textContent = 'Error loading PDF: '+(err && err.message); }
	};

	// extractPdfFileInfo: returns basic measurements and optional boxes/profiles
	window.extractPdfFileInfo = async function(pdfDoc){
		if(!pdfDoc) return {};
		const info = {};
		try{
			const page = await pdfDoc.getPage(1);
			// Get all boxes
			info.mediaBox = page.mediaBox;
			info.cropBox = page.cropBox;
			info.trimBox = page.trimBox;
			info.bleedBox = page.bleedBox;
			info.artBox = page.artBox;
			// Prefer explicit boxes when present: trimBox -> cropBox -> mediaBox -> view
			const box = info.trimBox || info.cropBox || info.mediaBox || page.view || null;
			let wPts, hPts;
			if(box && Array.isArray(box) && box.length >= 4){
				wPts = Math.abs(box[2] - box[0]);
				hPts = Math.abs(box[3] - box[1]);
			} else {
				const vp = page.getViewport({ scale: 1, rotation: 0 });
				wPts = vp.width;
				hPts = vp.height;
			}
			// points -> mm (1 pt = 1/72 in, 1 in = 25.4 mm)
			info.widthPt = wPts;
			info.heightPt = hPts;
			info.widthMm = Number(((wPts / 72) * 25.4).toFixed(2));
			info.heightMm = Number(((hPts / 72) * 25.4).toFixed(2));
			// Surface detected box and rotation (if present)
			info.detectedBox = box || null;
			info.rotation = (typeof page.rotate === 'number') ? page.rotate : 0;
			// Color/profile extraction is not directly exposed by pdf.js; leave null if unknown
			info.colorProfile = null;
		}catch(e){ console.warn('extractPdfFileInfo error', e); }
		return info;
	};

	// selectPdfPage: choose which page to render (1-based). Use 'all' to render every page.
	window.selectPdfPage = function(pageIndex){
		if(!window.__pdfDoc){ window.__currentPage = pageIndex; return; }
		if(pageIndex === 'all'){
			window.__currentPage = 'all';
		} else {
			let i = parseInt(pageIndex,10) || 1;
			if(i < 1) i = 1;
			if(i > window.__pdfDoc.numPages) i = window.__pdfDoc.numPages;
			window.__currentPage = i;
		}
		// re-render using existing rotation and scale
		window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0}, window.__currentPage);
	};

	// generateImposedPdf: Create a new PDF using pdf-lib based on the current layout
	window.generateImposedPdf = async function(){
		if(!window.__lastObjectURL || !window.PDFLib) return;
		const { PDFDocument, rgb, cmyk, degrees, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } = window.PDFLib;

		// Progress Bar
		const updateProgress = async (msg, pct) => {
			let el = document.getElementById('pdfGenProgress');
			if(!el){
				el = document.createElement('div');
				el.id = 'pdfGenProgress';
				Object.assign(el.style, {
					position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
					backgroundColor: 'rgba(0,0,0,0.7)', zIndex: '2147483647', display: 'flex',
					alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
				});
				el.innerHTML = `
					<div style="background:#fff; padding:20px; border-radius:8px; width:300px; box-shadow:0 4px 12px rgba(0,0,0,0.3)">
						<div id="pdfGenStatus" style="margin-bottom:10px; font-family:sans-serif; font-size:14px; color:#333; text-align:center">Initializing...</div>
						<div style="width:100%; height:6px; background:#eee; border-radius:3px; overflow:hidden">
							<div id="pdfGenBar" style="width:0%; height:100%; background:#00bcd4; transition:width 0.1s"></div>
						</div>
					</div>
				`;
				document.body.appendChild(el);
			}
			el.style.display = 'flex';
			document.getElementById('pdfGenStatus').textContent = msg;
			document.getElementById('pdfGenBar').style.width = Math.max(0, Math.min(100, pct)) + '%';
			await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); // Allow UI update
		};
		const closeProgress = () => {
			const el = document.getElementById('pdfGenProgress');
			if(el) el.style.display = 'none';
		};

		const safe = (v) => {
			const n = (typeof v === 'number') ? v : parseFloat(v);
			return (isFinite(n)) ? n : 0;
		};

		// Get debug output area
		let debugEl = document.getElementById('pdfDebugOutput');
		if(debugEl) debugEl.value = '';
		
		const debug = (msg) => {
			console.log('[PDF Debug]', msg);
			if(debugEl){
				// debugEl.value += new Date().toLocaleTimeString() + ' | ' + msg + '\n'; // Disabled for performance
				debugEl.scrollTop = debugEl.scrollHeight;
			}
		};

		try {
			await updateProgress('Loading source PDF...', 5);
			debug('Starting PDF generation...');
			debug('PDFLib available: ' + (!!window.PDFLib));
			// Load source PDF
			const existingPdfBytes = await fetch(window.__lastObjectURL).then(res => res.arrayBuffer());
			const pdfDoc = await PDFDocument.create();
			const srcDoc = await PDFDocument.load(existingPdfBytes);
			// Release raw buffer to help GC
			// existingPdfBytes = null; 
			debug('Source PDF loaded, pages: ' + srcDoc.getPageCount());
			
			// Embed pages on demand to save memory
			const embeddedPagesCache = new Map();
			const getEmbeddedPage = async (pageIndex) => {
				if(embeddedPagesCache.has(pageIndex)) return embeddedPagesCache.get(pageIndex);
				if(pageIndex < 0 || pageIndex >= srcDoc.getPageCount()) return null;
				const srcPage = srcDoc.getPage(pageIndex);
				const embeddedPage = await pdfDoc.embedPage(srcPage);
				embeddedPagesCache.set(pageIndex, embeddedPage);
				return embeddedPage;
			};

			await updateProgress('Preparing layout...', 10);
			// Get Layout Metrics from DOM
			const sheets = document.querySelectorAll('.page');
			debug('Sheets found: ' + sheets.length);
			if(sheets.length === 0) {
				debug('ERROR: No sheets found with class "page"');
				return;
			}

			// Conversion factor: CSS pixels (96 DPI) to PDF points (72 DPI)
			// 1 px = 0.75 pt
			const pxToPt = 0.75;

			let globalPreviewIndex = 0; // Track index across all sheets

			let lastProgressTime = 0;
			for(let i = 0; i < sheets.length; i++){
				const now = Date.now();
				if (i === 0 || i === sheets.length - 1 || now - lastProgressTime > 100) {
					const pct = 10 + Math.round((i / sheets.length) * 80);
					await updateProgress(`Generating Sheet ${i + 1} of ${sheets.length}...`, pct);
					lastProgressTime = now;
				}
				const sheet = sheets[i];
				// Create page matching the sheet size
				const sheetW = safe(sheet.clientWidth * pxToPt) || 595;
				const sheetH = safe(sheet.clientHeight * pxToPt) || 842;
				const newPage = pdfDoc.addPage([sheetW, sheetH]);
				const sheetRect = sheet.getBoundingClientRect();
				// Calculate scale factor in case the sheet is zoomed via CSS transform
				const domScale = (sheet.offsetWidth > 0) ? (sheetRect.width / sheet.offsetWidth) : 1;
				debug('Sheet: ' + sheetW + ' x ' + sheetH + ' pt');

				// Draw Content (Previews)
				const previews = sheet.querySelectorAll('.preview');
				debug('  Previews in sheet: ' + previews.length);
				for(let preview of previews){
					const currentPreviewIndex = globalPreviewIndex++;
					const pageNum = parseInt(preview.dataset.pageNum);
					if(!pageNum || pageNum < 1 || pageNum > srcDoc.getPageCount()) {
						continue;
					}

					const embeddedPage = await getEmbeddedPage(pageNum - 1);
					const preRect = preview.getBoundingClientRect();

					// Get transforms and layout overrides early to determine exact size
					const slotT = (window.__slotTransforms && window.__slotTransforms[currentPreviewIndex]) || {};
					const pageT = (window.__pageTransforms && window.__pageTransforms[pageNum]) || {};
					const layout = slotT.layout || pageT.layout || {};
					const stateW = (layout.width !== undefined) ? layout.width : (window.__slotW || 0);
					const stateH = (layout.height !== undefined) ? layout.height : (window.__slotH || 0);

					// Calculate position of the slot on the PDF page
					// PDF (0,0) is bottom-left. DOM (0,0) is top-left.
					const boxX = safe(((preRect.left - sheetRect.left) / domScale) * pxToPt);
					// Y is distance from bottom
					const boxY = safe(((sheetRect.height - (preRect.top - sheetRect.top + preRect.height)) / domScale) * pxToPt);
					// Use exact state dimensions if available to avoid DOM rounding errors, else fallback to DOM
					const boxW = (stateW > 0) ? safe(stateW * pxToPt) : safe((preRect.width / domScale) * pxToPt);
					const boxH = (stateH > 0) ? safe(stateH * pxToPt) : safe((preRect.height / domScale) * pxToPt);

					// Draw Frame Background (CMYK)
					if(window.__frameBgCMYK && window.__frameBgCMYK.length === 4 && (cmyk || rgb)){
						const [C, M, Y, K] = window.__frameBgCMYK;
						// Draw if not pure white (0,0,0,0)
						if(C > 0 || M > 0 || Y > 0 || K > 0){
							let colorObj;
							if(cmyk){
								colorObj = cmyk(C, M, Y, K);
							} else {
								const r = (1 - C) * (1 - K);
								const g = (1 - M) * (1 - K);
								const b = (1 - Y) * (1 - K);
								colorObj = rgb(r, g, b);
							}
							newPage.drawRectangle({
								x: boxX,
								y: boxY,
								width: boxW,
								height: boxH,
								color: colorObj
							});
						}
					}

					const scaleX = safe((typeof slotT.scaleX === 'number') ? slotT.scaleX : ((typeof pageT.scaleX === 'number') ? pageT.scaleX : (window.__currentScaleX || 1)));
					const scaleY = safe((typeof slotT.scaleY === 'number') ? slotT.scaleY : ((typeof pageT.scaleY === 'number') ? pageT.scaleY : (window.__currentScaleY || 1)));
					const rotation = safe((typeof slotT.rotation === 'number') ? slotT.rotation : ((typeof pageT.rotation === 'number') ? pageT.rotation : (window.__currentRotation || 0)));
					const skewX = safe((typeof slotT.skewX === 'number') ? slotT.skewX : ((typeof pageT.skewX === 'number') ? pageT.skewX : (window.__skewX || 0)));
					const skewY = safe((typeof slotT.skewY === 'number') ? slotT.skewY : ((typeof pageT.skewY === 'number') ? pageT.skewY : (window.__skewY || 0)));
					
					const rawOffsetX = (typeof slotT.offsetX === 'number') ? slotT.offsetX : ((typeof pageT.offsetX === 'number') ? pageT.offsetX : (window.__offsetX || 0));
					const rawOffsetY = (typeof slotT.offsetY === 'number') ? slotT.offsetY : ((typeof pageT.offsetY === 'number') ? pageT.offsetY : (window.__offsetY || 0));

					// Calculate expansion offset (to keep content centered in trim box)
					const l = (layout.expandL !== undefined) ? layout.expandL : (window.__expandL || 0);
					const r_exp = (layout.expandR !== undefined) ? layout.expandR : (window.__expandR || 0);
					const top = (layout.expandT !== undefined) ? layout.expandT : (window.__expandT || 0);
					const bot = (layout.expandB !== undefined) ? layout.expandB : (window.__expandB || 0);
					const expandOffsetX = (l - r_exp) / 2;
					const expandOffsetY = (top - bot) / 2;

					const offsetX = safe((rawOffsetX + expandOffsetX) * pxToPt);
					const offsetY = safe((rawOffsetY + expandOffsetY) * pxToPt);

					// Note: CSS Y offset is down (positive), PDF Y offset is up (positive).
					// We need to invert Y offset for PDF coordinate system relative to the box center?
					// Actually, let's stick to the visual logic: +Y in UI moves content DOWN.
					// In PDF, to move content DOWN, we decrease Y.
					const pdfOffsetY = -offsetY;

					// Center the page in the box, then apply transforms
					// Scale the embedded page
					const pageW = embeddedPage.getWidth ? embeddedPage.getWidth() : (embeddedPage.width || 612);
					const pageH = embeddedPage.getHeight ? embeddedPage.getHeight() : (embeddedPage.height || 792);
					const scaledW = safe(pageW * (scaleX || 1));
					const scaledH = safe(pageH * (scaleY || 1));

					// Center position
					const centerX = safe(boxX + boxW / 2);
					const centerY = safe(boxY + boxH / 2);

					// Calculate rotation and skew adjustment
					// pdf-lib transforms around the bottom-left corner (the draw coordinates).
					// To keep the content centered, we must shift the draw coordinates based on the transforms.
					const pdfRotRad = -(rotation || 0) * (Math.PI / 180);
					const pdfSkewXRad = -(skewX || 0) * (Math.PI / 180);
					const pdfSkewYRad = -(skewY || 0) * (Math.PI / 180);

					const halfW = scaledW / 2;
					const halfH = scaledH / 2;
					
					// 1. Apply Skew to the center vector
					// x' = x + y * tan(skewX)
					// y' = y + x * tan(skewY)
					const skewedX = halfW + halfH * Math.tan(pdfSkewXRad);
					const skewedY = halfH + halfW * Math.tan(pdfSkewYRad);

					// 2. Apply Rotation to the skewed vector
					const vecX = skewedX * Math.cos(pdfRotRad) - skewedY * Math.sin(pdfRotRad);
					const vecY = skewedX * Math.sin(pdfRotRad) + skewedY * Math.cos(pdfRotRad);

					const drawX = safe((centerX + offsetX) - vecX);
					const drawY = safe((centerY + pdfOffsetY) - vecY);
					const drawW = safe(scaledW);
					const drawH = safe(scaledH);

					// Validate numbers before calling PDF-lib to avoid runtime type errors
					const drawCoords = { x: drawX, y: drawY, width: drawW, height: drawH };
					Object.keys(drawCoords).forEach(k => { if(!isFinite(drawCoords[k])) drawCoords[k] = 0; });

					if (embeddedPage && typeof newPage.drawPage === 'function') {
						try {
							// Clip content to the slot
							if(pushGraphicsState && popGraphicsState && rectangle && clip && endPath){
								newPage.pushOperators(
									pushGraphicsState(),
									rectangle(boxX, boxY, boxW, boxH),
									clip(),
									endPath()
								);
							}

							newPage.drawPage(embeddedPage, {
								x: drawCoords.x,
								y: drawCoords.y,
								width: drawCoords.width,
								height: drawCoords.height,
								rotate: degrees(-(rotation || 0)),
								xSkew: degrees(-(skewY || 0)),
								ySkew: degrees(-(skewX || 0))
							});

							// Restore graphics state (remove clipping)
							if(pushGraphicsState && popGraphicsState){
								newPage.pushOperators(popGraphicsState());
							}
						} catch(errDraw) {
							debug('      ✗ Error drawing page: ' + errDraw.message);
							console.warn('Skipped drawing embedded page due to invalid coords', drawCoords, errDraw);
						}
					}

					// Draw Overlays (e.g. purple square)
					if(window.drawPdfOverlays) await window.drawPdfOverlays(newPage, boxX, boxY, boxW, boxH, window.PDFLib, pageNum, {x: l * pxToPt, y: top * pxToPt, r: r_exp * pxToPt});
				}

				// Draw Crop Marks
				// We can reuse the SVG lines from the DOM if they exist
				const svgLines = sheet.querySelectorAll('.sheet-crop-marks line');
				svgLines.forEach((line, idx) => {
					const lx1 = safe(parseFloat(line.getAttribute('x1')) * pxToPt);
					const ly1 = safe((sheet.clientHeight - parseFloat(line.getAttribute('y1'))) * pxToPt);
					const lx2 = safe(parseFloat(line.getAttribute('x2')) * pxToPt);
					const ly2 = safe((sheet.clientHeight - parseFloat(line.getAttribute('y2'))) * pxToPt);
					
					// Validate coords for drawLine
					const lineStart = { x: isFinite(lx1) ? lx1 : 0, y: isFinite(ly1) ? ly1 : 0 };
					const lineEnd = { x: isFinite(lx2) ? lx2 : 0, y: isFinite(ly2) ? ly2 : 0 };

					// Parse dash array if present
					const dashStr = line.getAttribute('stroke-dasharray');
					let dashArray = undefined;
					if(dashStr){
						dashArray = dashStr.split(/[\s,]+/).map(n => parseFloat(n) * pxToPt);
					}

					try {
							let cropColor;
							if(cmyk){
								cropColor = cmyk(0, 0, 0, 1);
							} else {
								cropColor = rgb(0, 0, 0);
							}
							newPage.drawLine({ start: lineStart, end: lineEnd, thickness: 1, color: cropColor, dashArray: dashArray });
					} catch(errLine) {
						debug('    ✗ Crop mark ' + idx + ' error: ' + errLine.message);
						console.warn('Skipped drawing crop mark line due to invalid coords', { lineStart, lineEnd }, errLine);
					}
				});

				// Draw Sheet Overlays (Color Bars)
				if(window.drawPdfSheetOverlays) await window.drawPdfSheetOverlays(newPage, pxToPt, window.PDFLib, i, sheetW);
			}

			// Save and Download
			await updateProgress('Saving PDF file...', 95);
			debug('Saving PDF...');
			const pdfBytes = await pdfDoc.save();
			debug('PDF saved: ' + (pdfBytes.length / 1024).toFixed(2) + ' KB');
			const blob = new Blob([pdfBytes], { type: 'application/pdf' });
			const link = document.createElement('a');
			link.href = URL.createObjectURL(blob);
			link.download = 'imposed-layout.pdf';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			debug('✓ PDF generation complete!');
			await updateProgress('Done!', 100);
			setTimeout(closeProgress, 1000);

		} catch(e) {
			closeProgress();
			debug('✗ FATAL ERROR: ' + e.message);
			debug('Stack: ' + (e.stack || 'N/A'));
			console.error('PDF Generation Error:', e);
			alert('Failed to generate PDF: ' + e.message);
		}
	};

	/* --- END: pdf-render.js --- */

    	/* --- FILE: pdf-render.js (Continued - Utilities) --- */
	// Compatibility alias for older code
	window.__renderPdfPages = window.renderPages;

	// Adjust placed PDF rasterization DPI and re-render
	window.adjustPlacedPdfDpi = function(dpi){
		let val = dpi;
		if(typeof val !== 'number') val = parseInt(val,10);
		if(!isFinite(val) || val < 1) return;
		window.__placedDpi = val;
		const dpiEl = document.getElementById('dpiInput');
		if(dpiEl) dpiEl.value = val;
		// re-render current page with existing rotation/scale
		window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0}, window.__currentPage);
	};

	// Render the draggable file list in the toolbox
	window.renderFileList = function(){
		const container = document.getElementById('fileInfo');
		if(!container || !window.__importedFiles || !window.__importedFiles.length) return;
		
		container.innerHTML = '';
		container.style.whiteSpace = 'normal'; // Reset pre-wrap for flex layout

		window.__importedFiles.forEach((file, index) => {
			const row = document.createElement('div');
			row.style.display = 'flex';
			row.style.alignItems = 'center';
			row.style.padding = '4px 2px';
			row.style.cursor = 'grab';
			row.style.borderBottom = '1px solid transparent';
			row.style.borderTop = '1px solid transparent';
			row.draggable = true;
			row.title = file.name;

			const idx = document.createElement('span');
			idx.textContent = 'f' + (index + 1);
			idx.style.marginRight = '6px';
			idx.style.color = '#888';
			idx.style.fontSize = '10px';
			idx.style.pointerEvents = 'none';

			const name = document.createElement('button');
			name.textContent = file.name;
			name.title = "Add f" + (index + 1) + ":1- to layout";
			name.style.whiteSpace = 'nowrap';
			name.style.overflow = 'hidden';
			name.style.textOverflow = 'ellipsis';
			name.style.fontSize = '11px';
			name.style.flex = '1';
			name.style.textAlign = 'left';
			name.style.background = 'transparent';
			name.style.border = 'none';
			name.style.color = '#ccc';
			name.style.cursor = 'pointer';
			name.style.padding = '0';
			
			name.onclick = (e) => {
				const input = document.getElementById('pageRangeInput');
				if(input){
					const val = 'f' + (index + 1) + ':1-';
					const current = input.value.trim();
					input.value = current ? (current + ' ' + val) : val;
					input.dispatchEvent(new Event('input'));
				}
			};
			name.onmouseover = () => name.style.color = '#fff';
			name.onmouseout = () => name.style.color = '#ccc';

			const countSpan = document.createElement('span');
			const count = (window.__filePageCounts && window.__filePageCounts[index]) || 0;
			countSpan.textContent = `(${count})`;
			countSpan.style.fontSize = '10px';
			countSpan.style.color = '#666';
			countSpan.style.marginLeft = '4px';
			countSpan.style.pointerEvents = 'none';

			row.appendChild(idx);
			row.appendChild(name);
			row.appendChild(countSpan);

			// Drag Events
			row.addEventListener('dragstart', (e) => {
				e.dataTransfer.setData('text/plain', index);
				e.dataTransfer.effectAllowed = 'move';
				row.style.opacity = '0.5';
			});

			row.addEventListener('dragend', () => {
				row.style.opacity = '1';
				Array.from(container.children).forEach(c => {
					c.style.borderTopColor = 'transparent';
					c.style.borderBottomColor = 'transparent';
				});
			});

			row.addEventListener('dragover', (e) => {
				e.preventDefault();
				e.dataTransfer.dropEffect = 'move';
				const rect = row.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;
				if(e.clientY < midY) {
					row.style.borderTopColor = '#00bcd4';
					row.style.borderBottomColor = 'transparent';
				} else {
					row.style.borderTopColor = 'transparent';
					row.style.borderBottomColor = '#00bcd4';
				}
			});

			row.addEventListener('drop', (e) => {
				e.preventDefault();
				const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
				if(isNaN(fromIndex)) return;
				
				const rect = row.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;
				let toIndex = index;
				if(e.clientY >= midY) toIndex++;

				if(fromIndex === toIndex || fromIndex === toIndex - 1 && toIndex > fromIndex) return; // No change

				// Adjust array
				const files = Array.from(window.__importedFiles);
				const [moved] = files.splice(fromIndex, 1);
				// If we removed an item before the target, the target index shifts down by 1
				if(fromIndex < toIndex) toIndex--;
				
				files.splice(toIndex, 0, moved);
				
				// Reload with new order
				window.openPdfFile(files);
			});

			container.appendChild(row);
		});
	};
