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

// wire UI elements

	// --- Cookie/Storage Consent ---
	const btnAcceptCookies = document.getElementById('btnAcceptCookies');
	const btnDeclineCookies = document.getElementById('btnDeclineCookies');
	const btnCookieInfo = document.getElementById('btnCookieInfo');
	const cookieInfoBalloon = document.getElementById('cookieInfoBalloon');
	const cookieContainer = document.getElementById('cookieConsentContainer');
	const consentKey = 'pdf_settings_consent';

	// Initialize consent state
	window.__saveSettingsEnabled = (localStorage.getItem(consentKey) === 'true');

	// Show if not accepted
	if(cookieContainer && localStorage.getItem(consentKey) !== 'true'){
		cookieContainer.style.display = 'flex';
	}

	if(btnAcceptCookies){
		btnAcceptCookies.addEventListener('click', () => {
			window.__saveSettingsEnabled = true;
			localStorage.setItem(consentKey, 'true');
			if(cookieContainer) cookieContainer.style.display = 'none';
		});
	}

	if(btnDeclineCookies){
		btnDeclineCookies.addEventListener('click', () => {
			window.__saveSettingsEnabled = false;
			localStorage.removeItem(consentKey);
			if(cookieContainer) cookieContainer.style.display = 'none';
		});
	}

	if(btnCookieInfo){
		btnCookieInfo.addEventListener('click', (e) => {
			e.stopPropagation();
			if(cookieInfoBalloon){
				cookieInfoBalloon.style.display = (cookieInfoBalloon.style.display === 'block') ? 'none' : 'block';
			}
		});
	}

	// --- Info Modal ---
	const btnAppInfo = document.getElementById('btnAppInfo');
	const infoModal = document.getElementById('infoModal');
	const closeInfoModal = document.getElementById('closeInfoModal');
	const tabReadmeBtn = document.getElementById('tabReadmeBtn');
	const tabLicenseBtn = document.getElementById('tabLicenseBtn');
	const tabThirdPartyBtn = document.getElementById('tabThirdPartyBtn');
	const readmeContent = document.getElementById('readmeContent');
	const licenseContent = document.getElementById('licenseContent');
	const thirdPartyContent = document.getElementById('thirdPartyContent');

	let appLicenseLoaded = false;
	const loadAppLicense = async () => {
		if (appLicenseLoaded || !licenseContent) return;
		appLicenseLoaded = true;
		try {
			const response = await fetch('gpl-3.0.txt');
			if (response.ok) {
				const text = await response.text();
				const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
				const div = document.createElement('div');
				div.innerHTML = `<br><hr><br><pre style="font-size:10px; line-height:1.3; white-space:pre-wrap; font-family:monospace">${escapedText}</pre>`;
				licenseContent.appendChild(div);
			}
		} catch (e) { console.warn(e); }
	};

	let licensesLoaded = false;
	const loadThirdPartyLicenses = async () => {
		if (licensesLoaded || !thirdPartyContent) return;
		licensesLoaded = true; // Set early to prevent re-fetching

		const licenses = [
			{ name: 'pdf-lib (MIT License)', path: 'libs/pdf-lib.LICENSE.md', url: 'https://github.com/Hopding/pdf-lib/blob/master/LICENSE.md' },
			{ name: 'pdf.js (Apache License 2.0)', path: 'libs/pdf.js.LICENSE', url: 'https://github.com/mozilla/pdf.js/blob/master/LICENSE' },
			{ name: 'Material Design Icons (Apache License 2.0)', path: 'fonts/LICENSE-Material.txt', url: 'https://github.com/google/material-design-icons/blob/master/LICENSE' }
		];

		let content = '';
		for (const license of licenses) {
			try {
				const response = await fetch(license.path);
				if (response.ok) {
					const text = await response.text();
					// Escape HTML to prevent rendering issues inside <pre>
					const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
					content += `<h3><a href="${license.url}" target="_blank" style="color:#00bcd4; text-decoration:none">${license.name} <span class="material-icons" style="font-size:12px; vertical-align:middle">open_in_new</span></a></h3><hr><pre style="font-size:10px; line-height:1.3">${escapedText}</pre><br><br>`;
				} else {
					content += `<h3><a href="${license.url}" target="_blank" style="color:#00bcd4; text-decoration:none">${license.name}</a></h3><p>Could not load license.</p><br><br>`;
				}
			} catch (e) {
				content += `<h3><a href="${license.url}" target="_blank" style="color:#00bcd4; text-decoration:none">${license.name}</a></h3><p>Error loading license: ${e.message}</p><br><br>`;
			}
		}
		thirdPartyContent.innerHTML = content;
	};

	if(btnAppInfo && infoModal){
		btnAppInfo.addEventListener('click', () => {
			infoModal.style.display = 'flex';
			loadThirdPartyLicenses();
			loadAppLicense();
		});
	}
	if(closeInfoModal && infoModal){
		closeInfoModal.addEventListener('click', () => { infoModal.style.display = 'none'; });
	}
	if(infoModal){
		infoModal.addEventListener('click', (e) => { if(e.target === infoModal) infoModal.style.display = 'none'; });
	}
	if(tabReadmeBtn && tabLicenseBtn && tabThirdPartyBtn && readmeContent && licenseContent && thirdPartyContent){
		const tabs = [tabReadmeBtn, tabLicenseBtn, tabThirdPartyBtn];
		const contents = [readmeContent, licenseContent, thirdPartyContent];

		const switchTab = (activeTab, activeContent) => {
			tabs.forEach(t => t.style.borderBottomColor = (t === activeTab) ? '#00bcd4' : 'transparent');
			contents.forEach(c => c.style.display = (c === activeContent) ? 'block' : 'none');
		};

		tabReadmeBtn.addEventListener('click', () => switchTab(tabReadmeBtn, readmeContent));
		tabLicenseBtn.addEventListener('click', () => switchTab(tabLicenseBtn, licenseContent));
		tabThirdPartyBtn.addEventListener('click', () => switchTab(tabThirdPartyBtn, thirdPartyContent));
	}

	// Proxy localStorage.setItem to respect consent
	const _originalSetItem = localStorage.setItem;
	localStorage.setItem = function(key, value){
		if(key === consentKey || window.__saveSettingsEnabled){
			_originalSetItem.call(localStorage, key, value);
		}
	};

	// wire UI: file input
	if(input){
		input.addEventListener('change', (ev)=>{
			if(ev.target.files && ev.target.files.length > 0){
				if(window.openPdfFile) window.openPdfFile(ev.target.files);
			}
		});
	}

	// --- Layout Management ---
	const layoutSelect = document.getElementById('layoutSelect');
	const saveLayoutBtn = document.getElementById('saveLayoutBtn');
	const deleteLayoutBtn = document.getElementById('deleteLayoutBtn');

	const layoutFieldIds = [
		'rowsInput', 'colsInput', 'markGapXInput', 'markGapYInput',
		'cropBleedXInput', 'cropBleedYInput', 'innerCropBleedXInput', 'innerCropBleedYInput',
		'innerCropStyleSelect', 'boxXInput', 'boxYInput', 'paperSelect', 'pageRangeInput',
		'autoGridCheck', 'showCropMarksCheck', 'gridDuplexCheck',
		'slotWidthInput', 'slotHeightInput', 'slotScalePercentInput', 'slotProportionalCheckbox', 'linkSlotScaleCheckbox', 'expandLeftInput', 'expandRightInput', 'expandTopInput', 'expandBottomInput',
		'sheetWidthInput', 'sheetHeightInput',
		'rotationInput', 'scaleSlider', 'skewXInput', 'skewYInput', 'offsetXInput', 'offsetYInput',
		'fitImageBtn', 'fillImageBtn', 'stretchImageBtn', 'mergeSourceSelect', 'mergePageNumInput'
	];

	const defaultLayout = {
		rows: 1, cols: 2,
		gapX: 1, gapY: 1,
		bleedX: 2, bleedY: 2,
		innerBleedX: 2, innerBleedY: 2,
		innerMarkStyle: 'solid',
		boxX: 0, boxY: 0,
		paper: '320,450',
		range: '1-',
		fitToPage: true,
		slotProportional: true
	};

	const getLayoutSettings = (options = { grid:true, sheet:true, placement:true, range:true, transform:true, data:true }) => {
		const s = {};
		
		if(options.grid){
			s.rows = document.getElementById('rowsInput')?.value || 1;
			s.cols = document.getElementById('colsInput')?.value || 1;
			s.autoGrid = document.getElementById('autoGridCheck')?.checked;
			s.gapX = document.getElementById('markGapXInput')?.value || 0;
			s.gapY = document.getElementById('markGapYInput')?.value || 0;
			s.bleedX = document.getElementById('cropBleedXInput')?.value || 0;
			s.bleedY = document.getElementById('cropBleedYInput')?.value || 0;
			s.innerBleedX = document.getElementById('innerCropBleedXInput')?.value || 0;
			s.innerBleedY = document.getElementById('innerCropBleedYInput')?.value || 0;
			s.innerMarkStyle = document.getElementById('innerCropStyleSelect')?.value || 'solid';
			s.showCropMarks = document.getElementById('showCropMarksCheck')?.checked;
		}

		if(options.sheet){
			s.paper = document.getElementById('paperSelect')?.value || '320,450';
			s.sheetW = document.getElementById('sheetWidthInput')?.value;
			s.sheetH = document.getElementById('sheetHeightInput')?.value;
		}

		if(options.placement){
			s.boxX = document.getElementById('boxXInput')?.value || 0;
			s.boxY = document.getElementById('boxYInput')?.value || 0;
			s.duplexMirror = document.getElementById('gridDuplexCheck')?.checked;
			s.slotW = document.getElementById('slotWidthInput')?.value || '';
			s.slotH = document.getElementById('slotHeightInput')?.value || '';
			s.expandL = document.getElementById('expandLeftInput')?.value || 0;
			s.expandR = document.getElementById('expandRightInput')?.value || 0;
			s.expandT = document.getElementById('expandTopInput')?.value || 0;
			s.expandB = document.getElementById('expandBottomInput')?.value || 0;
			s.fitToPage = document.getElementById('linkSlotScaleCheckbox')?.checked;
			s.slotProportional = document.getElementById('slotProportionalCheckbox')?.checked;
		}

		if(options.range){
			s.range = document.getElementById('pageRangeInput')?.value || '';
		}
		
		if(options.transform){
			s.rotation = window.__currentRotation || 0;
			s.scaleX = window.__currentScaleX || 1;
			s.scaleY = window.__currentScaleY || 1;
			s.skewX = window.__skewX || 0;
			s.skewY = window.__skewY || 0;
			s.offsetX = window.__offsetX || 0;
			s.offsetY = window.__offsetY || 0;
			s.fitMode = window.__preferUpscaleNotRotate ? 'fit' : (window.__fillImage ? 'fill' : (window.__stretchImage ? 'stretch' : null));
		}

		if(options.data){
			s.overlays = window.__overlays || [];
			s.mergeConfig = window.__mergeConfig || {};
			s.mergeSourceMode = document.getElementById('mergeSourceSelect')?.value || 'all';
			s.mergeSourcePage = parseInt(document.getElementById('mergePageNumInput')?.value) || 1;
		}

		return s;
	};

	const flashLayoutFields = () => {
		layoutFieldIds.forEach(id => {
			const el = document.getElementById(id);
			if(el) {
				el.classList.add('layout-field-highlight');
				setTimeout(() => el.classList.remove('layout-field-highlight'), 400);
			}
		});
	};

	const applyLayoutSettings = (settings) => {
		if(!settings) return;
		const setVal = (id, val) => {
			const el = document.getElementById(id);
			if(el && val !== undefined) {
				el.value = val;
				el.dispatchEvent(new Event('input'));
				el.dispatchEvent(new Event('change'));
			}
		};
		const setCheck = (id, val) => {
			const el = document.getElementById(id);
			if(el && val !== undefined) {
				el.checked = val;
				el.dispatchEvent(new Event('change'));
			}
		};
		
		if(settings.paper){
			const paperEl = document.getElementById('paperSelect');
			if(paperEl){
				paperEl.value = settings.paper;
				paperEl.dispatchEvent(new Event('change'));
			}
		}
		if(settings.sheetW) setVal('sheetWidthInput', settings.sheetW);
		if(settings.sheetH) setVal('sheetHeightInput', settings.sheetH);

		setVal('rowsInput', settings.rows);
		setVal('colsInput', settings.cols);
		setCheck('autoGridCheck', settings.autoGrid);
		setVal('markGapXInput', settings.gapX);
		setVal('markGapYInput', settings.gapY);
		setVal('cropBleedXInput', settings.bleedX);
		setVal('cropBleedYInput', settings.bleedY);
		setVal('innerCropBleedXInput', settings.innerBleedX);
		setVal('innerCropBleedYInput', settings.innerBleedY);
		setVal('innerCropStyleSelect', settings.innerMarkStyle);
		setCheck('showCropMarksCheck', settings.showCropMarks);

		setVal('boxXInput', settings.boxX);
		setVal('boxYInput', settings.boxY);
		setCheck('gridDuplexCheck', settings.duplexMirror);
		
		setVal('slotWidthInput', settings.slotW);
		setVal('slotHeightInput', settings.slotH);
		setVal('expandLeftInput', settings.expandL);
		setVal('expandRightInput', settings.expandR);
		setVal('expandTopInput', settings.expandT);
		setVal('expandBottomInput', settings.expandB);
		if(settings.fitToPage !== undefined) setCheck('linkSlotScaleCheckbox', settings.fitToPage);
		if(settings.slotProportional !== undefined) setCheck('slotProportionalCheckbox', settings.slotProportional);

		setVal('pageRangeInput', settings.range);

		// Transform
		if(settings.rotation !== undefined) setVal('rotationInput', settings.rotation);
		if(settings.scaleX !== undefined) setVal('scaleSlider', Math.round(settings.scaleX * 100));
		// Handle non-uniform scale if needed (slider only does uniform)
		if(settings.scaleX !== undefined && settings.scaleY !== undefined && settings.scaleX !== settings.scaleY){
			window.adjustContentScale(settings.scaleX, settings.scaleY);
		}
		if(settings.skewX !== undefined) setVal('skewXInput', settings.skewX);
		if(settings.skewY !== undefined) setVal('skewYInput', settings.skewY);
		
		const pxPerMm = 96 / 25.4;
		if(settings.offsetX !== undefined) setVal('offsetXInput', (settings.offsetX / pxPerMm).toFixed(2));
		if(settings.offsetY !== undefined) setVal('offsetYInput', (settings.offsetY / pxPerMm).toFixed(2));

		if(settings.fitMode === 'fit') document.getElementById('fitImageBtn')?.click();
		else if(settings.fitMode === 'fill') document.getElementById('fillImageBtn')?.click();
		else if(settings.fitMode === 'stretch') document.getElementById('stretchImageBtn')?.click();

		// Data
		if(settings.overlays){
			window.__overlays = JSON.parse(JSON.stringify(settings.overlays));
			if(window.renderOverlayInputs) window.renderOverlayInputs();
		}
		if(settings.mergeConfig){
			window.__mergeConfig = JSON.parse(JSON.stringify(settings.mergeConfig));
			if(window.renderDataMergeCards) window.renderDataMergeCards();
		}
		if(settings.mergeSourceMode) setVal('mergeSourceSelect', settings.mergeSourceMode);
		if(settings.mergeSourcePage) setVal('mergePageNumInput', settings.mergeSourcePage);

		flashLayoutFields();
	};

	const loadLayouts = () => {
		if(!layoutSelect) return;
		const layouts = JSON.parse(localStorage.getItem('pdf_layouts') || '{}');
		if(!layouts['Default']) {
			layouts['Default'] = defaultLayout;
			localStorage.setItem('pdf_layouts', JSON.stringify(layouts));
		}
		
		layoutSelect.innerHTML = '';
		Object.keys(layouts).forEach(name => {
			const opt = document.createElement('option');
			opt.value = name;
			opt.textContent = name;
			layoutSelect.appendChild(opt);
		});
		
		const last = localStorage.getItem('pdf_last_layout');
		if(last && layouts[last]) layoutSelect.value = last;
		else layoutSelect.value = 'Default';
	};

	window.applyCurrentLayout = () => {
		if(!layoutSelect) return;
		const name = layoutSelect.value;
		const layouts = JSON.parse(localStorage.getItem('pdf_layouts') || '{}');
		const autoGridCheck = document.getElementById('autoGridCheck');
		
		if(name === 'Default'){
			if(autoGridCheck) autoGridCheck.checked = true;
			applyLayoutSettings(defaultLayout);
			if(window.updateSheetSize) window.updateSheetSize(); // Triggers auto-calc
		} else if(layouts[name]) {
			if(autoGridCheck) autoGridCheck.checked = false;
			applyLayoutSettings(layouts[name]);
		}
		localStorage.setItem('pdf_last_layout', name);
	};

	if(layoutSelect){
		layoutSelect.addEventListener('change', window.applyCurrentLayout);
		loadLayouts();
		window.applyCurrentLayout();
	}

	if(saveLayoutBtn){
		saveLayoutBtn.addEventListener('click', () => {
			// Create Dialog
			const dialog = document.createElement('div');
			Object.assign(dialog.style, {
				position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
				backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '3000', display: 'flex',
				alignItems: 'center', justifyContent: 'center'
			});

			const content = document.createElement('div');
			Object.assign(content.style, {
				backgroundColor: '#222', padding: '20px', borderRadius: '8px',
				border: '1px solid #444', width: '300px', color: '#eee',
				boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
			});

			content.innerHTML = `
				<h3 style="margin-top:0; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px">Save Layout</h3>
				<div style="margin-bottom:15px">
					<label style="display:block; font-size:11px; color:#aaa; margin-bottom:4px">Layout Name</label>
					<input type="text" id="saveLayoutName" class="toolbox-input" style="width:100%" placeholder="My Layout">
				</div>
				<div style="margin-bottom:10px; font-size:12px">
					<div style="margin-bottom:5px; font-weight:bold; color:#ccc">Include:</div>
					<label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer">
						<input type="checkbox" id="saveGrid" checked> Grid & Marks
					</label>
					<label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer">
						<input type="checkbox" id="saveSheet" checked> Sheet Format
					</label>
					<label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer">
						<input type="checkbox" id="savePlacement" checked> Content Placement
					</label>
					<label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer">
						<input type="checkbox" id="saveRange" checked> Page Range
					</label>
					<label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer">
						<input type="checkbox" id="saveTransform" checked> Transformations
					</label>
					<label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer">
						<input type="checkbox" id="saveData" checked> Data & Overlays
					</label>
				</div>
				<div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px">
					<button id="cancelSaveLayout" class="toolbox-btn" style="width:auto; padding:6px 12px">Cancel</button>
					<button id="confirmSaveLayout" class="toolbox-btn" style="width:auto; padding:6px 12px; background-color:#00bcd4; color:#000; font-weight:bold">Save</button>
				</div>
			`;

			dialog.appendChild(content);
			document.body.appendChild(dialog);

			const nameInput = document.getElementById('saveLayoutName');
			nameInput.focus();

			document.getElementById('cancelSaveLayout').onclick = () => document.body.removeChild(dialog);

			document.getElementById('confirmSaveLayout').onclick = () => {
				const name = nameInput.value.trim();
				if(!name) { alert('Please enter a layout name.'); return; }

				const options = {
					grid: document.getElementById('saveGrid').checked,
					sheet: document.getElementById('saveSheet').checked,
					placement: document.getElementById('savePlacement').checked,
					range: document.getElementById('saveRange').checked,
					transform: document.getElementById('saveTransform').checked,
					data: document.getElementById('saveData').checked
				};

				const layouts = JSON.parse(localStorage.getItem('pdf_layouts') || '{}');
				layouts[name] = getLayoutSettings(options);
				localStorage.setItem('pdf_layouts', JSON.stringify(layouts));
				loadLayouts();
				layoutSelect.value = name;
				localStorage.setItem('pdf_last_layout', name);
				
				document.body.removeChild(dialog);
			};
		});
	}

	if(deleteLayoutBtn){
		deleteLayoutBtn.addEventListener('click', () => {
			const name = layoutSelect.value;
			if(name === 'Default') { alert('Cannot delete Default layout.'); return; }
			if(confirm(`Delete layout "${name}"?`)){
				const layouts = JSON.parse(localStorage.getItem('pdf_layouts') || '{}');
				delete layouts[name];
				localStorage.setItem('pdf_layouts', JSON.stringify(layouts));
				loadLayouts();
				window.applyCurrentLayout();
			}
		});
	}

	// Highlight fields included in layout when interacting with layout controls
	const toggleLayoutHighlight = (active) => {
		layoutFieldIds.forEach(id => {
			const el = document.getElementById(id);
			if(el) el.classList.toggle('layout-field-highlight', active);
		});
	};
	[layoutSelect, saveLayoutBtn].forEach(el => {
		if(el){
			el.addEventListener('mouseenter', () => toggleLayoutHighlight(true));
			el.addEventListener('mouseleave', () => toggleLayoutHighlight(false));
			el.addEventListener('focus', () => toggleLayoutHighlight(true));
			el.addEventListener('blur', () => toggleLayoutHighlight(false));
		}
	});

	const handleStep = (e) => { if(e.target) e.target.step = e.shiftKey ? '0.1' : '1'; };

	// Helper: Parse page range string (e.g. "1, 3-5") into array of numbers
	const parsePageRange = (str) => {
		if(!str) return [];
		const pages = new Set();
		const parts = str.replace(/[()]/g, ' ').split(/[\s,]+/);
		for(let p of parts){
			if(p.includes('-')){
				const [start, end] = p.split('-').map(n => parseInt(n, 10));
				if(!isNaN(start) && !isNaN(end)){
					const low = Math.min(start, end);
					const high = Math.max(start, end);
					for(let i=low; i<=high; i++) pages.add(i);
				}
			} else {
				const n = parseInt(p, 10);
				if(!isNaN(n)) pages.add(n);
			}
		}
		return Array.from(pages);
	};

	// Helper: Sync UI inputs with current state (Global vs Specific Page)
	const syncUI = () => {
		// Rotation
		if(rotationInput){
			const isSpecific = rotPageCheck && rotPageCheck.checked;
			const pages = isSpecific ? parsePageRange(rotPageNum.value) : [];
			const page = pages.length > 0 ? pages[0] : null;
			const t = (page && window.__pageTransforms[page]) || {};
			// If specific override exists, show it. Otherwise show global.
			const val = (typeof t.rotation === 'number') ? t.rotation : (window.__currentRotation || 0);
			rotationInput.value = val;
			if(rotationSlider) rotationSlider.value = (val > 180) ? (val - 360) : val;
		}

		// Scale
		if(scaleSlider){
			const isSpecific = scalePageCheck && scalePageCheck.checked;
			const pages = isSpecific ? parsePageRange(scalePageNum.value) : [];
			const page = pages.length > 0 ? pages[0] : null;
			const t = (page && window.__pageTransforms[page]) || {};
			// Use X scale as representative for the slider
			const sX = (typeof t.scaleX === 'number') ? t.scaleX : (window.__currentScaleX || 1);
			const sY = (typeof t.scaleY === 'number') ? t.scaleY : (window.__currentScaleY || 1);
			scaleSlider.value = Math.round(sX * 100);
			if(scaleValue) scaleValue.textContent = Math.round(sX * 100) + '%';

			if(window.__fileWidthMm && window.__fileHeightMm){
				if(wIn) wIn.value = (window.__fileWidthMm * sX).toFixed(2);
				if(hIn) hIn.value = (window.__fileHeightMm * sY).toFixed(2);
			}
		}

		// Skew
		if(skewXInput && skewYInput){
			const isSpecific = skewPageCheck && skewPageCheck.checked;
			const pages = isSpecific ? parsePageRange(skewPageNum.value) : [];
			const page = pages.length > 0 ? pages[0] : null;
			const t = (page && window.__pageTransforms[page]) || {};
			
			const valX = (typeof t.skewX === 'number') ? t.skewX : (window.__skewX || 0);
			const valY = (typeof t.skewY === 'number') ? t.skewY : (window.__skewY || 0);
			
			skewXInput.value = valX;
			skewYInput.value = valY;
			if(skewXSlider) skewXSlider.value = valX;
			if(skewYSlider) skewYSlider.value = valY;
		}

		// Offset
		if(offsetXInput && offsetYInput){
			const isSpecific = offsetPageCheck && offsetPageCheck.checked;
			const pxPerMm = 96 / 25.4;
			const pages = isSpecific ? parsePageRange(offsetPageNum.value) : [];
			const page = pages.length > 0 ? pages[0] : null;
			const t = (page && window.__pageTransforms[page]) || {};
			
			const valX = (typeof t.offsetX === 'number') ? t.offsetX : (window.__offsetX || 0);
			const valY = (typeof t.offsetY === 'number') ? t.offsetY : (window.__offsetY || 0);
			
			offsetXInput.value = (valX / pxPerMm).toFixed(2);
			offsetYInput.value = (valY / pxPerMm).toFixed(2);
			if(offsetXSlider) offsetXSlider.value = (valX / pxPerMm).toFixed(2);
			if(offsetYSlider) offsetYSlider.value = (valY / pxPerMm).toFixed(2);
		}

		// Slot
		if(slotXInput && slotYInput){
			const isSpecific = slotPageCheck && slotPageCheck.checked;
			const pages = isSpecific ? parsePageRange(slotPageNum.value) : [];
			const page = pages.length > 0 ? pages[0] : null;
			const t = (page && window.__pageTransforms[page]) || {};

			const valX = (typeof t.slotX === 'number') ? t.slotX : (window.__slotX || 0);
			const valY = (typeof t.slotY === 'number') ? t.slotY : (window.__slotY || 0);

			slotXInput.value = valX;
			slotYInput.value = valY;
		}
	};

	// wire UI: page range input
	if(pageRangeInput){
		const suggestionContainer = document.createElement('div');
		suggestionContainer.id = 'nupSuggestions';
		suggestionContainer.style.marginTop = '4px';
		suggestionContainer.style.display = 'flex';
		suggestionContainer.style.flexWrap = 'wrap';
		suggestionContainer.style.gap = '4px';
		pageRangeInput.parentNode.insertBefore(suggestionContainer, pageRangeInput.nextSibling);

		const calculateSignatureVariations = (totalPages, maxSigSize) => {
			if (totalPages <= 0 || maxSigSize < 4) return [];
			const variations = [];

			const formatGroups = (groups) => {
				const merged = [];
				if(groups.length > 0){
					let current = { ...groups[0] };
					for(let i=1; i<groups.length; i++){
						const g = groups[i];
						if(g.size === current.size && g.start === current.end + 1){
							current.end = g.end;
						} else {
							merged.push(current);
							current = { ...g };
						}
					}
					merged.push(current);
				}
				return merged.map(g => `${g.size}-up(${g.start}-${g.end})`).join(' ');
			};

			const addVariation = (label, groups, type) => {
				const value = formatGroups(groups);
				if (!variations.some(v => v.value === value)) {
					variations.push({ label, value, type });
				}
			};

			// 1. Standard Layout (Greedy)
			const stdNumFull = Math.floor(totalPages / maxSigSize);
			const stdRemainder = totalPages % maxSigSize;
			const stdLastSize = Math.ceil(stdRemainder / 4) * 4;
			
			const stdGroups = [];
			let currentPage = 1;
			for(let i=0; i<stdNumFull; i++){
				stdGroups.push({ size: maxSigSize, start: currentPage, end: currentPage + maxSigSize - 1 });
				currentPage += maxSigSize;
			}
			if (stdLastSize > 0) {
				stdGroups.push({ size: stdLastSize, start: currentPage, end: currentPage + stdLastSize - 1 });
			}
			
			let stdLabelParts = [];
			if (stdNumFull > 0) stdLabelParts.push(`${stdNumFull}x${maxSigSize}-up`);
			if (stdLastSize > 0) stdLabelParts.push(`1x${stdLastSize}-up`);
			
			if(stdLabelParts.length > 0) {
				addVariation(stdLabelParts.join(' + '), stdGroups, 'Standard');
			}

			// 2. Balanced Layout
			const numSigs = Math.ceil(totalPages / maxSigSize);
			if (numSigs > 1) {
				const baseSize = Math.floor(totalPages / numSigs / 4) * 4;
				if (baseSize > 0) {
					const remainder = totalPages - (baseSize * numSigs);
					const numBig = Math.ceil(remainder / 4);
					const numSmall = numSigs - numBig;
					const bigSize = baseSize + 4;
					const smallSize = baseSize;
					
					if (bigSize <= maxSigSize && numSmall > 0) {
						const groups = [];
						let cp = 1;
						for(let i=0; i<numBig; i++){
							groups.push({ size: bigSize, start: cp, end: cp + bigSize - 1 });
							cp += bigSize;
						}
						for(let i=0; i<numSmall; i++){
							groups.push({ size: smallSize, start: cp, end: cp + smallSize - 1 });
							cp += smallSize;
						}
						const label = `${numBig}x${bigSize}-up + ${numSmall}x${smallSize}-up`;
						addVariation(label, groups, 'Balanced');
					}
				}
			}

			// 3. Uniform Layout (Full signatures with blanks)
			if (numSigs > 0) {
				const uniformGroups = [];
				let cp = 1;
				for(let i=0; i<numSigs; i++){
					uniformGroups.push({ size: maxSigSize, start: cp, end: cp + maxSigSize - 1 });
					cp += maxSigSize;
				}
				addVariation(`${numSigs}x${maxSigSize}-up`, uniformGroups, 'Uniform');
			}

			return variations;
		};

		const updateSuggestions = () => {
			suggestionContainer.innerHTML = '';
			const val = pageRangeInput.value.trim();
			
			let n = 0;
			const shorthandMatch = val.match(/^(\d+)-?up$/i);
			if (shorthandMatch) {
				n = parseInt(shorthandMatch[1], 10);
			} else {
				const matches = [...val.matchAll(/(\d+)-?up/gi)];
				if (matches.length > 0) {
					n = Math.max(...matches.map(m => parseInt(m[1], 10)));
				}
			}

			const r = parseInt(rowsInput.value) || 1;
			const c = parseInt(colsInput.value) || 1;
			const isGridActive = r > 1 || c > 1;

			if ((n > 0 || isGridActive) && window.__pdfDoc) {
				const totalPages = window.__pdfDoc.numPages;
				const vars = n > 0 ? calculateSignatureVariations(totalPages, n) : [];
				
				const infoDiv = document.createElement('div');
				infoDiv.style.width = '100%';
				infoDiv.style.fontSize = '11px';
				infoDiv.style.marginBottom = '4px';
				infoDiv.style.color = '#ccc';
				
				let activeVar = null;
				if (n > 0) {
					if (shorthandMatch) {
						activeVar = vars.find(v => v.type === 'Standard');
					} else {
						const normVal = val.replace(/\s+/g, ' ').trim();
						activeVar = vars.find(v => v.value === normVal);
					}

					if (activeVar) {
						infoDiv.innerHTML = `Active: <strong style="color:#00bcd4">${activeVar.type}</strong> (${activeVar.label})`;
					} else {
						infoDiv.textContent = `Detected ${n}-up layout. Variations:`;
					}
				} else {
					infoDiv.textContent = `Grid Layout: ${r}×${c}`;
				}
				suggestionContainer.appendChild(infoDiv);

				const resetBtn = document.createElement('button');
				resetBtn.textContent = 'Reset';
				resetBtn.className = 'toolbox-btn';
				resetBtn.style.width = 'auto';
				resetBtn.style.fontSize = '10px';
				resetBtn.style.padding = '2px 6px';
				resetBtn.style.backgroundColor = '#d32f2f';
				resetBtn.style.marginRight = '4px';
				resetBtn.title = "Reset to default layout";
				resetBtn.onclick = (e) => {
					e.preventDefault();
					const ls = document.getElementById('layoutSelect');
					if(ls){
						ls.value = 'Default';
						if(window.applyCurrentLayout) window.applyCurrentLayout();
					} else {
						// Fallback if layout system missing
						pageRangeInput.value = '1-';
						if(rowsInput) rowsInput.value = 1;
						if(colsInput) colsInput.value = 1;
						pageRangeInput.dispatchEvent(new Event('input'));
					}
				};
				suggestionContainer.appendChild(resetBtn);

				vars.forEach(v => {
					const btn = document.createElement('button');
					btn.textContent = `${v.type}: ${v.label}`;
					btn.className = 'toolbox-btn';
					btn.style.width = 'auto';
					btn.style.fontSize = '10px';
					btn.style.padding = '2px 6px';
					btn.title = v.value;
					
					if (activeVar && activeVar.value === v.value) {
						btn.style.borderColor = '#00bcd4';
						btn.style.color = '#00bcd4';
						btn.style.opacity = '0.7';
					}

					btn.onclick = (e) => {
						e.preventDefault();
						pageRangeInput.value = v.value;
						pageRangeInput.dispatchEvent(new Event('input'));
					};
					suggestionContainer.appendChild(btn);
				});
			}
		};

		pageRangeInput.addEventListener('input', ()=>{
			updateSuggestions();
			// Update grid (add/remove sheets) based on new page count
			const r = parseInt(rowsInput.value) || 1;
			const c = parseInt(colsInput.value) || 1;
			if(window.generatePreviewGrid) window.generatePreviewGrid(r, c);
			// Re-render content based on the new page range
			if(window.renderPages) window.renderPages(window.__currentRotation || 0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
			if(window.fitSheetsToWorkspace) window.fitSheetsToWorkspace();
		});
	}

	// wire UI: Imposition Toolbar Buttons
	const setRange = (val) => {
		if(pageRangeInput){
			pageRangeInput.value = val;
			pageRangeInput.dispatchEvent(new Event('input'));
		}
	};
	const appendRange = (val) => {
		if(pageRangeInput){
			const current = pageRangeInput.value.trim();
			pageRangeInput.value = current ? (current + ' ' + val) : val;
			pageRangeInput.dispatchEvent(new Event('input'));
		}
	};
	const updateRange = (e, val, alwaysAppend = false) => {
		if(alwaysAppend || e.shiftKey){
			appendRange(val);
		} else {
			setRange(val);
		}
	};

	const impNormalBtn = document.getElementById('impNormalBtn');
	const imp2sidedBtn = document.getElementById('imp2sidedBtn');
	const impRepeatBtn = document.getElementById('impRepeatBtn');
	const impFillBtn = document.getElementById('impFillBtn');
	const impReverseBtn = document.getElementById('impReverseBtn');
	const impBookletBtn = document.getElementById('impBookletBtn');
	const impRLBtn = document.getElementById('impRLBtn');
	const impSnakeBtn = document.getElementById('impSnakeBtn');
	const impEvenBtn = document.getElementById('impEvenBtn');
	const impOddBtn = document.getElementById('impOddBtn');
	const impBottomBtn = document.getElementById('impBottomBtn');
	const impStackBtn = document.getElementById('impStackBtn');
	const impBlankBtn = document.getElementById('impBlankBtn');

	if(impNormalBtn) impNormalBtn.addEventListener('click', (e) => updateRange(e, '1-'));
	if(imp2sidedBtn) imp2sidedBtn.addEventListener('click', (e) => updateRange(e, 'f1-:p1-:2sided'));
	if(impRepeatBtn) impRepeatBtn.addEventListener('click', (e) => updateRange(e, 'f1-:p1-:repeat'));
	if(impFillBtn) impFillBtn.addEventListener('click', (e) => updateRange(e, 'fill', true));
	if(impReverseBtn) impReverseBtn.addEventListener('click', (e) => updateRange(e, 'last-1'));
	if(impBookletBtn) impBookletBtn.addEventListener('click', (e) => updateRange(e, 'booklet'));
	if(impRLBtn) impRLBtn.addEventListener('click', (e) => updateRange(e, '-(1-)'));
	if(impSnakeBtn) impSnakeBtn.addEventListener('click', (e) => updateRange(e, 'snake(1-)'));
	if(impEvenBtn) impEvenBtn.addEventListener('click', (e) => updateRange(e, 'even(1-)'));
	if(impOddBtn) impOddBtn.addEventListener('click', (e) => updateRange(e, 'odd(1-)'));
	if(impBottomBtn) impBottomBtn.addEventListener('click', (e) => updateRange(e, 'b(1-)'));
	if(impStackBtn) impStackBtn.addEventListener('click', () => {
		const dialog = document.createElement('div');
		Object.assign(dialog.style, {
			position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
			backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '3000', display: 'flex',
			alignItems: 'center', justifyContent: 'center'
		});

		const content = document.createElement('div');
		Object.assign(content.style, {
			backgroundColor: '#222', padding: '20px', borderRadius: '8px',
			border: '1px solid #444', width: '300px', color: '#eee',
			boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
		});

		const totalPages = window.__pdfDoc ? window.__pdfDoc.numPages : 0;
		const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
		const cols = parseInt(document.getElementById('colsInput')?.value || 1);
		const fileCounts = window.__filePageCounts || [];
		const isMultiFile = fileCounts.length > 1;

		content.innerHTML = `
			<h3 style="margin-top:0; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px">Cut & Stack</h3>
			<div style="margin-bottom:10px">
				<label style="display:block; font-size:11px; color:#aaa; margin-bottom:4px">Total Pages</label>
				<input type="number" id="stackTotalPages" class="toolbox-input" style="width:100%" value="${totalPages}">
			</div>
			<div style="margin-bottom:10px">
				<label style="display:block; font-size:11px; color:#aaa; margin-bottom:4px">Block Size (Pages per Stack)</label>
				<input type="number" id="stackBlockSize" class="toolbox-input" style="width:100%" placeholder="Auto (All)">
			</div>
			${isMultiFile ? `<div style="margin-bottom:10px"><label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px"><input type="checkbox" id="stackPerFile" checked> Stack each file separately</label></div>` : ''}
			<div style="margin-bottom:10px; display:flex; gap:10px">
				<div style="flex:1">
					<label style="display:block; font-size:11px; color:#aaa; margin-bottom:4px">Rows</label>
					<input type="number" id="stackRows" class="toolbox-input" style="width:100%" value="${rows}" disabled>
				</div>
				<div style="flex:1">
					<label style="display:block; font-size:11px; color:#aaa; margin-bottom:4px">Cols</label>
					<input type="number" id="stackCols" class="toolbox-input" style="width:100%" value="${cols}" disabled>
				</div>
			</div>
			<div style="margin-bottom:15px">
				<label style="display:flex; align-items:center; gap:6px; cursor:pointer">
					<input type="checkbox" id="stackDuplex" checked> Duplex (2-Sided)
				</label>
			</div>
			<div style="display:flex; justify-content:flex-end; gap:10px">
				<button id="stackCancel" class="toolbox-btn" style="width:auto; padding:6px 12px">Cancel</button>
				<button id="stackApply" class="toolbox-btn" style="width:auto; padding:6px 12px; background-color:#00bcd4; color:#000; font-weight:bold">Apply</button>
			</div>
		`;

		dialog.appendChild(content);
		document.body.appendChild(dialog);

		document.getElementById('stackCancel').onclick = () => document.body.removeChild(dialog);

		document.getElementById('stackApply').onclick = () => {
			const p = parseInt(document.getElementById('stackTotalPages').value) || 0;
			const bSize = parseInt(document.getElementById('stackBlockSize').value) || 0;
			const r = parseInt(document.getElementById('stackRows').value) || 1;
			const c = parseInt(document.getElementById('stackCols').value) || 1;
			const duplex = document.getElementById('stackDuplex').checked;
			const perFile = isMultiFile && document.getElementById('stackPerFile')?.checked;
			const slots = r * c;

			const generateStack = (count, offset) => {
				const effectiveBlockSize = bSize > 0 ? bSize : Math.ceil(count / slots);
				const sheetsPerBlock = duplex ? Math.ceil(effectiveBlockSize / 2) : effectiveBlockSize;
				const pagesPerBlockSet = slots * effectiveBlockSize;

				const res = [];
				let processed = 0;

				while(processed < count){
					for(let s=0; s<sheetsPerBlock; s++){
						for(let k=0; k<slots; k++){
							if(duplex){
								const p1Rel = k * effectiveBlockSize + (s * 2) + 1;
								const p2Rel = k * effectiveBlockSize + (s * 2) + 2;
								const p1 = processed + p1Rel;
								const p2 = processed + p2Rel;
								res.push(p1 <= count ? p1 + offset : 0);
								res.push(p2 <= count ? p2 + offset : 0);
							} else {
								const pRel = k * effectiveBlockSize + s + 1;
								const pg = processed + pRel;
								res.push(pg <= count ? pg + offset : 0);
							}
						}
					}
					processed += pagesPerBlockSet;
				}
				return res;
			};

			let result = [];
			if(perFile){
				let offset = 0;
				for(const count of fileCounts){
					result = result.concat(generateStack(count, offset));
					offset += count;
				}
			} else {
				result = generateStack(p, 0);
			}

			const rangeStr = window.pagesToRangeString ? window.pagesToRangeString(result) : result.join(' ');
			if(duplex) setRange(`2sided(${rangeStr})`);
			else setRange(rangeStr);

			document.body.removeChild(dialog);
		};

		if(isMultiFile){
			const pf = document.getElementById('stackPerFile');
			const tp = document.getElementById('stackTotalPages');
			pf.onchange = () => {
				tp.disabled = pf.checked;
				if(pf.checked) tp.value = totalPages;
			};
			pf.dispatchEvent(new Event('change'));
		}
	});
	if(impBlankBtn) impBlankBtn.addEventListener('click', (e) => updateRange(e, '0', true));

	const clearPageRangeBtn = document.getElementById('clearPageRangeBtn');
	if(clearPageRangeBtn){
		clearPageRangeBtn.addEventListener('click', () => {
			if(pageRangeInput){
				pageRangeInput.value = '';
				pageRangeInput.dispatchEvent(new Event('input'));
			}
		});

		// Create Help UI
		const pageRangeHelpContainer = clearPageRangeBtn.parentNode;
		if(pageRangeHelpContainer){
			const rangeHelpBtn = document.createElement('button');
			rangeHelpBtn.innerHTML = '&#63;';
			rangeHelpBtn.className = 'help-btn';
			rangeHelpBtn.title = 'Show Page Range Syntax Help';

			const rangeHelpBalloon = document.createElement('div');
			rangeHelpBalloon.className = 'help-balloon';
			
			rangeHelpBalloon.innerHTML = `
				<h3>Prefixes</h3>
				<p><code>shN:fN:pN:EXPRESSION</code></p>
				<ul>
					<li><code>sh2:...</code> Place on Sheet 2</li>
					<li><code>f1:...</code>, <code>f1-:...</code>, <code>f2-3:...</code> Use File(s) 1</li>
					<li><code>p1-4:...</code> Use pages 1-4 from file(s)</li>
				</ul>
				<h3>Ranges & Keywords</h3>
				<ul>
					<li><code>1-5</code>, <code>1-</code>, <code>3-1</code>, <code>last-1</code>: Ranges</li>
					<li><code>1,3-5</code>: Comma-separated list</li>
					<li><code>0</code>: Insert a blank page</li>
					<li><code>fill</code>: Fill rest of sheet</li>
				</ul>
				<h3>Functions</h3>
				<ul>
					<li><code>repeat</code>: Repeat pages to fill sheets</li>
					<li><code>2sided</code>, <code>2sided(1-3)</code>: 2-sided imposition (LR, RL)</li>
					<li><code>last-1</code>: Reverse page order</li>
					<li><code>4-up</code>, <code>8-up</code>...: Split booklet into N-page signatures</li>
					<li><code>booklet</code>: Booklet imposition</li>
					<li><code>snake</code>: Snake layout</li>
					<li><code>odd</code>, <code>even</code>: Filter pages</li>
					<li><code>b(...)</code>: Bottom-up layout</li>
					<li><code>-(...)</code>: Right-to-Left layout</li>
				</ul>
				<h3>Examples</h3>
				<p><code>sh2:f1:p1-4</code>, <code>sh2:f1:p1-:1-4</code><br>Uses pages 1-4 from File 1 on Sheet 2</p>
				<h3>Micro layout</h3>
				<p><code>-(1-5,3,8-4)</code>, <code>b(1-5,3,8-4)</code>, <code>2sided(1-8 9-10,11,12)</code>, <code>f1-:p1-:2sided(1-8 9-10,11 12)</code></p>
				<p>Expression in brackets follow Flip / Bottom-up / 2sided ... rule in its micro layout.</p>
				<div class="note"><strong>Note:</strong> Everything outside brackets follow primary Layout rules.</div>
				<p>Ex.: <code>2sided(1-8) 9-16</code> 1-8 will be placed on first 2 sheets and 9-16 on 3rd</p>
			`;

			document.body.appendChild(rangeHelpBalloon);
			pageRangeHelpContainer.insertBefore(rangeHelpBtn, clearPageRangeBtn.nextSibling);

			const positionBalloon = () => {
				const rect = rangeHelpBtn.getBoundingClientRect();
				rangeHelpBalloon.style.left = (rect.right + 10) + 'px';
				const h = rangeHelpBalloon.offsetHeight;
				let top = rect.top - (h / 2) + (rect.height / 2);
				if(top < 10) top = 10;
				if(top + h > window.innerHeight - 10) top = window.innerHeight - h - 10;
				rangeHelpBalloon.style.top = top + 'px';
			};

			rangeHelpBtn.addEventListener('click', (e) => { e.stopPropagation(); if(rangeHelpBalloon.style.display === 'block') { rangeHelpBalloon.style.display = 'none'; } else { rangeHelpBalloon.style.display = 'block'; positionBalloon(); } });
			const toolbox = pageRangeHelpContainer.closest('.toolbox');
			if(toolbox) toolbox.addEventListener('scroll', () => { if(rangeHelpBalloon.style.display === 'block') positionBalloon(); });
			document.addEventListener('click', (e) => { if (rangeHelpBalloon.style.display === 'block' && !rangeHelpBalloon.contains(e.target) && e.target !== rangeHelpBtn) { rangeHelpBalloon.style.display = 'none'; } });
		}
	}

	// wire UI: Left Toolbar Tabs
	const ltTabGrid = document.getElementById('ltTabGrid');
	const ltTabColor = document.getElementById('ltTabColor');
	const ltTabData = document.getElementById('ltTabData');
	const ltContentGrid = document.getElementById('ltContentGrid');
	const ltContentColor = document.getElementById('ltContentColor');
	const ltContentData = document.getElementById('ltContentData');

	if(ltTabGrid && ltTabColor && ltTabData && ltContentGrid && ltContentColor && ltContentData){
		const updateLeftTabs = (activeTab, activeContent) => {
			[ltTabGrid, ltTabColor, ltTabData].forEach(t => {
				t.style.borderBottomColor = (t === activeTab) ? '#00bcd4' : 'transparent';
				t.style.color = (t === activeTab) ? '#fff' : '#888';
			});
			[ltContentGrid, ltContentColor, ltContentData].forEach(c => {
				c.style.display = (c === activeContent) ? 'block' : 'none';
			});
		};

		ltTabGrid.addEventListener('click', () => updateLeftTabs(ltTabGrid, ltContentGrid));
		ltTabColor.addEventListener('click', () => updateLeftTabs(ltTabColor, ltContentColor));
		ltTabData.addEventListener('click', () => updateLeftTabs(ltTabData, ltContentData));

		// Initialize Data Tab UI
		ltContentData.innerHTML = '';

		// --- Data Merge Section ---
		const mergeHeader = document.createElement('h3');
		mergeHeader.textContent = 'Data Merge';
		ltContentData.appendChild(mergeHeader);

		const mergeContainer = document.createElement('div');
		mergeContainer.className = 'toolbox-row';
		mergeContainer.style.marginBottom = '15px';
		mergeContainer.style.borderBottom = '1px solid #444';
		mergeContainer.style.paddingBottom = '10px';

		const fileRow = document.createElement('div');
		fileRow.style.display = 'flex';
		fileRow.style.gap = '5px';
		fileRow.style.alignItems = 'center';

		const dataFileInput = document.createElement('input');
		dataFileInput.type = 'file';
		dataFileInput.accept = '.csv,.xls,.xlsx';
		dataFileInput.style.display = 'none';
		dataFileInput.id = 'dataMergeInput';

		const dataFileBtn = document.createElement('label');
		dataFileBtn.className = 'toolbox-btn';
		dataFileBtn.innerHTML = '<span class="material-icons" style="vertical-align:middle; font-size:16px">upload_file</span> Load Data File';
		dataFileBtn.htmlFor = 'dataMergeInput';
		dataFileBtn.style.flex = '1';
		dataFileBtn.style.textAlign = 'center';
		dataFileBtn.style.cursor = 'pointer';
		dataFileBtn.title = "Supports CSV, XLS, XLSX";

		const clearDataBtn = window.createDeleteBtn(() => {
			window.__mergeData = null;
			const info = document.getElementById('dataMergeInfo');
			if(info) info.textContent = 'No data loaded';
			dataFileInput.value = '';
			renderDataMergeCards();
		}, "Clear Data");

		fileRow.appendChild(dataFileInput);
		fileRow.appendChild(dataFileBtn);
		fileRow.appendChild(clearDataBtn);
		mergeContainer.appendChild(fileRow);

		const dataFileInfo = document.createElement('div');
		dataFileInfo.id = 'dataMergeInfo';
		dataFileInfo.style.fontSize = '10px';
		dataFileInfo.style.color = '#aaa';
		dataFileInfo.style.marginTop = '4px';
		dataFileInfo.textContent = 'No data loaded';
		mergeContainer.appendChild(dataFileInfo);

		// Source Page Selection
		const sourceRow = document.createElement('div');
		sourceRow.style.display = 'flex';
		sourceRow.style.gap = '5px';
		sourceRow.style.marginTop = '8px';
		sourceRow.style.alignItems = 'center';

		const sourceLabel = document.createElement('label');
		sourceLabel.textContent = 'Background:';
		sourceLabel.style.fontSize = '10px';
		sourceLabel.style.color = '#aaa';

		const sourceSelect = document.createElement('select');
		sourceSelect.className = 'toolbox-input';
		sourceSelect.id = 'mergeSourceSelect';
		sourceSelect.style.flex = '1';
		const optAll = document.createElement('option');
		optAll.value = 'all';
		optAll.textContent = 'Sequence (Default)';
		const optSingle = document.createElement('option');
		optSingle.value = 'single';
		optSingle.textContent = 'Repeat Page';
		sourceSelect.appendChild(optAll);
		sourceSelect.appendChild(optSingle);

		const pageNumInput = document.createElement('input');
		pageNumInput.type = 'number';
		pageNumInput.id = 'mergePageNumInput';
		pageNumInput.className = 'toolbox-input';
		pageNumInput.style.width = '40px';
		pageNumInput.value = '1';
		pageNumInput.min = '1';
		pageNumInput.style.display = 'none';

		sourceRow.appendChild(sourceLabel);
		sourceRow.appendChild(sourceSelect);
		sourceRow.appendChild(pageNumInput);
		mergeContainer.appendChild(sourceRow);

		ltContentData.appendChild(mergeContainer);
		
		const dataFieldsContainer = document.createElement('div');
		dataFieldsContainer.id = 'dataFieldsContainer';
		ltContentData.appendChild(dataFieldsContainer);

		dataFileInput.addEventListener('change', async (e) => {
			const file = e.target.files[0];
			if (!file) return;
			
			dataFileInfo.textContent = `Loading ${file.name}...`;

			try {
				if (file.name.match(/\.csv$/i) || file.type === 'text/csv') {
					const text = await file.text();
					// Simple CSV parser
					const parseCSV = (str) => {
						const arr = [];
						let quote = false;
						let col = 0, row = 0;
						for (let c = 0; c < str.length; c++) {
							let cc = str[c], nc = str[c+1];
							arr[row] = arr[row] || [];
							arr[row][col] = arr[row][col] || '';
							if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; }
							else if (cc == '"') { quote = !quote; }
							else if (cc == ',' && !quote) { ++col; }
							else if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; }
							else if (cc == '\n' && !quote) { ++row; col = 0; }
							else if (cc == '\r' && !quote) { ++row; col = 0; }
							else { arr[row][col] += cc; }
						}
						return arr;
					};
					
					const rows = parseCSV(text);
					if (rows.length > 0) {
						window.__mergeData = {
							headers: rows[0],
							rows: rows.slice(1).filter(r => r.length > 0 && (r.length > 1 || r[0] !== ''))
						};
						dataFileInfo.textContent = `${file.name} (${window.__mergeData.rows.length} records)`;
						renderDataMergeCards();
					}
				} else if (file.name.match(/\.xlsx?$/i)) {
					if (typeof XLSX !== 'undefined') {
						const data = await file.arrayBuffer();
						const workbook = XLSX.read(data);
						const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
						const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
						if (rows.length > 0) {
							window.__mergeData = {
								headers: rows[0],
								rows: rows.slice(1)
							};
							dataFileInfo.textContent = `${file.name} (${window.__mergeData.rows.length} records)`;
							renderDataMergeCards();
						}
					} else {
						dataFileInfo.textContent = `Error: SheetJS library missing.`;
						alert("To use XLS/XLSX files, please include the SheetJS (xlsx) library in your HTML.");
					}
				} else {
					dataFileInfo.textContent = "Unsupported file type.";
				}
			} catch (err) {
				console.error(err);
				dataFileInfo.textContent = `Error loading ${file.name}`;
			}
		});

		const updateMergeSettings = () => {
			window.__mergeSource.mode = sourceSelect.value;
			window.__mergeSource.page = parseInt(pageNumInput.value) || 1;
			if (window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		};

		sourceSelect.onchange = () => {
			pageNumInput.style.display = sourceSelect.value === 'single' ? 'block' : 'none';
			updateMergeSettings();
		};
		pageNumInput.oninput = () => {
			updateMergeSettings();
		};
		
		window.renderDataMergeCards = () => {
			dataFieldsContainer.innerHTML = '';
			if(!window.__mergeData || !window.__mergeData.headers) return;

			window.__mergeData.headers.forEach((header, colIndex) => {
				if(!header) return;

				const recordCount = window.__mergeData.rows.filter(row => row && row[colIndex] && String(row[colIndex]).trim() !== '').length;
				// Initialize config for this column if missing
				if(!window.__mergeConfig[header]) {
					window.__mergeConfig[header] = {
						visible: false,
						x: 10, y: 10 + (colIndex * 5),
						styleId: null,
						startPage: 1,
						pageFilter: 'all'
					};
				}
				const cfg = window.__mergeConfig[header];

				const card = document.createElement('div');
				Object.assign(card.style, {
					background: '#333', border: '1px solid #444', borderRadius: '4px',
					padding: '8px', marginBottom: '8px'
				});

				// Header Row
				const headRow = document.createElement('div');
				headRow.style.display = 'flex';
				headRow.style.justifyContent = 'space-between';
				headRow.style.alignItems = 'center';
				headRow.style.marginBottom = '6px';

				const title = document.createElement('span');
				title.textContent = `${header} (${recordCount} items)`;
				title.style.fontWeight = 'bold';
				title.style.color = '#ddd';
				title.style.fontSize = '11px';

				const visLabel = document.createElement('label');
				visLabel.style.fontSize = '10px';
				visLabel.style.color = '#aaa';
				visLabel.style.display = 'flex';
				visLabel.style.alignItems = 'center';
				visLabel.style.gap = '4px';
				const visCheck = document.createElement('input');
				visCheck.type = 'checkbox';
				visCheck.checked = cfg.visible;
				visCheck.onchange = (e) => {
					cfg.visible = e.target.checked;
					if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
				};
				visLabel.appendChild(visCheck);
				visLabel.appendChild(document.createTextNode('Enable'));

				headRow.appendChild(title);
				headRow.appendChild(visLabel);
				card.appendChild(headRow);

				// Inputs Helper
				const mkRow = () => { const d = document.createElement('div'); d.style.display='flex'; d.style.gap='5px'; d.style.marginBottom='4px'; return d; };
				const mkInp = (lbl, key, type='number', step=1, width='auto') => {
					const w = document.createElement('div');
					w.style.flex = '1';
					const l = document.createElement('label');
					l.textContent = lbl;
					l.style.display = 'block';
					l.style.fontSize = '9px';
					l.style.color = '#aaa';
					const i = document.createElement('input');
					i.type = type;
					i.value = cfg[key];
					if(type==='number') i.step = step;
					i.className = 'toolbox-input';
					i.style.width = '100%';
					i.oninput = (e) => {
						cfg[key] = (type==='number') ? parseFloat(e.target.value) : e.target.value;
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					};
					w.appendChild(l);
					w.appendChild(i);
					return w;
				};

				// Row 1: X, Y, Start Page
				const r1 = mkRow();
				r1.appendChild(mkInp('X (mm)', 'x', 'number', 1));
				r1.appendChild(mkInp('Y (mm)', 'y', 'number', 1));
				r1.appendChild(mkInp('Start Page', 'startPage', 'number', 1));
				card.appendChild(r1);

				// Row 2: Text Style
				const r2 = mkRow();
				const styleWrap = document.createElement('div');
				styleWrap.style.flex = '1';
				const sl = document.createElement('label');
				sl.textContent = 'Text Style';
				sl.style.display = 'block';
				sl.style.fontSize = '9px';
				sl.style.color = '#aaa';
				const sSel = document.createElement('select');
				sSel.className = 'toolbox-input';
				sSel.style.width = '100%';

				const styles = window.__textStyles || {};
				const styleNames = Object.keys(styles);
				
				if (styleNames.length === 0) {
					const o = document.createElement('option');
					o.textContent = 'No styles defined';
					sSel.disabled = true;
					sSel.appendChild(o);
				} else {
					styleNames.forEach(name => {
						const o = document.createElement('option');
						o.value = name;
						o.textContent = name;
						sSel.appendChild(o);
					});
					if (!cfg.styleId || !styles[cfg.styleId]) cfg.styleId = styleNames[0];
					sSel.value = cfg.styleId;
				}
				sSel.onchange = (e) => { cfg.styleId = e.target.value; if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0}); };
				
				styleWrap.appendChild(sl);
				styleWrap.appendChild(sSel);
				r2.appendChild(styleWrap);
				card.appendChild(r2);

				// Row 3: Page Filter
				const r3 = mkRow();
				const pageFilterWrap = document.createElement('div');
				pageFilterWrap.style.flex = '1';
				const pfl = document.createElement('label');
				pfl.textContent = 'Show On';
				pfl.style.display = 'block';
				pfl.style.fontSize = '9px';
				pfl.style.color = '#aaa';
				const pfSel = document.createElement('select');
				pfSel.className = 'toolbox-input';
				['All Pages', 'Odd Pages', 'Even Pages'].forEach(f => {
					const o = document.createElement('option');
					const val = f.split(' ')[0].toLowerCase();
					o.value = val; 
					o.textContent = f;
					pfSel.appendChild(o);
				});
				pfSel.value = cfg.pageFilter || 'all';
				pfSel.onchange = (e) => { cfg.pageFilter = e.target.value; if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0}); };
				pageFilterWrap.appendChild(pfl);
				pageFilterWrap.appendChild(pfSel);
				r3.appendChild(pageFilterWrap);
				card.appendChild(r3);

				dataFieldsContainer.appendChild(card);
			});
		};

		const header = document.createElement('h3');
		header.textContent = 'Data Overlays';
		ltContentData.appendChild(header);

		const addBtn = window.createToolboxBtn('add', 'Add Square Overlay');
		addBtn.style.width = 'auto';
		addBtn.style.marginBottom = '10px';
		ltContentData.appendChild(addBtn);

		const addNumBtn = window.createToolboxBtn('looks_one', 'Add Numbering');
		addNumBtn.style.width = 'auto';
		addNumBtn.style.marginBottom = '10px';
		ltContentData.appendChild(addNumBtn);

		const addFileNameBtn = window.createToolboxBtn('description', 'Add File Name');
		addFileNameBtn.style.width = 'auto';
		addFileNameBtn.style.marginBottom = '10px';
		ltContentData.appendChild(addFileNameBtn);

		const addColorBarBtn = window.createToolboxBtn('palette', 'Add Color Bar');
		addColorBarBtn.style.width = 'auto';
		addColorBarBtn.style.marginBottom = '10px';
		ltContentData.appendChild(addColorBarBtn);

		const addDuplexBtn = window.createToolboxBtn('center_focus_strong', 'Add Duplex Mark');
		addDuplexBtn.style.width = 'auto';
		addDuplexBtn.style.marginBottom = '10px';
		ltContentData.appendChild(addDuplexBtn);

		const addSigMarkBtn = window.createToolboxBtn('bookmark_border', 'Add Signature Mark');
		addSigMarkBtn.style.width = 'auto';
		addSigMarkBtn.style.marginBottom = '10px';
		addSigMarkBtn.disabled = true;
		addSigMarkBtn.style.opacity = '0.5';
		ltContentData.appendChild(addSigMarkBtn);

		const overlaysContainer = document.createElement('div');
		overlaysContainer.style.display = 'flex';
		overlaysContainer.style.flexDirection = 'column';
		overlaysContainer.style.gap = '10px';
		ltContentData.appendChild(overlaysContainer);

		const saveOverlays = () => {
			if(window.__saveSettingsEnabled){
				localStorage.setItem('pdf_overlays', JSON.stringify(window.__overlays));
			}
		};

		if(window.__saveSettingsEnabled){
			try {
				const saved = localStorage.getItem('pdf_overlays');
				if(saved) {
					window.__overlays = JSON.parse(saved);
					window.__overlays.forEach(ov => {
						if(ov.type !== 'duplex' && ov.type !== 'colorbar' && ov.type !== 'filename') ov.visible = false;
					});
					setTimeout(() => {
						if(window.drawSheetOverlays) window.drawSheetOverlays();
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					}, 500);
				}
			} catch(e) { console.warn(e); }
		}

		const renderOverlayInputs = window.renderOverlayInputs = () => {
			overlaysContainer.innerHTML = '';
			if(!window.__overlays) window.__overlays = [];
			
			const activeOverlays = [];
			const savedOverlays = [];

			window.__overlays.forEach((ov, i) => {
				if(!ov.name) {
					let typeName = 'Overlay';
					if(ov.type === 'numbering') typeName = 'Numbering';
					else if(ov.type === 'filename') typeName = 'File Name';
					else if(ov.type === 'colorbar') typeName = 'Color Bar';
					else if(ov.type === 'duplex') typeName = 'Duplex';
					else if(ov.type === 'regmark') typeName = 'Reg. Mark';
					ov.name = `${typeName} ${i + 1}`;
				}
				if(ov.saved) {
					ov.visible = false;
					savedOverlays.push({ov, i});
				} else {
					activeOverlays.push({ov, i});
				}
			});

			if(savedOverlays.length > 0){
				const savedRow = document.createElement('div');
				Object.assign(savedRow.style, { marginBottom:'10px', padding:'4px', background:'#222', border:'1px solid #444', borderRadius:'4px', display:'flex', alignItems:'center', gap:'5px' });
				
				const select = document.createElement('select');
				select.className = 'toolbox-input';
				select.style.flex = '1';
				
				const defOpt = document.createElement('option');
				defOpt.textContent = `Saved Cards (${savedOverlays.length})`;
				defOpt.value = -1;
				select.appendChild(defOpt);
				
				savedOverlays.forEach(({ov, i}) => {
					const opt = document.createElement('option');
					opt.value = i;
					opt.textContent = ov.name;
					select.appendChild(opt);
				});
				
				select.onchange = (e) => {
					const idx = parseInt(e.target.value);
					if(idx !== -1) {
						window.__overlays[idx].saved = false;
						window.__overlays[idx].visible = true;
						saveOverlays();
						renderOverlayInputs();
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
						if(window.drawSheetOverlays) window.drawSheetOverlays();
					}
				};
				
				savedRow.appendChild(select);
				overlaysContainer.appendChild(savedRow);
			}

			// Render in reverse order so top layer is at the top of the list
			const listItems = activeOverlays.reverse();

			listItems.forEach(({ov: overlay, i: index}) => {
				const row = document.createElement('div');
				row.style.border = '1px solid #444';
				row.style.padding = '8px';
				row.style.borderRadius = '4px';
				row.style.background = '#333';

				// Drag and Drop
				row.addEventListener('dragstart', (e) => {
					e.dataTransfer.setData('text/plain', index);
					row.style.opacity = '0.5';
				});
				row.addEventListener('dragend', () => {
					row.style.opacity = '1';
					row.draggable = false;
					Array.from(overlaysContainer.children).forEach(c => {
						c.style.borderTop = '1px solid #444';
						c.style.borderBottom = 'none';
					});
				});
				row.addEventListener('dragover', (e) => {
					e.preventDefault();
					const rect = row.getBoundingClientRect();
					const midY = rect.top + rect.height / 2;
					if(e.clientY < midY) {
						row.style.borderTop = '2px solid #00bcd4';
						row.style.borderBottom = 'none';
					} else {
						row.style.borderTop = '1px solid #444';
						row.style.borderBottom = '2px solid #00bcd4';
					}
				});
				row.addEventListener('drop', (e) => {
					e.preventDefault();
					const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
					if(isNaN(fromIndex) || fromIndex === index) return;
					const rect = row.getBoundingClientRect();
					const midY = rect.top + rect.height / 2;
					let toIndex = (e.clientY < midY) ? index + 1 : index;
					const item = window.__overlays.splice(fromIndex, 1)[0];
					if (fromIndex < toIndex) toIndex--;
					window.__overlays.splice(toIndex, 0, item);
					saveOverlays();
					renderOverlayInputs();
					if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
				});

				const topRow = document.createElement('div');
				topRow.style.display = 'flex';
				topRow.style.justifyContent = 'space-between';
				topRow.style.alignItems = 'center';
				topRow.style.marginBottom = '4px';

				const titleContainer = document.createElement('div');
				titleContainer.style.display = 'flex';
				titleContainer.style.alignItems = 'center';
				titleContainer.style.flex = '1';
				titleContainer.style.overflow = 'hidden';
				titleContainer.style.marginRight = '8px';

				const titleText = document.createElement('span');
				titleText.textContent = overlay.name;
				Object.assign(titleText.style, { fontWeight:'bold', color:'#ddd', cursor:'grab', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginRight:'4px', flex:'1' });
				titleText.onmousedown = (e) => { row.draggable = true; };
				titleText.onmouseup = () => { row.draggable = false; };

				const titleInput = document.createElement('input');
				titleInput.type = 'text';
				titleInput.value = overlay.name;
				titleInput.className = 'toolbox-input';
				Object.assign(titleInput.style, { display:'none', width:'100%', fontWeight:'bold', background:'transparent', border:'1px solid #555', color:'#ddd' });
				
				const editBtn = document.createElement('button');
				editBtn.className = 'toolbox-btn';
				Object.assign(editBtn.style, { width:'16px', height:'16px', padding:'0', display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', opacity:'0.7', cursor:'pointer' });
				editBtn.innerHTML = '<span class="material-icons" style="font-size:12px">edit</span>';
				
				const toggleEdit = () => {
					if(titleInput.style.display === 'none'){
						titleText.style.display = 'none';
						editBtn.style.display = 'none';
						titleInput.style.display = 'block';
						titleInput.focus();
					} else {
						titleText.style.display = 'block';
						editBtn.style.display = 'flex';
						titleInput.style.display = 'none';
						if(titleInput.value !== overlay.name){
							overlay.name = titleInput.value;
							titleText.textContent = overlay.name;
							saveOverlays();
						}
					}
				};

				editBtn.onclick = toggleEdit;
				titleText.ondblclick = toggleEdit;

				titleInput.onblur = toggleEdit;
				titleInput.onkeydown = (e) => { if(e.key === 'Enter') titleInput.blur(); };
				titleInput.onmousedown = (e) => e.stopPropagation();

				titleContainer.appendChild(titleText);
				titleContainer.appendChild(titleInput);
				titleContainer.appendChild(editBtn);

				const controlsDiv = document.createElement('div');
				controlsDiv.style.display = 'flex';
				controlsDiv.style.gap = '8px';
				controlsDiv.style.alignItems = 'center';
				controlsDiv.style.marginBottom = '8px';

				const mkCb = (lbl, prop) => {
					const l = document.createElement('label');
					l.style.fontSize = '9px';
					l.style.color = '#aaa';
					l.style.display = 'flex';
					l.style.alignItems = 'center';
					l.style.gap = '2px';
					l.style.cursor = 'pointer';
					const cb = document.createElement('input');
					cb.type = 'checkbox';
					cb.checked = overlay[prop] !== false;
					cb.onchange = (e) => {
						overlay[prop] = e.target.checked;
						saveOverlays();
						if(prop === 'visible'){
							renderOverlayInputs();
							if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
							if(window.drawSheetOverlays) window.drawSheetOverlays();
						}
					};
					l.appendChild(cb);
					l.appendChild(document.createTextNode(lbl));
					return l;
				};

				controlsDiv.appendChild(mkCb('Show', 'visible'));

				const actionsDiv = document.createElement('div');
				actionsDiv.style.display = 'flex';
				actionsDiv.style.gap = '4px';
				actionsDiv.style.alignItems = 'center';

				const stashBtn = window.createToolboxBtn('archive', null, () => {
					overlay.saved = true;
					overlay.visible = false;
					saveOverlays();
					renderOverlayInputs();
					if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					if(window.drawSheetOverlays) window.drawSheetOverlays();
				}, 'Save for later');
				Object.assign(stashBtn.style, { width:'20px', height:'20px', padding:'0' });
				actionsDiv.appendChild(stashBtn);

				const duplicateBtn = window.createToolboxBtn('content_copy', null, () => {
					const newOverlay = JSON.parse(JSON.stringify(overlay));
					window.__overlays.splice(index + 1, 0, newOverlay);
					saveOverlays();
					renderOverlayInputs();
					if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					if(window.drawSheetOverlays) window.drawSheetOverlays();
				}, 'Duplicate Overlay');
				Object.assign(duplicateBtn.style, { width:'20px', height:'20px', padding:'0' });
				actionsDiv.appendChild(duplicateBtn);

				const removeBtn = window.createToolboxBtn('close', null, () => {
					window.__overlays.splice(index, 1);
					saveOverlays();
					renderOverlayInputs();
					if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					if(window.drawSheetOverlays) window.drawSheetOverlays();
				}, 'Remove Overlay');
				Object.assign(removeBtn.style, { width:'20px', height:'20px', padding:'0' });
				actionsDiv.appendChild(removeBtn);

				topRow.appendChild(titleContainer);
				topRow.appendChild(actionsDiv);
				row.appendChild(topRow);
				row.appendChild(controlsDiv);

				// Inputs helper
				const createInput = (label, key, val) => {
					const wrap = document.createElement('div');
					wrap.style.display = 'flex';
					wrap.style.alignItems = 'center';
					wrap.style.marginBottom = '4px';
					
					const lbl = document.createElement('label');
					lbl.textContent = label;
					lbl.style.width = '50px';
					lbl.style.fontSize = '10px';
					lbl.style.color = '#aaa';
					
					const inp = document.createElement('input');
					inp.type = 'number';
					inp.className = 'toolbox-input';
					inp.style.flex = '1';
					inp.value = val;
					inp.step = '1';
					inp.oninput = (e) => {
						overlay[key] = parseFloat(e.target.value) || 0;
						saveOverlays();
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					};
					// Handle step with shift key
					inp.addEventListener('mousedown', (e) => { if(e.target) e.target.step = e.shiftKey ? '0.1' : '1'; });
					inp.addEventListener('keydown', (e) => { if(e.target) e.target.step = e.shiftKey ? '0.1' : '1'; });
					
					wrap.appendChild(lbl);
					wrap.appendChild(inp);
					return wrap;
				};

				const createTextInput = (label, key, val) => {
					const wrap = document.createElement('div');
					wrap.style.display = 'flex';
					wrap.style.alignItems = 'center';
					wrap.style.marginBottom = '4px';
					
					const lbl = document.createElement('label');
					lbl.textContent = label;
					lbl.style.width = '50px';
					lbl.style.fontSize = '10px';
					lbl.style.color = '#aaa';
					
					const inp = document.createElement('input');
					inp.type = 'text';
					inp.className = 'toolbox-input';
					inp.style.flex = '1';
					inp.value = val || '';
					inp.oninput = (e) => {
						overlay[key] = e.target.value;
						saveOverlays();
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					};
					
					wrap.appendChild(lbl);
					wrap.appendChild(inp);
					return wrap;
				};

				const createCmykInput = (ov) => {
					if(!ov.cmyk) ov.cmyk = (ov.type === 'numbering') ? [0,0,0,1] : [0.5,0,0.5,0];
					const wrap = document.createElement('div');
					wrap.style.marginTop = '4px';
					wrap.style.marginBottom = '4px';
					wrap.style.borderTop = '1px solid #555';
					wrap.style.paddingTop = '4px';
					
					const labels = ['C', 'M', 'Y', 'K'];
					const colors = ['#00ffff', '#ff00ff', '#ffff00', '#aaaaaa'];
					
					labels.forEach((l, i) => {
						const r = document.createElement('div');
						r.style.display = 'flex';
						r.style.alignItems = 'center';
						
						const lbl = document.createElement('span');
						lbl.textContent = l;
						lbl.style.width = '15px';
						lbl.style.fontSize = '9px';
						lbl.style.color = colors[i];
						
						const sl = document.createElement('input');
						sl.type = 'range';
						sl.min = 0;
						sl.max = 100;
						sl.value = Math.round(ov.cmyk[i] * 100);
						sl.className = 'toolbox-slider';
						sl.style.flex = '1';
						sl.style.height = '16px';

						const num = document.createElement('input');
						num.type = 'number';
						num.min = '0';
						num.max = '100';
						num.value = Math.round(ov.cmyk[i] * 100);
						num.className = 'toolbox-input no-spin';
						num.style.width = '30px';
						num.style.marginLeft = '4px';
						num.style.fontSize = '9px';
						num.style.padding = '1px';
						num.style.textAlign = 'right';

						const update = (val) => {
							ov.cmyk[i] = val / 100;
							saveOverlays();
							if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
						};

						sl.oninput = (e) => {
							const val = parseInt(e.target.value);
							num.value = val;
							update(val);
						};

						num.oninput = (e) => {
							let val = parseInt(e.target.value);
							if(isNaN(val)) val = 0;
							if(val < 0) val = 0;
							if(val > 100) val = 100;
							sl.value = val;
							update(val);
						};
						
						r.appendChild(lbl);
						r.appendChild(sl);
						r.appendChild(num);
						wrap.appendChild(r);
					});
					return wrap;
				};

				const createOpacityInput = (ov) => {
					if(ov.opacity === undefined) ov.opacity = 0.5;
					const wrap = document.createElement('div');
					wrap.style.display = 'flex';
					wrap.style.alignItems = 'center';
					wrap.style.marginTop = '2px';
					
					const lbl = document.createElement('span');
					lbl.textContent = 'Op';
					lbl.style.width = '20px';
					lbl.style.fontSize = '9px';
					lbl.style.color = '#ccc';
					
					const sl = document.createElement('input');
					sl.type = 'range';
					sl.min = 0;
					sl.max = 100;
					sl.value = Math.round(ov.opacity * 100);
					sl.className = 'toolbox-slider';
					sl.style.flex = '1';
					sl.style.height = '16px';
					sl.oninput = (e) => {
						ov.opacity = parseInt(e.target.value) / 100;
						saveOverlays();
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					};
					
					wrap.appendChild(lbl);
					wrap.appendChild(sl);
					return wrap;
				};

				const createFacingInput = (ov) => {
					const facingWrap = document.createElement('label');
					facingWrap.style.display = 'flex';
					facingWrap.style.alignItems = 'center';
					facingWrap.style.marginBottom = '4px';
					facingWrap.style.cursor = 'pointer';
					
					const facingLbl = document.createElement('span');
					facingLbl.textContent = 'Facing Pages';
					facingLbl.style.fontSize = '10px';
					facingLbl.style.color = '#aaa';
					facingLbl.style.marginRight = '5px';
					
					const facingCheck = document.createElement('input');
					facingCheck.type = 'checkbox';
					facingCheck.checked = !!ov.facingPages;
					facingCheck.onchange = (e) => {
						ov.facingPages = e.target.checked;
						saveOverlays();
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					};
					
					facingWrap.appendChild(facingCheck);
					facingWrap.appendChild(facingLbl);
					return facingWrap;
				};

				if (overlay.type === 'numbering' || overlay.type === 'filename') {
					// Style Selector
					const styleRow = document.createElement('div');
					styleRow.style.display = 'flex';
					styleRow.style.marginBottom = '4px';
					styleRow.style.alignItems = 'center';
					
					const styleLbl = document.createElement('label');
					styleLbl.textContent = 'Style';
					styleLbl.style.width = '50px';
					styleLbl.style.fontSize = '10px';
					styleLbl.style.color = '#aaa';

					const styleSel = document.createElement('select');
					styleSel.className = 'toolbox-input';
					styleSel.style.flex = '1';

					const styles = window.__textStyles || {};
					const styleNames = Object.keys(styles);

					if (styleNames.length === 0) {
						const opt = document.createElement('option');
						opt.textContent = 'No styles defined';
						styleSel.disabled = true;
						styleSel.appendChild(opt);
					} else {
						styleNames.forEach(name => {
							const o = document.createElement('option');
							o.value = name;
							o.textContent = name;
							styleSel.appendChild(o);
						});
						if (!overlay.styleId || !styles[overlay.styleId]) overlay.styleId = styleNames[0];
						styleSel.value = overlay.styleId;
					}
					styleSel.onchange = (e) => {
						overlay.styleId = e.target.value;
						saveOverlays();
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					};

					styleRow.appendChild(styleLbl);
					styleRow.appendChild(styleSel);
					row.appendChild(styleRow);

					row.appendChild(createFacingInput(overlay));

					if (overlay.type === 'numbering') {
						row.appendChild(createTextInput('Prefix', 'prefix', overlay.prefix));
						row.appendChild(createInput('Digits', 'digits', overlay.digits));
						const onPagesInput = createTextInput('On Pages', 'pageRange', overlay.pageRange);
						row.appendChild(onPagesInput);
						row.appendChild(createInput('Start', 'startFrom', (overlay.startFrom !== undefined) ? overlay.startFrom : 1));

						const subRow = document.createElement('div');
						Object.assign(subRow.style, { marginTop:'4px', padding:'4px', border:'1px solid #555', borderRadius:'4px', background:'#2a2a2a' });
						
						const cbLabel = document.createElement('label');
						Object.assign(cbLabel.style, { display:'flex', alignItems:'center', fontSize:'10px', color:'#aaa', marginBottom:'4px', cursor:'pointer' });
						const cb = document.createElement('input');
						cb.type = 'checkbox';
						cb.checked = !!overlay.useSpecificPages;
						cb.onchange = (e) => {
							overlay.useSpecificPages = e.target.checked;
							saveOverlays();
							renderOverlayInputs();
							if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
							onPagesInput.querySelector('input').disabled = overlay.useSpecificPages;
						};
						cbLabel.appendChild(cb);
						cbLabel.appendChild(document.createTextNode(' Use Pages (Sequential)'));
						subRow.appendChild(cbLabel);

						const pInput = createTextInput('Seq. Pages', 'specificPages', overlay.specificPages);
						pInput.querySelector('input').disabled = !overlay.useSpecificPages;
						onPagesInput.querySelector('input').disabled = !!overlay.useSpecificPages;
						subRow.appendChild(pInput);

						const dInput = createInput('Duplicate', 'duplicateCount', overlay.duplicateCount);
						dInput.querySelector('input').disabled = !overlay.useSpecificPages;
						subRow.appendChild(dInput);

						const createFilesBtn = window.createToolboxBtn('library_add', 'Create Files', async () => {
							if (!window.PDFLib || !window.__lastObjectURL) return;
							const pagesStr = overlay.specificPages;
							const dupCount = parseInt(overlay.duplicateCount) || 1;
							if (!pagesStr) return;
							
							const btnText = createFilesBtn.innerHTML;
							createFilesBtn.innerHTML = 'Processing...';
							createFilesBtn.disabled = true;

							try {
								const pages = window.parsePageOrder ? window.parsePageOrder(pagesStr) : [];
								if (pages.length === 0) throw new Error("No pages selected");

								const { PDFDocument } = window.PDFLib;
								const pdfBytes = await fetch(window.__lastObjectURL).then(res => res.arrayBuffer());
								const srcDoc = await PDFDocument.load(pdfBytes);
								const newFiles = [];
								for (const pageNum of pages) {
									if (pageNum < 1 || pageNum > srcDoc.getPageCount()) continue;
									const newDoc = await PDFDocument.create();
									const [copiedPage] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
									for (let i = 0; i < dupCount; i++) newDoc.addPage(copiedPage);
									const newBytes = await newDoc.save();
									const blob = new Blob([newBytes], { type: 'application/pdf' });
									newFiles.push(new File([blob], `Page_${pageNum}_x${dupCount}.pdf`, { type: 'application/pdf' }));
								}
								if (newFiles.length > 0) {
									const oldFileCount = (window.__importedFiles || []).length;
									if (window.__importedFiles) {
										window.__importedFiles.forEach(f => f.hidden = true);
									}
									window.__importedFiles = (window.__importedFiles || []).concat(newFiles);
									await window.openPdfFile(window.__importedFiles, true);
									
									overlay.useSpecificPages = false;
									overlay.specificPages = "";
									delete overlay._cachedRangeStr;
									delete overlay._cachedPageList;
									const startF = oldFileCount + 1;
									const endF = oldFileCount + newFiles.length;
									overlay.pageRange = (startF === endF) ? `f${startF}:1-` : `f${startF}-${endF}:1-`;
									overlay.visible = true;
									saveOverlays();
									renderOverlayInputs();
									if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
								}
							} catch (e) { console.error(e); alert(e.message); } finally { createFilesBtn.innerHTML = btnText; createFilesBtn.disabled = false; }
						}, 'Add these pages as new files to the list');
						createFilesBtn.style.marginTop = '4px';
						createFilesBtn.style.width = '100%';
						createFilesBtn.style.fontSize = '10px';
						createFilesBtn.disabled = !overlay.useSpecificPages;
						subRow.appendChild(createFilesBtn);

						row.appendChild(subRow);
					} else {
						// Filename specific inputs
						const fileRow = document.createElement('div');
						fileRow.style.display = 'flex';
						fileRow.style.alignItems = 'center';
						fileRow.style.marginBottom = '4px';
						fileRow.style.gap = '5px';

						const fileSel = document.createElement('select');
						fileSel.className = 'toolbox-input';
						fileSel.style.flex = '1';
						
						const files = window.__fileNames || [];
						if(files.length === 0){
							const o = document.createElement('option');
							o.textContent = "No files";
							fileSel.disabled = true;
							fileSel.appendChild(o);
						} else {
							files.forEach((f, i) => {
								const o = document.createElement('option');
								o.value = i;
								o.textContent = (i+1) + ': ' + f;
								fileSel.appendChild(o);
							});
						}
						
						const allFilesLabel = document.createElement('label');
						allFilesLabel.style.fontSize = '10px';
						allFilesLabel.style.color = '#aaa';
						allFilesLabel.style.display = 'flex';
						allFilesLabel.style.alignItems = 'center';
						allFilesLabel.style.gap = '4px';
						allFilesLabel.style.cursor = 'pointer';
						
						const allFilesCheck = document.createElement('input');
						allFilesCheck.type = 'checkbox';
						allFilesCheck.checked = overlay.allFiles !== false;
						
						const updateFile = () => {
							overlay.allFiles = allFilesCheck.checked;
							fileSel.disabled = overlay.allFiles || files.length === 0;
							if(!overlay.allFiles) overlay.fileIndex = parseInt(fileSel.value);
							saveOverlays();
							if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
						};
						
						allFilesCheck.onchange = updateFile;
						fileSel.onchange = updateFile;
						
						// Init state
						fileSel.disabled = allFilesCheck.checked || files.length === 0;
						if(overlay.fileIndex !== undefined) fileSel.value = overlay.fileIndex;

						allFilesLabel.appendChild(allFilesCheck);
						allFilesLabel.appendChild(document.createTextNode('All Files'));
						
						fileRow.appendChild(fileSel);
						fileRow.appendChild(allFilesLabel);
						row.appendChild(fileRow);

						const extWrap = document.createElement('label');
						extWrap.style.display = 'flex';
						extWrap.style.alignItems = 'center';
						extWrap.style.marginBottom = '4px';
						extWrap.style.cursor = 'pointer';
						const extLbl = document.createElement('span');
						extLbl.textContent = 'Include Extension';
						extLbl.style.fontSize = '10px';
						extLbl.style.color = '#aaa';
						extLbl.style.marginRight = '5px';
						const extCheck = document.createElement('input');
						extCheck.type = 'checkbox';
						extCheck.checked = overlay.includeExtension !== false;
						extCheck.onchange = (e) => {
							overlay.includeExtension = e.target.checked;
							saveOverlays();
							if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
						};
						extWrap.appendChild(extCheck);
						extWrap.appendChild(extLbl);
						row.appendChild(extWrap);
					}

					row.appendChild(createInput('Pos X', 'x', overlay.x));
					row.appendChild(createInput('Pos Y', 'y', overlay.y));

				} else if (overlay.type === 'colorbar') {
					const mkInp = (lbl, k, v) => {
						const w = createInput(lbl, k, v);
						w.querySelector('input').oninput = (e) => {
							overlay[k] = parseFloat(e.target.value) || 0;
							saveOverlays();
							if(window.drawSheetOverlays) window.drawSheetOverlays();
						};
						return w;
					};
					row.appendChild(mkInp('Cell Size', 'cellSize', overlay.cellSize));
					row.appendChild(mkInp('Pos X', 'x', overlay.x));
					row.appendChild(mkInp('Pos Y', 'y', overlay.y));
					row.appendChild(mkInp('Length', 'limit', overlay.limit));
					
					const vertWrap = document.createElement('label');
					vertWrap.style.display = 'flex';
					vertWrap.style.alignItems = 'center';
					vertWrap.style.marginBottom = '4px';
					vertWrap.style.cursor = 'pointer';
					const vertLbl = document.createElement('span');
					vertLbl.textContent = 'Vertical';
					vertLbl.style.width = '50px';
					vertLbl.style.fontSize = '10px';
					vertLbl.style.color = '#aaa';
					const vertCheck = document.createElement('input');
					vertCheck.type = 'checkbox';
					vertCheck.checked = !!overlay.vertical;
					vertCheck.onchange = (e) => { overlay.vertical = e.target.checked; saveOverlays(); if(window.drawSheetOverlays) window.drawSheetOverlays(); };
					vertWrap.appendChild(vertLbl);
					vertWrap.appendChild(vertCheck);
					row.appendChild(vertWrap);

					const repWrap = document.createElement('label');
					repWrap.style.display = 'flex';
					repWrap.style.alignItems = 'center';
					repWrap.style.marginBottom = '4px';
					repWrap.style.cursor = 'pointer';
					const repLbl = document.createElement('span');
					repLbl.textContent = 'Repeat';
					repLbl.style.width = '50px';
					repLbl.style.fontSize = '10px';
					repLbl.style.color = '#aaa';
					const repCheck = document.createElement('input');
					repCheck.type = 'checkbox';
					repCheck.checked = !!overlay.repeat;
					repCheck.onchange = (e) => { overlay.repeat = e.target.checked; saveOverlays(); if(window.drawSheetOverlays) window.drawSheetOverlays(); };
					repWrap.appendChild(repLbl);
					repWrap.appendChild(repCheck);
					row.appendChild(repWrap);

					const regWrap = document.createElement('label');
					regWrap.style.display = 'flex';
					regWrap.style.alignItems = 'center';
					regWrap.style.marginBottom = '4px';
					regWrap.style.cursor = 'pointer';
					const regLbl = document.createElement('span');
					regLbl.textContent = 'Reg. Border';
					regLbl.style.width = '50px';
					regLbl.style.fontSize = '10px';
					regLbl.style.color = '#aaa';
					const regCheck = document.createElement('input');
					regCheck.type = 'checkbox';
					regCheck.checked = !!overlay.regBorder;
					regCheck.onchange = (e) => { overlay.regBorder = e.target.checked; saveOverlays(); if(window.drawSheetOverlays) window.drawSheetOverlays(); };
					regWrap.appendChild(regLbl);
					regWrap.appendChild(regCheck);
					row.appendChild(regWrap);
				} else if (overlay.type === 'duplex') {
					const mkInp = (lbl, k, v) => {
						const w = createInput(lbl, k, v);
						w.querySelector('input').oninput = (e) => {
							overlay[k] = parseFloat(e.target.value) || 0;
							saveOverlays();
							if(window.drawSheetOverlays) window.drawSheetOverlays();
						};
						return w;
					};
					row.appendChild(mkInp('Size', 'size', overlay.size));
					row.appendChild(mkInp('Thickness', 'thickness', overlay.thickness));
					row.appendChild(mkInp('Pos X', 'x', overlay.x));
					row.appendChild(mkInp('Pos Y', 'y', overlay.y));

				} else if (overlay.type === 'sigmark') {
					const mkInp = (lbl, k, v) => {
						const w = createInput(lbl, k, v);
						w.querySelector('input').oninput = (e) => {
							overlay[k] = parseFloat(e.target.value) || 0;
							saveOverlays();
							if(window.drawSheetOverlays) window.drawSheetOverlays();
						};
						return w;
					};
					row.appendChild(mkInp('Width', 'width', overlay.width));
					row.appendChild(mkInp('Height', 'height', overlay.height));
					row.appendChild(mkInp('Step Y', 'step', overlay.step));
					row.appendChild(mkInp('Offset X', 'x', overlay.x));
					row.appendChild(mkInp('Offset Y', 'y', overlay.y));
					row.appendChild(createCmykInput(overlay));
					
				} else {
					// Square Overlay
					row.appendChild(createInput('Width', 'width', overlay.width));
					row.appendChild(createInput('Height', 'height', overlay.height));
					row.appendChild(createFacingInput(overlay));
					row.appendChild(createInput('Pos X', 'x', overlay.x));
					row.appendChild(createInput('Pos Y', 'y', overlay.y));
					row.appendChild(createCmykInput(overlay));
					row.appendChild(createOpacityInput(overlay));
				}

				overlaysContainer.appendChild(row);
			});
		};

		addBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			window.__overlays.push({ width: 12, height: 12, x: 0, y: 0, cmyk: [0.5, 0, 0.5, 0], opacity: 0.5 });
			saveOverlays();
			renderOverlayInputs();
			if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		};

		addNumBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			let newOverlay = { type: 'numbering', fontSize: 12, x: 5, y: 5, font: 'Helvetica', cmyk: [0, 0, 0, 1], startFrom: 1 };
			const existing = window.__overlays.find(o => o.type === 'numbering');
			if(existing){
				newOverlay = Object.assign({}, existing);
			}
			window.__overlays.push(newOverlay);
			saveOverlays();
			renderOverlayInputs();
			if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		};

		addFileNameBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			window.__overlays.push({ type: 'filename', fontSize: 10, x: 10, y: 10, font: 'Helvetica', cmyk: [0, 0, 0, 1], includeExtension: true });
			saveOverlays();
			renderOverlayInputs();
			if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		};

		addColorBarBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			window.__overlays.push({ type: 'colorbar', cellSize: 5, x: 5, y: 10, vertical: true });
			saveOverlays();
			renderOverlayInputs();
			if(window.drawSheetOverlays) window.drawSheetOverlays();
		};

		addDuplexBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			window.__overlays.push({ type: 'duplex', size: 5, thickness: 0.2, x: 10, y: 10 });
			saveOverlays();
			renderOverlayInputs();
			if(window.drawSheetOverlays) window.drawSheetOverlays();
		};

		addSigMarkBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			const n = parseInt(addSigMarkBtn.dataset.detectedN) || 16;
			window.__overlays.push({ type: 'sigmark', width: 1, height: 2, sigSize: n });
			saveOverlays();
			renderOverlayInputs();
			if(window.drawSheetOverlays) window.drawSheetOverlays();
		};

		// Initial render
		renderOverlayInputs();

		const updateSigMarkBtnState = () => {
			const val = document.getElementById('pageRangeInput')?.value || '';
			const nUpMatch = val.match(/(\d+)-?up/i);
			
			const r = parseInt(document.getElementById('rowsInput')?.value || 1);
			const c = parseInt(document.getElementById('colsInput')?.value || 1);
			const gridN = r * c;
			
			let detectedN = 0;

			if (nUpMatch) {
				detectedN = parseInt(nUpMatch[1]);
				addSigMarkBtn.disabled = false;
				addSigMarkBtn.style.opacity = '1';
				addSigMarkBtn.dataset.detectedN = detectedN;
			} else if (gridN > 1) {
				detectedN = gridN;
				addSigMarkBtn.disabled = false;
				addSigMarkBtn.style.opacity = '1';
				addSigMarkBtn.dataset.detectedN = detectedN;
			} else {
				addSigMarkBtn.disabled = true;
				addSigMarkBtn.style.opacity = '0.5';
			}

			if (detectedN > 0 && window.__overlays) {
				let changed = false;
				window.__overlays.forEach(ov => {
					if (ov.type === 'sigmark' && ov.sigSize !== detectedN) {
						ov.sigSize = detectedN;
						changed = true;
					}
				});
				if (changed) {
					saveOverlays();
					if (ltContentData.style.display === 'block') {
						renderOverlayInputs();
					}
					if(window.drawSheetOverlays) window.drawSheetOverlays();
				}
			}
		};
		
		const prInput = document.getElementById('pageRangeInput');
		if(prInput) prInput.addEventListener('input', updateSigMarkBtnState);
		
		const rInput = document.getElementById('rowsInput');
		const cInput = document.getElementById('colsInput');
		if(rInput) rInput.addEventListener('input', updateSigMarkBtnState);
		if(cInput) cInput.addEventListener('input', updateSigMarkBtnState);

		setTimeout(updateSigMarkBtnState, 500);
	}

	// wire UI: Right Toolbar Tabs
	if (window.initStylesTab) window.initStylesTab();

	const rtTabTransform = document.getElementById('rtTabTransform');
	const rtTabLayout = document.getElementById('rtTabLayout');
	const rtTabStyles = document.getElementById('rtTabStyles');
	const rtContentTransform = document.getElementById('rtContentTransform');
	const rtContentLayout = document.getElementById('rtContentLayout');
	const rtContentStyles = document.getElementById('rtContentStyles');

	if(rtTabTransform && rtTabLayout && rtContentTransform && rtContentLayout){
		const tabs = [
			{ btn: rtTabTransform, content: rtContentTransform },
			{ btn: rtTabLayout, content: rtContentLayout },
			{ btn: rtTabStyles, content: rtContentStyles }
		];

		const setActive = (activeBtn) => {
			tabs.forEach(t => {
				if(!t.btn || !t.content) return;
				if(t.btn === activeBtn){
					t.btn.style.borderBottomColor = '#00bcd4';
					t.btn.style.color = '#fff';
					t.content.style.display = 'block';
				} else {
					t.btn.style.borderBottomColor = 'transparent';
					t.btn.style.color = '#888';
					t.content.style.display = 'none';
				}
			});
		};

		rtTabTransform.addEventListener('click', () => setActive(rtTabTransform));
		rtTabLayout.addEventListener('click', () => setActive(rtTabLayout));
		if(rtTabStyles) rtTabStyles.addEventListener('click', () => setActive(rtTabStyles));
	}

	// wire UI: n-up Tools Dropdown
	const nupToolsBtn = document.getElementById('nupToolsBtn');
	const nupToolsDropdown = document.getElementById('nupToolsDropdown');
	if(nupToolsBtn && nupToolsDropdown){
		nupToolsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isVisible = nupToolsDropdown.style.display === 'flex';
			nupToolsDropdown.style.display = isVisible ? 'none' : 'flex';
		});
		nupToolsDropdown.querySelectorAll('button').forEach(btn => {
			btn.addEventListener('click', (e) => updateRange(e, btn.textContent.trim()));
		});
		document.addEventListener('click', () => { nupToolsDropdown.style.display = 'none'; });
	}

	// wire UI: Sheet Zoom & Fit
	const fitSheetBtn = document.getElementById('fitSheetBtn');
	if(fitSheetBtn) fitSheetBtn.addEventListener('click', () => window.fitSheetsToWorkspace());

	const sheetZoomSlider = document.getElementById('sheetZoomSlider');
	if(sheetZoomSlider){
		sheetZoomSlider.addEventListener('input', () => {
			const v = parseInt(sheetZoomSlider.value) || 100;
			if(window.fitSheetsToWorkspace) window.fitSheetsToWorkspace(v / 100);
		});
	}

	// wire UI: rotation input -> adjustContentRotation
	if(rotationInput){
		rotationInput.addEventListener('input', ()=>{
			// Allow typing '-' without resetting to 0 immediately
			if(rotationInput.value === '-' || rotationInput.value === '') return;
			const v = parseFloat(rotationInput.value);
			if(isNaN(v)) return;
			if(rotationSlider) rotationSlider.value = (v % 360 > 180) ? (v % 360 - 360) : (v % 360);
			
			const pageNums = (rotPageCheck && rotPageCheck.checked) ? parsePageRange(rotPageNum.value) : null;
			window.adjustContentRotation(v%360, pageNums);
		});
		// Normalize value on blur (when user leaves the field)
		rotationInput.addEventListener('blur', ()=>{
			const v = parseFloat(rotationInput.value) || 0;
			rotationInput.value = (v % 360).toString();
		});
		rotationInput.addEventListener('keydown', handleStep);
		rotationInput.addEventListener('keyup', handleStep);
		rotationInput.addEventListener('mousedown', handleStep);
	}

	// wire UI: rotation slider
	if(rotationSlider){
		rotationSlider.addEventListener('input', ()=>{
			const v = parseFloat(rotationSlider.value) || 0;
			if(rotationInput) rotationInput.value = v;
			const pageNums = (rotPageCheck && rotPageCheck.checked) ? parsePageRange(rotPageNum.value) : null;
			window.adjustContentRotation(v, pageNums);
		});
	}

	// wire UI: rotation page check
	if(rotPageCheck){
		rotPageCheck.addEventListener('change', ()=>{
			rotPageNum.style.display = rotPageCheck.checked ? 'inline-block' : 'none';
			syncUI();
		});
		rotPageNum.addEventListener('input', ()=>{
			syncUI();
		});
	}

	// wire UI: fit/fill/stretch image buttons
	const fillImageBtn = document.getElementById('fillImageBtn');
	const stretchImageBtn = document.getElementById('stretchImageBtn');

	if(fitImageBtn){
		fitImageBtn.addEventListener('click', () => window.applyFitToSelection('fit'));
	}

	if(fillImageBtn){
		fillImageBtn.addEventListener('click', () => window.applyFitToSelection('fill'));
	}

	if(stretchImageBtn){
		stretchImageBtn.addEventListener('click', () => window.applyFitToSelection('stretch'));
	}

	// wire UI: scale slider -> adjustContentScale
	if(scaleSlider){
		scaleSlider.addEventListener('input', ()=>{
			const pct = parseInt(scaleSlider.value) || 100;
			if(scaleValue) scaleValue.textContent = pct + '%';
			const s = pct/100;
			
			const pageNums = (scalePageCheck && scalePageCheck.checked) ? parsePageRange(scalePageNum.value) : null;
			window.adjustContentScale(s, s, pageNums);
		});
	}

	// wire UI: scale page check
	if(scalePageCheck){
		scalePageCheck.addEventListener('change', ()=>{
			scalePageNum.style.display = scalePageCheck.checked ? 'inline-block' : 'none';
			syncUI();
		});
		scalePageNum.addEventListener('input', ()=>{
			syncUI();
		});
	}

	// wire UI: width/height inputs
	const wIn = document.getElementById('widthInput');
	const hIn = document.getElementById('heightInput');
	function updateScaleFromMm(val, isWidth){
		if(!isFinite(val) || val <= 0) return;
		if(!window.__fileWidthMm || !window.__fileHeightMm) return;
		const base = isWidth ? window.__fileWidthMm : window.__fileHeightMm;
		if(!base) return;
		const newScale = val / base;

		const isSpecific = scalePageCheck && scalePageCheck.checked;
		const pageNums = isSpecific ? parsePageRange(scalePageNum.value) : [];
		const isUnlocked = (typeof unlockRatioCheckbox !== 'undefined' && unlockRatioCheckbox && unlockRatioCheckbox.checked);

		if(isWidth){
			// If unlocked, update X only. If locked, update both to maintain aspect ratio.
			if(isUnlocked) window.adjustContentScale(newScale, undefined, isSpecific ? pageNums : null);
			else window.adjustContentScale(newScale, newScale, isSpecific ? pageNums : null);
		} else {
			// If unlocked, update Y only. If locked, update both.
			if(isUnlocked) window.adjustContentScale(undefined, newScale, isSpecific ? pageNums : null);
			else window.adjustContentScale(newScale, newScale, isSpecific ? pageNums : null);
		}
	}
	if(wIn) {
		wIn.addEventListener('input', ()=> updateScaleFromMm(parseFloat(wIn.value), true));
		wIn.addEventListener('keydown', handleStep);
		wIn.addEventListener('keyup', handleStep);
		wIn.addEventListener('mousedown', handleStep);
	}
	if(hIn) {
		hIn.addEventListener('input', ()=> updateScaleFromMm(parseFloat(hIn.value), false));
		hIn.addEventListener('keydown', handleStep);
		hIn.addEventListener('keyup', handleStep);
		hIn.addEventListener('mousedown', handleStep);
	}

	// wire UI: dpi input -> adjustPlacedPdfDpi
	const dpiInput = document.getElementById('dpiInput');
	if(dpiInput){
		dpiInput.addEventListener('input', ()=>{
			const v = parseInt(dpiInput.value,10) || 96;
			window.adjustPlacedPdfDpi(v);
		});
	}

	// wire UI: native checkbox
	if(nativeCheckbox){
		nativeCheckbox.addEventListener('change', ()=>{
			window.__renderNative = nativeCheckbox.checked;
			if(dpiInput) dpiInput.disabled = window.__renderNative;
			// re-render
			window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		});
	}

	// wire UI: offset inputs
	if(offsetXInput){
		offsetXInput.addEventListener('input', ()=>{
			const pxPerMm = 96 / 25.4;
			const x = (parseFloat(offsetXInput.value) || 0) * pxPerMm;
			const pageNums = (offsetPageCheck && offsetPageCheck.checked) ? parsePageRange(offsetPageNum.value) : null;
			if(offsetXSlider) offsetXSlider.value = parseFloat(offsetXInput.value) || 0;
			window.adjustContentOffset(x, undefined, pageNums);
		});
		offsetXInput.addEventListener('mousedown', handleStep);
	}
	if(offsetYInput){
		offsetYInput.addEventListener('input', ()=>{
			const pxPerMm = 96 / 25.4;
			const y = (parseFloat(offsetYInput.value) || 0) * pxPerMm;
			const pageNums = (offsetPageCheck && offsetPageCheck.checked) ? parsePageRange(offsetPageNum.value) : null;
			if(offsetYSlider) offsetYSlider.value = parseFloat(offsetYInput.value) || 0;
			window.adjustContentOffset(undefined, y, pageNums);
		});
		offsetYInput.addEventListener('mousedown', handleStep);
	}

	// wire UI: slot size inputs
	const slotWIn = document.getElementById('slotWidthInput');
	const slotHIn = document.getElementById('slotHeightInput');
	if(slotWIn){
		slotWIn.addEventListener('input', window.updateSlotSizeFromInputs);
		slotWIn.addEventListener('mousedown', handleStep);
	}
	if(slotHIn){
		slotHIn.addEventListener('input', window.updateSlotSizeFromInputs);
		slotHIn.addEventListener('mousedown', handleStep);
	}

	// wire UI: offset sliders
	if(offsetXSlider){
		offsetXSlider.addEventListener('input', ()=>{
			const v = parseFloat(offsetXSlider.value) || 0;
			if(offsetXInput) offsetXInput.value = v;
			const pxPerMm = 96 / 25.4;
			const pageNums = (offsetPageCheck && offsetPageCheck.checked) ? parsePageRange(offsetPageNum.value) : null;
			window.adjustContentOffset(v * pxPerMm, undefined, pageNums);
		});
	}
	if(offsetYSlider){
		offsetYSlider.addEventListener('input', ()=>{
			const v = parseFloat(offsetYSlider.value) || 0;
			if(offsetYInput) offsetYInput.value = v;
			const pxPerMm = 96 / 25.4;
			const pageNums = (offsetPageCheck && offsetPageCheck.checked) ? parsePageRange(offsetPageNum.value) : null;
			window.adjustContentOffset(undefined, v * pxPerMm, pageNums);
		});
	}

	// wire UI: offset page check
	if(offsetPageCheck){
		offsetPageCheck.addEventListener('change', ()=>{
			offsetPageNum.style.display = offsetPageCheck.checked ? 'inline-block' : 'none';
			syncUI();
		});
		offsetPageNum.addEventListener('input', ()=>{
			syncUI();
		});
	}

	// wire UI: box position inputs
	if(boxXInput){
		boxXInput.addEventListener('input', ()=>{
			const pxPerMm = 96 / 25.4;
			const x = (parseFloat(boxXInput.value) || 0) * pxPerMm;
			const pageNums = (slotPageCheck && slotPageCheck.checked) ? parsePageRange(slotPageNum.value) : null;
			window.adjustSlotPosition(x, undefined, pageNums);
		});
		boxXInput.addEventListener('mousedown', handleStep);
	}
	if(boxYInput){
		boxYInput.addEventListener('input', ()=>{
			const pxPerMm = 96 / 25.4;
			const y = (parseFloat(boxYInput.value) || 0) * pxPerMm;
			const pageNums = (slotPageCheck && slotPageCheck.checked) ? parsePageRange(slotPageNum.value) : null;
			window.adjustSlotPosition(undefined, y, pageNums);
		});
		boxYInput.addEventListener('mousedown', handleStep);

		// Inject Duplex Mirror Checkbox
		const duplexLabel = document.createElement('label');
		duplexLabel.style.marginLeft = '8px';
		duplexLabel.style.fontSize = '10px';
		duplexLabel.style.display = 'inline-flex';
		duplexLabel.style.alignItems = 'center';
		duplexLabel.style.color = '#aaa';
		duplexLabel.title = "Mirror X position on even sheets (back sides)";
		
		const duplexCheck = document.createElement('input');
		duplexCheck.type = 'checkbox';
		duplexCheck.id = 'gridDuplexCheck';
		duplexCheck.style.marginRight = '4px';
		
		duplexLabel.appendChild(duplexCheck);
		duplexLabel.appendChild(document.createTextNode('Mirror Even'));
		
		if(boxYInput.parentNode) boxYInput.parentNode.appendChild(duplexLabel);

		duplexCheck.addEventListener('change', () => {
			window.__gridDuplexMirror = duplexCheck.checked;
			const pxPerMm = 96 / 25.4;
			const x = (parseFloat(boxXInput.value) || 0) * pxPerMm;
			const y = (parseFloat(boxYInput.value) || 0) * pxPerMm;
			window.adjustSlotPosition(x, y);
		});
	}

	// wire UI: preview page check
	if(slotPageCheck){
		slotPageCheck.addEventListener('change', ()=>{
			slotPageNum.style.display = slotPageCheck.checked ? 'inline-block' : 'none';
			syncUI();
		});
		slotPageNum.addEventListener('input', ()=>{
			syncUI();
		});
	}

	// wire UI: grid inputs
	const updateGrid = () => {
		const r = parseInt(rowsInput.value) || 1;
		const c = parseInt(colsInput.value) || 1;
		if(window.generatePreviewGrid) window.generatePreviewGrid(r, c);
		// Re-render content
		const rot = window.__currentRotation || 0;
		if(window.renderPages) window.renderPages(rot, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		if(window.fitSheetsToWorkspace) window.fitSheetsToWorkspace();
	};

	if(rowsInput){
		rowsInput.addEventListener('input', updateGrid);
		rowsInput.addEventListener('mousedown', handleStep);
	}
	if(colsInput){
		colsInput.addEventListener('input', updateGrid);
		colsInput.addEventListener('mousedown', handleStep);
	}

	// wire UI: skew inputs
	if(skewXInput){
		skewXInput.addEventListener('input', ()=>{
			const x = parseFloat(skewXInput.value) || 0;
			const pageNums = (skewPageCheck && skewPageCheck.checked) ? parsePageRange(skewPageNum.value) : null;
			if(skewXSlider) skewXSlider.value = x;
			window.adjustContentSkew(x, undefined, pageNums); // undefined lets layout use existing Y
		});
		skewXInput.addEventListener('mousedown', handleStep);
	}
	if(skewYInput){
		skewYInput.addEventListener('input', ()=>{
			const y = parseFloat(skewYInput.value) || 0;
			const pageNums = (skewPageCheck && skewPageCheck.checked) ? parsePageRange(skewPageNum.value) : null;
			if(skewYSlider) skewYSlider.value = y;
			window.adjustContentSkew(undefined, y, pageNums); // undefined lets layout use existing X
		});
		skewYInput.addEventListener('mousedown', handleStep);
	}

	// wire UI: skew sliders
	if(skewXSlider){
		skewXSlider.addEventListener('input', ()=>{
			const v = parseFloat(skewXSlider.value) || 0;
			if(skewXInput) skewXInput.value = v;
			const pageNums = (skewPageCheck && skewPageCheck.checked) ? parsePageRange(skewPageNum.value) : null;
			window.adjustContentSkew(v, undefined, pageNums);
		});
	}
	if(skewYSlider){
		skewYSlider.addEventListener('input', ()=>{
			const v = parseFloat(skewYSlider.value) || 0;
			if(skewYInput) skewYInput.value = v;
			const pageNums = (skewPageCheck && skewPageCheck.checked) ? parsePageRange(skewPageNum.value) : null;
			window.adjustContentSkew(undefined, v, pageNums);
		});
	}

	// wire UI: skew page check
	if(skewPageCheck){
		skewPageCheck.addEventListener('change', ()=>{
			skewPageNum.style.display = skewPageCheck.checked ? 'inline-block' : 'none';
			syncUI();
		});
		skewPageNum.addEventListener('input', ()=>{
			syncUI();
		});
	}

	// wire UI: Print button
	const triggerBrowserPrint = async () => {
		// If in native mode, switch to canvas for printing to ensure all pages/boxes render correctly
		if(window.__renderNative){
			const wasNative = true;
			window.__renderNative = false;
			// Re-render and wait for it to finish
			const rot = window.__currentRotation || 0;
			if(window.renderPages) {
				try {
					await window.renderPages(rot, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
				} catch(e){ console.error(e); }
			}
			
			// Give browser a moment to paint the canvases before printing
			setTimeout(()=>{
				window.print();
				
				// Restore state after print dialog closes (or after delay)
				setTimeout(()=>{
					window.__renderNative = wasNative;
					if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
				}, 50);
			}, 50);
		} else {
			window.print();
		}
	};

	const printBtn = document.getElementById('printBtn');
	if(printBtn){
		printBtn.addEventListener('click', async ()=>{
			if(window.generateImposedPdf){
				window.generateImposedPdf();
			}
		});
	}

	const savePreviewBtn = document.getElementById('savePreviewBtn');
	if(savePreviewBtn){
		savePreviewBtn.addEventListener('click', triggerBrowserPrint);
	}

	// wire UI: crop marks
	const refreshCrops = () => { 
		if(window.drawSheetCropMarks) window.drawSheetCropMarks(); 
		if(window.updateStatusSlotInfo) window.updateStatusSlotInfo();
	};
	['markGapXInput', 'markGapYInput', 'cropBleedXInput', 'cropBleedYInput', 'innerCropBleedXInput', 'innerCropBleedYInput', 'innerCropStyleSelect'].forEach(id => {
		const el = document.getElementById(id);
		if(el){
			el.addEventListener('input', refreshCrops);
			el.addEventListener('mousedown', handleStep);
		}
	});
	const showCropMarksCheck = document.getElementById('showCropMarksCheck');
	if(showCropMarksCheck){
		showCropMarksCheck.addEventListener('change', refreshCrops);
	}

	// wire UI: Activity Bar Tools
	const toolIds = ['toolSelectBtn', 'toolSwapBtn', 'toolRotateBtn', 'toolScaleBtn', 'toolSkewBtn'];
	let activeToolId = null;

	const toolCheckboxes = {
		'toolSelectBtn': 'offsetPageCheck',
		'toolRotateBtn': 'rotPageCheck',
		'toolScaleBtn': 'scalePageCheck',
		'toolSkewBtn': 'skewPageCheck'
	};

	toolIds.forEach(id => {
		const btn = document.getElementById(id);
		if(btn){
			btn.addEventListener('click', () => {
				const wasActive = btn.classList.contains('active');
				toolIds.forEach(t => document.getElementById(t)?.classList.remove('active'));
				
				if(wasActive){
					activeToolId = null;
				} else {
					btn.classList.add('active');
					activeToolId = id;

					// Auto-check the corresponding "Specific Page" checkbox
					const cbId = toolCheckboxes[id];
					if(cbId){
						const cb = document.getElementById(cbId);
						if(cb && !cb.checked){
							cb.checked = true;
							cb.dispatchEvent(new Event('change'));
						}
					}
				}
			});
		}
	});

	// wire UI: Drag-to-move content with Select tool
	const workspace = document.querySelector('.workspace');
	if (workspace) {
		const dragState = {
			active: false,
			isDragging: false,
			startX: 0,
			startY: 0,
			initialOffsetX: 0,
			initialOffsetY: 0,
			initialRotation: 0,
			initialScaleX: 1,
			initialScaleY: 1,
			initialSkewX: 0,
			initialSkewY: 0,
			pageNum: null,
		};

		const handleDragMove = (e) => {
			if (!dragState.active) return;
			e.preventDefault();

			const dx = e.clientX - dragState.startX;
			const dy = e.clientY - dragState.startY;

			if (!dragState.isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
				dragState.isDragging = true;
			}

			if (dragState.isDragging) {
				if (activeToolId === 'toolSelectBtn') {
					// Move
					const newOffsetX = dragState.initialOffsetX + dx;
					const newOffsetY = dragState.initialOffsetY + dy;
					window.adjustContentOffset(newOffsetX, newOffsetY, [dragState.pageNum]);
				} else if (activeToolId === 'toolRotateBtn') {
					// Rotate (dx controls rotation)
					const deltaRot = dx * 0.5;
					const newRot = dragState.initialRotation + deltaRot;
					window.adjustContentRotation(newRot, [dragState.pageNum]);
				} else if (activeToolId === 'toolScaleBtn') {
					// Scale (dx controls uniform scale)
					// Drag right to increase, left to decrease
					const factor = 1 + (dx * 0.005);
					const newSX = dragState.initialScaleX * factor;
					const newSY = dragState.initialScaleY * factor;
					window.adjustContentScale(newSX, newSY, [dragState.pageNum]);
				} else if (activeToolId === 'toolSkewBtn') {
					// Skew (dx -> skewX, dy -> skewY)
					const newSkewX = dragState.initialSkewX + (dx * 0.5);
					const newSkewY = dragState.initialSkewY + (dy * 0.5);
					window.adjustContentSkew(newSkewX, newSkewY, [dragState.pageNum]);
				}
			}
		};

		const handleDragEnd = (e) => {
			if (!dragState.active) return;
			e.preventDefault();
			
			document.removeEventListener('mousemove', handleDragMove);
			document.removeEventListener('mouseup', handleDragEnd);

			dragState.active = false;
			dragState.isDragging = false;
		};

		workspace.addEventListener('mousedown', (e) => {
			const previewEl = e.target.closest('.preview');
			if (!previewEl) return;

			const allPreviews = Array.from(document.getElementsByClassName('preview'));
			const previewIndex = allPreviews.indexOf(previewEl);
			if (previewIndex === -1) return;

			const pagesToRender = (window.parsePageOrder && window.parsePageOrder(pageRangeInput.value)) || [];
			if (previewIndex >= pagesToRender.length) return;

			const pageNum = pagesToRender[previewIndex];
			const t = (window.__pageTransforms && window.__pageTransforms[pageNum]) || {};

			Object.assign(dragState, { 
				active: true, 
				isDragging: false, 
				pageNum, 
				startX: e.clientX, 
				startY: e.clientY, 
				initialOffsetX: (typeof t.offsetX === 'number') ? t.offsetX : (window.__offsetX || 0), 
				initialOffsetY: (typeof t.offsetY === 'number') ? t.offsetY : (window.__offsetY || 0),
				initialRotation: (typeof t.rotation === 'number') ? t.rotation : (window.__currentRotation || 0),
				initialScaleX: (typeof t.scaleX === 'number') ? t.scaleX : (window.__currentScaleX || 1),
				initialScaleY: (typeof t.scaleY === 'number') ? t.scaleY : (window.__currentScaleY || 1),
				initialSkewX: (typeof t.skewX === 'number') ? t.skewX : (window.__skewX || 0),
				initialSkewY: (typeof t.skewY === 'number') ? t.skewY : (window.__skewY || 0)
			});

			document.addEventListener('mousemove', handleDragMove);
			document.addEventListener('mouseup', handleDragEnd);
		});
	}

	// wire UI: View Mode (Page Numbers)
	const toolNumbersBtn = document.getElementById('pageNumbersBtn');
	if(toolNumbersBtn){
		toolNumbersBtn.addEventListener('click', () => {
			toolNumbersBtn.classList.toggle('active');
			window.__showPageNumbers = toolNumbersBtn.classList.contains('active');
			if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		});
	}

	// wire UI: Paper Format & Orientation
	const paperSelect = document.getElementById('paperSelect');
	const sheetWidthInput = document.getElementById('sheetWidthInput');
	const sheetHeightInput = document.getElementById('sheetHeightInput');
	const savePaperBtn = document.getElementById('savePaperBtn');
	const deletePaperBtn = document.getElementById('deletePaperBtn');
	const orientPortraitBtn = document.getElementById('orientPortraitBtn');
	const orientLandscapeBtn = document.getElementById('orientLandscapeBtn');
	
	// Load custom formats
	const loadCustomPapers = () => {
		if(!paperSelect) return;
		const custom = JSON.parse(localStorage.getItem('pdf_paper_formats') || '{}');
		Array.from(paperSelect.options).forEach(opt => { if(opt.dataset.isCustom) opt.remove(); });
		Object.keys(custom).forEach(name => {
			const opt = document.createElement('option');
			opt.value = custom[name].join(',');
			opt.textContent = name;
			opt.dataset.isCustom = 'true';
			paperSelect.appendChild(opt);
		});
	};
	if(paperSelect) loadCustomPapers();

	// Helper: Sync inputs from selection
	const setInputsFromSelection = () => {
		if(!paperSelect || !sheetWidthInput || !sheetHeightInput) return;
		const val = paperSelect.value;
		if(!val) return;
		let [w, h] = val.split(',').map(Number);
		
		// Respect current orientation button state if possible
		const isLandscape = orientLandscapeBtn && orientLandscapeBtn.classList.contains('active');
		if(isLandscape && w < h) { const t = w; w = h; h = t; }
		else if(!isLandscape && w > h) { const t = w; w = h; h = t; }
		
		sheetWidthInput.value = w;
		sheetHeightInput.value = h;
		window.updateSheetSize();
	};

	window.updateSheetSize = () => {
		let sheetW = 320, sheetH = 450;
		if(sheetWidthInput && sheetHeightInput){
			sheetW = parseFloat(sheetWidthInput.value) || 0;
			sheetH = parseFloat(sheetHeightInput.value) || 0;
		} else if(paperSelect){
			const [w, h] = paperSelect.value.split(',').map(Number);
			sheetW = w; sheetH = h;
		}
		
		if(sheetW <= 0 || sheetH <= 0) return;

		const sheets = document.querySelectorAll('.page');
		sheets.forEach(sheet => {
			sheet.style.width = sheetW + 'mm';
			sheet.style.height = sheetH + 'mm';
		});
		
		// Update orientation buttons state
		if(orientPortraitBtn && orientLandscapeBtn) {
			if(sheetW <= sheetH){
				orientPortraitBtn.classList.add('active');
				orientLandscapeBtn.classList.remove('active');
			} else {
				orientPortraitBtn.classList.remove('active');
				orientLandscapeBtn.classList.add('active');
			}
		}

		// Recalculate grid fit
		const autoGridCheck = document.getElementById('autoGridCheck');
		const allowAutoFit = autoGridCheck ? autoGridCheck.checked : (!document.getElementById('layoutSelect') || document.getElementById('layoutSelect').value === 'Default');
		
		if(allowAutoFit && window.calculateGridFit && window.__trimW && window.__trimH){
			const fit = window.calculateGridFit(window.__trimW, window.__trimH);
			const rInput = document.getElementById('rowsInput');
			const cInput = document.getElementById('colsInput');
			if(rInput) rInput.value = fit.rows;
			if(cInput) cInput.value = fit.cols;
		}

		// Re-generate grid and re-render
		const r = parseInt(document.getElementById('rowsInput')?.value || 1);
		const c = parseInt(document.getElementById('colsInput')?.value || 1);
		if(window.generatePreviewGrid) window.generatePreviewGrid(r, c);
		if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		
		// Fit to workspace
		if(window.fitSheetsToWorkspace) window.fitSheetsToWorkspace();
	};

	const autoGridCheck = document.getElementById('autoGridCheck');
	if(autoGridCheck){
		autoGridCheck.addEventListener('change', window.updateSheetSize);
	}

	if(paperSelect){
		paperSelect.addEventListener('change', setInputsFromSelection);
	}
	if(sheetWidthInput) sheetWidthInput.addEventListener('change', window.updateSheetSize);
	if(sheetHeightInput) sheetHeightInput.addEventListener('change', window.updateSheetSize);

	if(savePaperBtn){
		savePaperBtn.addEventListener('click', () => {
			const w = parseFloat(sheetWidthInput.value);
			const h = parseFloat(sheetHeightInput.value);
			if(!w || !h) return;
			const name = prompt('Format Name:');
			if(!name) return;
			const custom = JSON.parse(localStorage.getItem('pdf_paper_formats') || '{}');
			custom[name] = [w, h];
			localStorage.setItem('pdf_paper_formats', JSON.stringify(custom));
			loadCustomPapers();
			Array.from(paperSelect.options).forEach(opt => { if(opt.textContent === name) paperSelect.value = opt.value; });
		});
	}

	if(deletePaperBtn){
		deletePaperBtn.addEventListener('click', () => {
			const opt = paperSelect.selectedOptions[0];
			if(!opt || !opt.dataset.isCustom) { alert('Cannot delete standard formats.'); return; }
			if(confirm(`Delete format "${opt.textContent}"?`)){
				const custom = JSON.parse(localStorage.getItem('pdf_paper_formats') || '{}');
				delete custom[opt.textContent];
				localStorage.setItem('pdf_paper_formats', JSON.stringify(custom));
				loadCustomPapers();
				paperSelect.selectedIndex = 0;
				setInputsFromSelection();
			}
		});
	}

	const setOrientation = (isLandscape) => {
		const w = parseFloat(sheetWidthInput.value);
		const h = parseFloat(sheetHeightInput.value);
		if(!w || !h) return;
		
		if(isLandscape && w < h) {
			sheetWidthInput.value = h;
			sheetHeightInput.value = w;
			window.updateSheetSize();
		} else if(!isLandscape && w > h) {
			sheetWidthInput.value = h;
			sheetHeightInput.value = w;
			window.updateSheetSize();
		}
	};

	if(orientPortraitBtn) orientPortraitBtn.addEventListener('click', () => setOrientation(false));
	if(orientLandscapeBtn) orientLandscapeBtn.addEventListener('click', () => setOrientation(true));

	// wire UI: Frame Background CMYK
	const bgCSlider = document.getElementById('bgCSlider');
	const bgMSlider = document.getElementById('bgMSlider');
	const bgYSlider = document.getElementById('bgYSlider');
	const bgKSlider = document.getElementById('bgKSlider');
	const bgTransparentCheckbox = document.getElementById('bgTransparentCheckbox');

	const updateFrameBg = () => {
		const isTransparent = bgTransparentCheckbox && bgTransparentCheckbox.checked;

		if(isTransparent){
			window.__frameBgCMYK = [0, 0, 0, 0];
			window.__frameBgString = 'transparent';
			[bgCSlider, bgMSlider, bgYSlider, bgKSlider].forEach(el => { if(el) el.disabled = true; });
		} else {
			[bgCSlider, bgMSlider, bgYSlider, bgKSlider].forEach(el => { if(el) el.disabled = false; });
			
			const c = (parseInt(bgCSlider?.value)||0) / 100;
			const m = (parseInt(bgMSlider?.value)||0) / 100;
			const y = (parseInt(bgYSlider?.value)||0) / 100;
			const k = (parseInt(bgKSlider?.value)||0) / 100;
			
			window.__frameBgCMYK = [c, m, y, k];
			
			// CMYK to RGB (Simulated Print)
			// Adjust pure mathematical conversion to simulate ink impurities (less neon)
			// Cyan absorbs some Green/Blue; Magenta absorbs some Blue/Red.
			const r = Math.round(255 * (1-c) * (1-k) * (1 - m * 0.1));
			const g = Math.round(255 * (1-m) * (1-k) * (1 - c * 0.3));
			const b = Math.round(255 * (1-y) * (1-k) * (1 - c * 0.1 - m * 0.45));
			
			window.__frameBgString = `rgb(${r},${g},${b})`;
		}
		
		document.querySelectorAll('.preview').forEach(el => {
			el.style.backgroundColor = window.__frameBgString;
		});
	};

	[bgCSlider, bgMSlider, bgYSlider, bgKSlider].forEach(el => {
		if(el) el.addEventListener('input', updateFrameBg);
	});
	if(bgTransparentCheckbox) bgTransparentCheckbox.addEventListener('change', updateFrameBg);

	// Initialize sheet size on load
	if(paperSelect) setInputsFromSelection();
	if(bgTransparentCheckbox) updateFrameBg();

	window.addEventListener('resize', () => {
		if(window.fitSheetsToWorkspace) window.fitSheetsToWorkspace();
	});

	// Status Bar Mouse Tracker
	document.addEventListener('mousemove', (e) => {
		const statusInfo = document.getElementById('statusInfo');
		if(!statusInfo) return;

		const page = e.target.closest('.page');
		if(page){
			const rect = page.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			
			const physW = parseFloat(page.style.width) || 0;
			const physH = parseFloat(page.style.height) || 0;
			
			if(physW > 0 && physH > 0){
				const mmX = (x / rect.width) * physW;
				const mmY = (y / rect.height) * physH;
				statusInfo.textContent = `X: ${mmX.toFixed(1)} mm  Y: ${mmY.toFixed(1)} mm`;
			}
		} else {
			statusInfo.textContent = `Screen X: ${e.clientX} Y: ${e.clientY}`;
		}
	});

	// wire UI: ICC Profile (Simulated via CSS Filter)
	const labLSlider = document.getElementById('labLSlider');
	const labASlider = document.getElementById('labASlider');
	const labBSlider = document.getElementById('labBSlider');
	const labMatrix = document.getElementById('cielab-matrix');
	
	const contrastSlider = document.getElementById('contrastSlider');
	const saturationSlider = document.getElementById('saturationSlider');
	
	const curveChannelSelect = document.getElementById('curveChannelSelect');
	const curveShadowSlider = document.getElementById('curveShadowSlider');
	const curveMidSlider = document.getElementById('curveMidSlider');
	const curveHighSlider = document.getElementById('curveHighSlider');
	const resetCurvesBtn = document.getElementById('resetCurvesBtn');
	const resetLabBtn = document.getElementById('resetLabBtn');
	const resetContrastSatBtn = document.getElementById('resetContrastSatBtn');
	
	// Curve State: [25%, 50%, 75%] values (0-100) for R, G, B
	const curveState = {
		r: [25, 50, 75],
		g: [25, 50, 75],
		b: [25, 50, 75]
	};

	const iccProfileSelect = document.getElementById('iccProfileSelect');
	if(iccProfileSelect){
		// Custom Profiles
		const customProfiles = JSON.parse(localStorage.getItem('pdf_color_profiles') || '{}');
		const loadCustomProfiles = () => {
			Array.from(iccProfileSelect.options).forEach(opt => { if(opt.dataset.isCustom) opt.remove(); });
			Object.keys(customProfiles).forEach(name => {
				const opt = document.createElement('option');
				opt.value = 'custom:' + name;
				opt.textContent = name;
				opt.dataset.isCustom = 'true';
				iccProfileSelect.appendChild(opt);
			});
		};
		loadCustomProfiles();

		// Save Button
		const saveProfileBtn = document.getElementById('saveProfileBtn');
		if(saveProfileBtn){
			saveProfileBtn.addEventListener('click', () => {
				const name = prompt('Profile Name:');
				if(!name) return;
				const p = {
					lab: { l: parseFloat(labLSlider?.value||0), a: parseFloat(labASlider?.value||0), b: parseFloat(labBSlider?.value||0) },
					contrast: parseFloat(contrastSlider?.value||100),
					saturation: parseFloat(saturationSlider?.value||100),
					curves: JSON.parse(JSON.stringify(curveState))
				};
				customProfiles[name] = p;
				localStorage.setItem('pdf_color_profiles', JSON.stringify(customProfiles));
				loadCustomProfiles();
				iccProfileSelect.value = 'custom:' + name;
			});
		}

		// Delete Button
		const deleteProfileBtn = document.getElementById('deleteProfileBtn');
		if(deleteProfileBtn){
			deleteProfileBtn.addEventListener('click', () => {
				const val = iccProfileSelect.value;
				if(val.startsWith('custom:')){
					const name = val.substring(7);
					if(confirm('Delete profile "' + name + '"?')){
						delete customProfiles[name];
						localStorage.setItem('pdf_color_profiles', JSON.stringify(customProfiles));
						loadCustomProfiles();
						iccProfileSelect.value = '';
						iccProfileSelect.dispatchEvent(new Event('change'));
					}
				}
			});
		}

		iccProfileSelect.addEventListener('change', ()=>{
			const val = iccProfileSelect.value;
			
			if(val.startsWith('custom:')){
				const name = val.substring(7);
				const p = customProfiles[name];
				if(p){
					if(labLSlider) labLSlider.value = p.lab.l;
					if(labASlider) labASlider.value = p.lab.a;
					if(labBSlider) labBSlider.value = p.lab.b;
					if(contrastSlider) contrastSlider.value = p.contrast;
					if(saturationSlider) saturationSlider.value = p.saturation;
					if(p.curves){
						curveState.r = p.curves.r;
						curveState.g = p.curves.g;
						curveState.b = p.curves.b;
					}
					updateCurveSVG();
					updateCurveSlidersUI();
					updateVisualFilters();
					iccProfileSelect.value = val;
				}
				return;
			}

			let filter = '';
			if(val === 'grayscale') filter = 'grayscale(100%)';
			else if(val === 'sepia') filter = 'sepia(100%)';
			else if(val === 'invert') filter = 'invert(100%)';
			else if(val === 'fix-cmyk') filter = 'saturate(1.25) contrast(1.1)';
			else if(val === 'sim-print') filter = 'brightness(0.95) contrast(0.9) saturate(0.9)';
			else if(val === 'sim-gloss') filter = 'contrast(1.1) saturate(1.1) brightness(1.05)';
			else if(val === 'adobe-rgb') filter = 'saturate(1.1)';
			else if(val === 'apple-rgb') filter = 'brightness(1.1) contrast(0.95)';
			
			window.__previewProfileFilter = filter;
			
			// Reset LAB sliders when a preset is chosen
			if(labLSlider) labLSlider.value = 0;
			if(labASlider) labASlider.value = 0;
			if(labBSlider) labBSlider.value = 0;
			if(labMatrix) labMatrix.setAttribute('values', '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0');

			// Reset Contrast/Sat
			if(contrastSlider) contrastSlider.value = 100;
			if(saturationSlider) saturationSlider.value = 100;
			
			// Reset Curves
			['r','g','b'].forEach(k => curveState[k] = [25, 50, 75]);
			updateCurveSVG();
			updateCurveSlidersUI();
			
			// Update existing previews immediately
			const canvases = document.querySelectorAll('.preview-page-layer canvas, .preview-page-layer embed');
			canvases.forEach(el => el.style.filter = filter);
		});
	}

	// Main Filter Update Function
	const updateVisualFilters = () => {
		if(!labLSlider || !labASlider || !labBSlider || !labMatrix) return;
		const l = parseFloat(labLSlider.value) || 0;
		const a = parseFloat(labASlider.value) || 0;
		const b = parseFloat(labBSlider.value) || 0;

		// L: Brightness Scale
		const scale = 1 + (l / 100);
		
		// A: Green (-) to Red (+)
		// B: Blue (-) to Yellow (+)
		
		// R channel: Increases with A (Red) and B (Yellow component)
		const r = scale + (a/100) + (b/200);
		// G channel: Decreases with A (Red), Increases with B (Yellow component)
		const g = scale - (a/100) + (b/200);
		// B channel: Decreases with B (Yellow)
		const bl = scale - (b/100);
		
		// Calculate offsets to preserve white (1.0 input stays 1.0 output)
		const ro = 1 - r;
		const go = 1 - g;
		const bo = 1 - bl;

		// Apply Contrast to matrix to preserve white (CSS contrast() shifts white)
		let c = 1;
		if(contrastSlider){
			const val = parseFloat(contrastSlider.value);
			c = (isNaN(val) ? 100 : val) / 100;
		}
		// Formula: Out = In * C + (1 - C). Combined with LAB: Out = (In * Scale + Offset) * C + (1 - C)
		const rf = r * c;
		const gf = g * c;
		const blf = bl * c;
		const rof = ro * c + (1 - c);
		const gof = go * c + (1 - c);
		const bof = bo * c + (1 - c);

		const m = [
			rf, 0, 0, 0, rof,
			0, gf, 0, 0, gof,
			0, 0, blf, 0, bof,
			0, 0, 0, 1, 0
		].join(' ');
		
		labMatrix.setAttribute('values', m);
		window.__previewProfileFilter = 'url(#cielab-adjust)';

		// Append Saturation
		if(saturationSlider){
			const val = parseFloat(saturationSlider.value);
			const s = (isNaN(val) ? 100 : val) / 100;
			if(s !== 1) window.__previewProfileFilter += ` saturate(${s})`;
		}
		
		if(iccProfileSelect) iccProfileSelect.value = ''; // Clear preset selection

		const canvases = document.querySelectorAll('.preview-page-layer canvas, .preview-page-layer embed');
		canvases.forEach(el => el.style.filter = window.__previewProfileFilter);
	};
	
	// Curves Logic
	const updateCurveSVG = () => {
		const setFunc = (id, vals) => {
			const el = document.getElementById(id);
			if(el) el.setAttribute('tableValues', `0 ${vals[0]/100} ${vals[1]/100} ${vals[2]/100} 1`);
		};
		setFunc('curve-func-r', curveState.r);
		setFunc('curve-func-g', curveState.g);
		setFunc('curve-func-b', curveState.b);
	};

	const updateCurveSlidersUI = () => {
		if(!curveChannelSelect) return;
		const ch = curveChannelSelect.value;
		// If master, show Red (or average) - showing Red for simplicity as they are usually synced in Master mode
		const vals = (ch === 'master') ? curveState.r : curveState[ch.charAt(0)];
		if(curveShadowSlider) curveShadowSlider.value = vals[0];
		if(curveMidSlider) curveMidSlider.value = vals[1];
		if(curveHighSlider) curveHighSlider.value = vals[2];
	};

	const handleCurveInput = () => {
		if(!curveChannelSelect) return;
		const ch = curveChannelSelect.value;
		const v1 = parseInt(curveShadowSlider.value);
		const v2 = parseInt(curveMidSlider.value);
		const v3 = parseInt(curveHighSlider.value);
		
		const targets = (ch === 'master') ? ['r', 'g', 'b'] : [ch.charAt(0)];
		targets.forEach(k => {
			curveState[k] = [v1, v2, v3];
		});
		
		updateCurveSVG();
		// Trigger main filter update to clear presets if needed
		updateVisualFilters();
	};

	[labLSlider, labASlider, labBSlider].forEach(el => {
		if(el) el.addEventListener('input', updateVisualFilters);
	});
	
	if(contrastSlider) contrastSlider.addEventListener('input', updateVisualFilters);
	if(saturationSlider) saturationSlider.addEventListener('input', updateVisualFilters);

	if(curveChannelSelect) curveChannelSelect.addEventListener('change', updateCurveSlidersUI);
	
	[curveShadowSlider, curveMidSlider, curveHighSlider].forEach(el => {
		if(el) el.addEventListener('input', handleCurveInput);
	});

	if(resetCurvesBtn){
		resetCurvesBtn.addEventListener('click', () => {
			['r','g','b'].forEach(k => curveState[k] = [25, 50, 75]);
			updateCurveSVG();
			updateCurveSlidersUI();
			updateVisualFilters();
		});
	}

	// wire UI: Color Correction Details Toggle
	const colorDetails = document.getElementById('colorCorrectionDetails');
	if(colorDetails){
		colorDetails.addEventListener('toggle', () => {
			const canvases = document.querySelectorAll('.preview-page-layer canvas, .preview-page-layer embed');
			if(colorDetails.open){
				// Restore active filters
				if(iccProfileSelect && iccProfileSelect.value){
					iccProfileSelect.dispatchEvent(new Event('change'));
				} else {
					updateVisualFilters();
				}
			} else {
				// Deactivate filters
				window.__previewProfileFilter = '';
				canvases.forEach(el => el.style.filter = '');
			}
		});
	}

	if(resetLabBtn){
		resetLabBtn.addEventListener('click', () => {
			if(labLSlider) labLSlider.value = 0;
			if(labASlider) labASlider.value = 0;
			if(labBSlider) labBSlider.value = 0;
			updateVisualFilters();
		});
	}

	if(resetContrastSatBtn){
		resetContrastSatBtn.addEventListener('click', () => {
			if(contrastSlider) contrastSlider.value = 100;
			if(saturationSlider) saturationSlider.value = 100;
			updateVisualFilters();
		});
	}

	// wire UI: File Menu & Export Blocks
	const toolbarButtons = document.getElementById('toolbarButtons');
	
	if (toolbarButtons) {
		const fileBtnContainer = document.createElement('div');
		fileBtnContainer.className = 'dropdown-container';
		fileBtnContainer.style.position = 'relative';
		
		const fileBtn = document.createElement('button');
		fileBtn.id = 'fileMenuBtn';
		fileBtn.className = 'toolbar-btn';
		fileBtn.innerHTML = '<span class="material-icons">folder</span> File <span class="material-icons" style="font-size:14px">arrow_drop_down</span>';
		fileBtn.style.display = 'flex';
		fileBtn.style.alignItems = 'center';
		fileBtn.style.gap = '4px';
		
		const fileDropdown = document.createElement('div');
		fileDropdown.id = 'fileMenuDropdown';
		fileDropdown.className = 'dropdown-content';
		fileDropdown.style.display = 'none';
		fileDropdown.style.position = 'absolute';
		fileDropdown.style.top = '100%';
		fileDropdown.style.left = '0';
		fileDropdown.style.backgroundColor = '#333';
		fileDropdown.style.border = '1px solid #555';
		fileDropdown.style.borderRadius = '4px';
		fileDropdown.style.padding = '5px 0';
		fileDropdown.style.zIndex = '2000';
		fileDropdown.style.minWidth = '180px';
		fileDropdown.style.flexDirection = 'column';

		const createMenuItem = (text, icon, onClick) => {
			const btn = document.createElement('button');
			btn.className = 'dropdown-item';
			btn.style.display = 'flex';
			btn.style.alignItems = 'center';
			btn.style.gap = '8px';
			btn.style.width = '100%';
			btn.style.padding = '8px 12px';
			btn.style.border = 'none';
			btn.style.background = 'transparent';
			btn.style.color = '#eee';
			btn.style.textAlign = 'left';
			btn.style.cursor = 'pointer';
			btn.innerHTML = `<span class="material-icons" style="font-size:18px">${icon}</span> ${text}`;
			btn.onmouseover = () => btn.style.background = '#444';
			btn.onmouseout = () => btn.style.background = 'transparent';
			btn.onclick = (e) => {
				e.stopPropagation();
				fileDropdown.style.display = 'none';
				onClick();
			};
			return btn;
		};

		fileDropdown.appendChild(createMenuItem('Open PDF...', 'file_open', () => document.getElementById('fileInput')?.click()));
		fileDropdown.appendChild(createMenuItem('Export PDF', 'picture_as_pdf', () => window.generateImposedPdf && window.generateImposedPdf()));
		
		const sep = document.createElement('div');
		sep.style.height = '1px';
		sep.style.background = '#555';
		sep.style.margin = '4px 0';
		fileDropdown.appendChild(sep);

		fileDropdown.appendChild(createMenuItem('Export to Blocks...', 'view_module', showExportBlocksDialog));

		fileBtnContainer.appendChild(fileBtn);
		fileBtnContainer.appendChild(fileDropdown);
		
		toolbarButtons.insertBefore(fileBtnContainer, toolbarButtons.firstChild);

		fileBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isVisible = fileDropdown.style.display === 'flex';
			document.querySelectorAll('.dropdown-content').forEach(el => el.style.display = 'none');
			fileDropdown.style.display = isVisible ? 'none' : 'flex';
		});

		document.addEventListener('click', () => {
			fileDropdown.style.display = 'none';
		});
	}

	// Export to Blocks Dialog
	function showExportBlocksDialog() {
		const pageRangeVal = document.getElementById('pageRangeInput')?.value || '';
		const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
		const cols = parseInt(document.getElementById('colsInput')?.value || 1);
		const slotsPerSheet = rows * cols;

		// Detect structured n-up sections (e.g. "16-up(1-224)")
		const nUpRegex = /(\d+)-?up\s*\(([^)]+)\)/gi;
		const matches = [...pageRangeVal.matchAll(nUpRegex)];
		const sections = [];
		let isStructured = false;

		if (matches.length > 0) {
			isStructured = true;
			let currentSheetOffset = 0;
			for (const m of matches) {
				const n = parseInt(m[1]);
				const rawStr = m[0];
				// Calculate how many sheets this section occupies
				const slots = window.parsePageOrder ? window.parsePageOrder(rawStr).length : 0;
				const sheets = Math.ceil(slots / slotsPerSheet);
				
				sections.push({
					n: n,
					raw: rawStr,
					slots: slots,
					sheets: sheets,
					startSheet: currentSheetOffset
				});
				currentSheetOffset += sheets;
			}
		}

		// Fallback detection for simple mode
		let detectedN = 16;
		if (!isStructured) {
			const shorthandMatch = pageRangeVal.match(/^(\d+)-?up$/i);
			if (shorthandMatch) {
				detectedN = parseInt(shorthandMatch[1], 10);
			} else {
				const matchesSimple = [...pageRangeVal.matchAll(/(\d+)-?up/gi)];
				if (matchesSimple.length > 0) {
					detectedN = Math.max(...matchesSimple.map(m => parseInt(m[1], 10)));
				}
			}
			if (detectedN <= 0) detectedN = 16;
		}

		const dialog = document.createElement('div');
		Object.assign(dialog.style, {
			position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
			backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '3000', display: 'flex',
			alignItems: 'center', justifyContent: 'center'
		});

		const content = document.createElement('div');
		Object.assign(content.style, {
			backgroundColor: '#222', padding: '20px', borderRadius: '8px',
			border: '1px solid #444', width: isStructured ? '600px' : '350px', color: '#eee',
			boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
		});

		let innerHTML = `<h3 style="margin-top:0; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px">Export to Blocks</h3>`;

		if (isStructured) {
			innerHTML += `
				<div style="margin-bottom:15px; max-height:300px; overflow-y:auto; border:1px solid #444; padding:5px; background:#111;">
					<table style="width:100%; border-collapse:collapse; font-size:12px;">
						<thead>
							<tr style="border-bottom:1px solid #444; color:#aaa; text-align:left;">
								<th style="padding:4px;">Section</th>
								<th style="padding:4px;">Signature</th>
								<th style="padding:4px;">Sheets</th>
								<th style="padding:4px;">Blocks</th>
								<th style="padding:4px;">Export Mode</th>
							</tr>
						</thead>
						<tbody>
							${sections.map((s, i) => `
								<tr>
									<td style="padding:4px; color:#fff;">${i+1}</td>
									<td style="padding:4px; color:#00bcd4;">${s.n}-up</td>
									<td style="padding:4px;">${s.sheets}</td>
									<td style="padding:4px;">${Math.ceil(s.n / (slotsPerSheet * 2))} (Duplex)</td>
									<td style="padding:4px;">
										<select id="mode_${i}" class="toolbox-input section-mode-select" style="width:100%; padding:2px;">
											<option value="blocks">Blocks</option>
											<option value="booklet">Booklet (Sheets)</option>
										</select>
									</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
				</div>
				<div style="margin-bottom:15px">
					<label style="display:flex; alignItems:center; gap:8px; cursor:pointer">
						<input type="checkbox" id="blockDuplex" checked>
						<span>Duplex (2 pages per sheet)</span>
					</label>
				</div>
				<div id="blockInfo" style="margin-bottom:20px; font-size:12px; color:#ccc;">
					Will export blocks for ${sections.length} detected sections.
				</div>
			`;
		} else {
			const sizes = [4, 8, 16, 32, 64];
			if (!sizes.includes(detectedN)) {
				sizes.push(detectedN);
				sizes.sort((a, b) => a - b);
			}
			const optionsHtml = sizes.map(s => `<option value="${s}" ${s === detectedN ? 'selected' : ''}>${s}-up</option>`).join('');

			innerHTML += `
				<div style="margin-bottom:15px">
					<label style="display:block; margin-bottom:5px; font-size:12px; color:#aaa">Signature Size (Pages)</label>
					<select id="blockSigSize" class="toolbox-input" style="width:100%">
						${optionsHtml}
					</select>
				</div>
				<div style="margin-bottom:15px">
					<label style="display:flex; alignItems:center; gap:8px; cursor:pointer">
						<input type="checkbox" id="blockDuplex" checked>
						<span>Duplex (2 pages per sheet)</span>
					</label>
				</div>
				<div id="blockInfo" style="margin-bottom:20px; font-size:12px; color:#00bcd4; min-height:1.2em"></div>
			`;
		}

		innerHTML += `
			<div style="display:flex; justify-content:flex-end; gap:10px">
				<button id="blockCancel" class="toolbox-btn" style="width:auto; padding:6px 12px">Cancel</button>
				<button id="blockExport" class="toolbox-btn" style="width:auto; padding:6px 12px; background-color:#00bcd4; color:#000; font-weight:bold">Export</button>
			</div>
		`;

		content.innerHTML = innerHTML;
		dialog.appendChild(content);
		document.body.appendChild(dialog);

		const duplexCheck = content.querySelector('#blockDuplex');
		const infoDiv = content.querySelector('#blockInfo');
		const cancelBtn = content.querySelector('#blockCancel');
		const exportBtn = content.querySelector('#blockExport');
		const sigSelect = content.querySelector('#blockSigSize'); // Only in simple mode

		const updateInfo = () => {
			if (isStructured) {
				return;
			}
			const sigSize = parseInt(sigSelect.value);
			const isDuplex = duplexCheck.checked;
			const pagesPerSheet = slotsPerSheet * (isDuplex ? 2 : 1);
			const sheetsPerSig = sigSize / pagesPerSheet;

			if (!Number.isInteger(sheetsPerSig)) {
				infoDiv.textContent = `Warning: Signature size ${sigSize} is not divisible by ${pagesPerSheet} pages/sheet.`;
				infoDiv.style.color = '#ff9f9f';
				exportBtn.disabled = true;
				exportBtn.style.opacity = '0.5';
			} else {
				infoDiv.textContent = `Will export ${sheetsPerSig} blocks (1 for each sheet position in signature).`;
				infoDiv.style.color = '#00bcd4';
				exportBtn.disabled = false;
				exportBtn.style.opacity = '1';
			}
		};

		if (sigSelect) sigSelect.addEventListener('change', updateInfo);
		duplexCheck.addEventListener('change', updateInfo);
		updateInfo();

		cancelBtn.onclick = () => document.body.removeChild(dialog);

		exportBtn.onclick = async () => {
			const isDuplex = duplexCheck.checked;
			// Capture modes before removing dialog
			const sectionModes = [];
			if(isStructured){
				for(let i=0; i<sections.length; i++){
					const sel = content.querySelector(`#mode_${i}`);
					sectionModes.push(sel ? sel.value : 'blocks');
				}
			}

			document.body.removeChild(dialog);

			if (window.generateImposedPdf && window.PDFLib) {
				try {
					const pdfBytes = await window.generateImposedPdf({ returnBytes: true });
					if (!pdfBytes) return;

					const { PDFDocument } = window.PDFLib;
					const srcDoc = await PDFDocument.load(pdfBytes);
					const totalPdfPages = srcDoc.getPageCount();
					const physicalSheetsTotal = Math.ceil(totalPdfPages / (isDuplex ? 2 : 1));

					const exportSection = async (sectionIndex, sigSize, startSheet, numSheets, mode) => {
						const prefix = isStructured ? `Section${sectionIndex+1}_` : '';

						if (mode === 'booklet') {
							// Export all sheets in this section as one PDF
							const doc = await PDFDocument.create();
							const indices = [];
							// numSheets is the number of sides (PDF pages) in this section
							for(let i=0; i<numSheets; i++) {
								const sheetIdx = startSheet + i;
								indices.push(sheetIdx);
							}
							// Filter out of bounds
							const validIndices = indices.filter(idx => idx < totalPdfPages);
							if(validIndices.length > 0){
								const pages = await doc.copyPages(srcDoc, validIndices);
								pages.forEach(p => doc.addPage(p));
								const bytes = await doc.save();
								downloadBlob(bytes, `${prefix}Booklet.pdf`);
							}
							return;
						}

						// Block Export Logic
						const pagesPerSheet = slotsPerSheet * (isDuplex ? 2 : 1);
						const sheetsPerSig = sigSize / pagesPerSheet;
						
						// Convert sides (numSheets) to physical sheets
						const physicalSheetsInSection = Math.ceil(numSheets / (isDuplex ? 2 : 1));
						
						const numSigs = Math.floor(physicalSheetsInSection / sheetsPerSig);
						const remainderSheets = physicalSheetsInSection % sheetsPerSig;

						// Export Blocks
						for (let b = 0; b < sheetsPerSig; b++) {
							const blockDoc = await PDFDocument.create();
							const indices = [];
							for (let s = 0; s < numSigs; s++) {
								const relativePhysicalSheetIndex = s * sheetsPerSig + b;
								
								if (isDuplex) {
									const p1 = startSheet + relativePhysicalSheetIndex * 2;
									const p2 = startSheet + relativePhysicalSheetIndex * 2 + 1;
									if (p1 < totalPdfPages && p1 < startSheet + numSheets) indices.push(p1);
									if (p2 < totalPdfPages && p2 < startSheet + numSheets) indices.push(p2);
								} else {
									const p1 = startSheet + relativePhysicalSheetIndex;
									if (p1 < totalPdfPages && p1 < startSheet + numSheets) indices.push(p1);
								}
							}
							
							if (indices.length > 0) {
								const pages = await blockDoc.copyPages(srcDoc, indices);
								pages.forEach(p => blockDoc.addPage(p));
								const blockBytes = await blockDoc.save();
								downloadBlob(blockBytes, `${prefix}Block_${b + 1}.pdf`);
                                await new Promise(r => setTimeout(r, 50)); // Delay to prevent browser blocking
							}
						}

						// Export Remainder
						if (remainderSheets > 0) {
							const remDoc = await PDFDocument.create();
							const indices = [];
							const startRelPhysicalSheet = numSigs * sheetsPerSig;
							for (let r = 0; r < remainderSheets; r++) {
								const relativePhysicalSheetIndex = startRelPhysicalSheet + r;
								
								if (isDuplex) {
									const p1 = startSheet + relativePhysicalSheetIndex * 2;
									const p2 = startSheet + relativePhysicalSheetIndex * 2 + 1;
									if (p1 < totalPdfPages && p1 < startSheet + numSheets) indices.push(p1);
									if (p2 < totalPdfPages && p2 < startSheet + numSheets) indices.push(p2);
								} else {
									const p1 = startSheet + relativePhysicalSheetIndex;
									if (p1 < totalPdfPages && p1 < startSheet + numSheets) indices.push(p1);
								}
							}
							if (indices.length > 0) {
								const pages = await remDoc.copyPages(srcDoc, indices);
								pages.forEach(p => remDoc.addPage(p));
								const remBytes = await remDoc.save();
								downloadBlob(remBytes, `${prefix}Block_Remainder.pdf`);
                                await new Promise(r => setTimeout(r, 50)); // Delay
							}
						}
					};

					if (isStructured) {
						for (let i = 0; i < sections.length; i++) {
							const s = sections[i];
							await exportSection(i, s.n, s.startSheet, s.sheets, sectionModes[i]);
                            await new Promise(r => setTimeout(r, 100)); // Delay between sections
						}
					} else {
						const sigSize = parseInt(sigSelect.value);
						await exportSection(0, sigSize, 0, totalPdfPages, 'blocks');
					}

				} catch (e) {
					console.error(e);
					alert('Error exporting blocks: ' + e.message);
				}
			}
		};
	}


	function downloadBlob(bytes, filename) {
		const blob = new Blob([bytes], { type: 'application/pdf' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// wire UI: Responsive Toolbar
	const toolbarOverflowBtn = document.getElementById('toolbarOverflowBtn');
	const toolbarOverflowDropdown = document.getElementById('toolbarOverflowDropdown');
	const toolbarRightSection = document.querySelector('.toolbar-right-section');

	if(toolbarButtons && toolbarOverflowBtn && toolbarOverflowDropdown){
		const handleToolbarResize = () => {
			const overflowItems = Array.from(toolbarOverflowDropdown.children);
			for(const item of overflowItems){
				if(item.dataset.origin === 'right'){
					if(toolbarRightSection) toolbarRightSection.appendChild(item);
				} else {
					toolbarButtons.appendChild(item);
				}
			}
			toolbarOverflowBtn.style.display = 'none';
			toolbarOverflowDropdown.style.display = 'none';
			if(toolbarRightSection) toolbarRightSection.style.display = 'flex';

			if(toolbarButtons.scrollWidth > toolbarButtons.clientWidth + 1){
				toolbarOverflowBtn.style.display = 'flex';
				
				while(toolbarButtons.scrollWidth > toolbarButtons.clientWidth + 1){
					let moved = false;
					// Priority: Hide right section items first (from left to right)
					if(toolbarRightSection && toolbarRightSection.children.length > 0){
						const item = toolbarRightSection.firstElementChild;
						item.dataset.origin = 'right';
						toolbarOverflowDropdown.appendChild(item);
						moved = true;
					} else if(toolbarButtons.children.length > 0){
						// Then hide main toolbar items (from right to left)
						const item = toolbarButtons.lastElementChild;
						item.dataset.origin = 'left';
						if(toolbarOverflowDropdown.firstChild){
							toolbarOverflowDropdown.insertBefore(item, toolbarOverflowDropdown.firstChild);
						} else {
							toolbarOverflowDropdown.appendChild(item);
						}
						moved = true;
					}
					if(!moved) break;
				}
			}
		};

		const resizeObserver = new ResizeObserver(() => { handleToolbarResize(); });
		resizeObserver.observe(document.body);
		
		toolbarOverflowBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			// Close other menus
			const left = document.getElementById('leftMenuDropdown');
			const right = document.getElementById('rightMenuDropdown');
			if(left) left.style.display = 'none';
			if(right) right.style.display = 'none';
			const isVisible = toolbarOverflowDropdown.style.display === 'flex';
			toolbarOverflowDropdown.style.display = isVisible ? 'none' : 'flex';
		});
		toolbarOverflowDropdown.addEventListener('click', (e) => e.stopPropagation());
		document.addEventListener('click', () => { toolbarOverflowDropdown.style.display = 'none'; });
	}

	// wire UI: Left/Right Menu Buttons
	const leftMenuBtn = document.getElementById('leftMenuBtn');
	const leftMenuDropdown = document.getElementById('leftMenuDropdown');
	const rightMenuBtn = document.getElementById('rightMenuBtn');
	const rightMenuDropdown = document.getElementById('rightMenuDropdown');

	const toggleMenu = (btn, dropdown) => {
		if(!btn || !dropdown) return;
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isVisible = dropdown.style.display === 'flex';
			// Close others
			if(leftMenuDropdown && dropdown !== leftMenuDropdown) leftMenuDropdown.style.display = 'none';
			if(rightMenuDropdown && dropdown !== rightMenuDropdown) rightMenuDropdown.style.display = 'none';
			if(toolbarOverflowDropdown) toolbarOverflowDropdown.style.display = 'none';
			
			dropdown.style.display = isVisible ? 'none' : 'flex';
		});
		dropdown.addEventListener('click', (e) => e.stopPropagation());
	};

	toggleMenu(leftMenuBtn, leftMenuDropdown);
	toggleMenu(rightMenuBtn, rightMenuDropdown);
	
	document.addEventListener('click', () => {
		if(leftMenuDropdown) leftMenuDropdown.style.display = 'none';
		if(rightMenuDropdown) rightMenuDropdown.style.display = 'none';
	});

	// Wrap openPdfFile to enforce layout settings on load
	const originalOpenPdf = window.openPdfFile;
	window.openPdfFile = async function(arg){
		await originalOpenPdf(arg);
		if(layoutSelect && layoutSelect.value){
			window.applyCurrentLayout();
		}
		if(window.fitSheetsToWorkspace) window.fitSheetsToWorkspace();
	};

	// Sync UI inputs to match the currently selected slot (or global defaults)
	window.syncSelectionToUI = function(){
		const pxPerMm = 96 / 25.4;
		
		// Default / Global values
		let r = window.__currentRotation || 0;
		let sX = window.__currentScaleX || 1;
		let sY = window.__currentScaleY || 1;
		let skX = window.__skewX || 0;
		let skY = window.__skewY || 0;
		let offX = window.__offsetX || 0;
		let offY = window.__offsetY || 0;
		
		let l = window.__expandL || 0;
		let r_exp = window.__expandR || 0;
		let t = window.__expandT || 0;
		let b = window.__expandB || 0;
		
		let trimW = window.__trimW || 0;
		let trimH = window.__trimH || 0;
		let fitToPage = window.__fitToPage;
		const transformAll = document.getElementById('transformAllPagesCheckbox')?.checked;


		if(!transformAll && window.__selectedSlots && window.__selectedSlots.length > 0){
			const i = window.__selectedSlots[0];
			const el = document.getElementsByClassName('preview')[i];
			const pageNum = el ? parseInt(el.dataset.pageNum) : null;

			const slotT = (window.__slotTransforms && window.__slotTransforms[i]) || {};
			const pageT = (pageNum && window.__pageTransforms && window.__pageTransforms[pageNum]) || {};

			const getVal = (prop, globalVal) => {
				if(slotT[prop] !== undefined) return slotT[prop];
				if(pageT[prop] !== undefined) return pageT[prop];
				return globalVal;
			};

			r = getVal('rotation', r);
			sX = getVal('scaleX', sX);
			sY = getVal('scaleY', sY);
			skX = getVal('skewX', skX);
			skY = getVal('skewY', skY);
			offX = getVal('offsetX', offX);
			offY = getVal('offsetY', offY);

			const layout = slotT.layout || pageT.layout || {};
			l = (layout.expandL !== undefined) ? layout.expandL : l;
			r_exp = (layout.expandR !== undefined) ? layout.expandR : r_exp;
			t = (layout.expandT !== undefined) ? layout.expandT : t;
			b = (layout.expandB !== undefined) ? layout.expandB : b;

			const w = (layout.width !== undefined) ? layout.width : (window.__slotW || 0);
			const h = (layout.height !== undefined) ? layout.height : (window.__slotH || 0);
			
			if(layout.width !== undefined) trimW = w - (l + r_exp);
			if(layout.height !== undefined) trimH = h - (t + b);

			if (slotT.fitToPage !== undefined) fitToPage = slotT.fitToPage;
			else if (pageT.fitToPage !== undefined) fitToPage = pageT.fitToPage;
		}

		// Calculate effective scale if fitting
		if(fitToPage && sX === 1 && sY === 1 && window.calculatePageFit && window.__fileWidthMm && window.__fileHeightMm){
			const imgW = window.__fileWidthMm * pxPerMm;
			const imgH = window.__fileHeightMm * pxPerMm;
			const fit = window.calculatePageFit(imgW, imgH, trimW, trimH, r, skX, skY, fitMode);
			if(fit){
				if(fitMode === 'stretch'){
					sX = fit.scaleX;
					sY = fit.scaleY;
				} else {
					sX = fit.scale;
					sY = fit.scale;
				}
			}
		}

		// Update UI Elements
		const setVal = (id, val) => { const el = document.getElementById(id); if(el && document.activeElement !== el) el.value = val; };
		const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };

		setVal('rotationInput', r);
		if(document.getElementById('rotationSlider')) document.getElementById('rotationSlider').value = (r > 180) ? (r - 360) : r;
		
		setVal('scaleSlider', Math.round(sX * 100));
		setTxt('scaleValue', Math.round(sX * 100) + '%');

		if(window.__fileWidthMm && window.__fileHeightMm){
			const wIn = document.getElementById('widthInput');
			const hIn = document.getElementById('heightInput');
			if(wIn && document.activeElement !== wIn) wIn.value = (window.__fileWidthMm * sX).toFixed(2);
			if(hIn && document.activeElement !== hIn) hIn.value = (window.__fileHeightMm * sY).toFixed(2);
		}

		setVal('skewXInput', skX);
		setVal('skewYInput', skY);
		setVal('skewXSlider', skX);
		setVal('skewYSlider', skY);

		setVal('offsetXInput', (offX / pxPerMm).toFixed(2));
		setVal('offsetYInput', (offY / pxPerMm).toFixed(2));
		setVal('offsetXSlider', (offX / pxPerMm).toFixed(2));
		setVal('offsetYSlider', (offY / pxPerMm).toFixed(2));

		setVal('expandLeftInput', (l / pxPerMm).toFixed(2));
		setVal('expandRightInput', (r_exp / pxPerMm).toFixed(2));
		setVal('expandTopInput', (t / pxPerMm).toFixed(2));
		setVal('expandBottomInput', (b / pxPerMm).toFixed(2));

		setVal('slotWidthInput', (trimW / pxPerMm).toFixed(2));
		setVal('slotHeightInput', (trimH / pxPerMm).toFixed(2));

		const wIn = document.getElementById('slotWidthInput');
		const hIn = document.getElementById('slotHeightInput');
		if(wIn && window.__fileWidthMm){
			wIn.style.color = (Math.abs(parseFloat(wIn.value) - window.__fileWidthMm) > 0.05) ? 'red' : '';
		}
		if(hIn && window.__fileHeightMm){
			hIn.style.color = (Math.abs(parseFloat(hIn.value) - window.__fileHeightMm) > 0.05) ? 'red' : '';
		}
		
		const scaleIn = document.getElementById('slotScalePercentInput');
		if(scaleIn && window.__fileWidthMm && trimW > 0){
			const pct = Math.round((trimW / window.__fileWidthMm) * 100);
			if(document.activeElement !== scaleIn) scaleIn.value = pct;
		}

		const linkCheck = document.getElementById('linkSlotScaleCheckbox');
		if(linkCheck) linkCheck.checked = !!fitToPage;

		const resizeAllCheck = document.getElementById('resizeAllFramesCheckbox');
		if(resizeAllCheck) resizeAllCheck.checked = (!window.__selectedSlots || window.__selectedSlots.length === 0);

		const transformAllCheck = document.getElementById('transformAllPagesCheckbox');
		if(transformAllCheck && !transformAllCheck.hasAttribute('data-init')){
			transformAllCheck.setAttribute('data-init', 'true');
			transformAllCheck.addEventListener('change', window.syncSelectionToUI);
		}
	};

	// wire UI: Toolbox Toggles
	const toggleLeftBtn = document.getElementById('toggleLeftToolbox');
	const toggleRightBtn = document.getElementById('toggleRightToolbox');
	const toolboxes = document.querySelectorAll('.toolbox');
	const leftToolbox = toolboxes[0];
	const rightToolbox = toolboxes[1];

	const addCloseButton = (toolbox, side) => {
		if(!toolbox) return;
		const btn = document.createElement('button');
		btn.innerHTML = '<span class="material-icons">close</span>';
		Object.assign(btn.style, {
			position: 'absolute',
			top: '8px',
			right: '8px',
			background: 'rgba(0,0,0,0.6)',
			borderRadius: '50%',
			width: '24px',
			height: '24px',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			border: 'none',
			color: '#fff',
			cursor: 'pointer',
			zIndex: '1000',
			padding: '0'
		});
		btn.querySelector('span').style.fontSize = '16px';
		const updateVisibility = () => { btn.style.display = (window.innerWidth <= 1000) ? 'flex' : 'none'; };
		window.addEventListener('resize', updateVisibility);
		updateVisibility();
		btn.addEventListener('click', () => {
			toolbox.classList.remove('visible');
			if(side === 'left') document.body.classList.remove('left-toolbox-visible');
			if(side === 'right') document.body.classList.remove('right-toolbox-visible');
		});
		if(window.getComputedStyle(toolbox).position === 'static') toolbox.style.position = 'relative';
		toolbox.appendChild(btn);
	};
	addCloseButton(leftToolbox, 'left');
	addCloseButton(rightToolbox, 'right');

	if(toggleLeftBtn && leftToolbox){
		toggleLeftBtn.addEventListener('click', () => {
			leftToolbox.classList.toggle('visible');
			document.body.classList.toggle('left-toolbox-visible');
		});
	}

	if(toggleRightBtn && rightToolbox){
		toggleRightBtn.addEventListener('click', () => {
			rightToolbox.classList.toggle('visible');
			document.body.classList.toggle('right-toolbox-visible');
		});
	}

	if(workspace){
		workspace.addEventListener('click', (e) => {
			if(window.innerWidth <= 1000){
				if(leftToolbox && leftToolbox.classList.contains('visible') && !leftToolbox.contains(e.target) && e.target !== toggleLeftBtn && !toggleLeftBtn.contains(e.target)){
					leftToolbox.classList.remove('visible');
					document.body.classList.remove('left-toolbox-visible');
				}
				if(rightToolbox && rightToolbox.classList.contains('visible') && !rightToolbox.contains(e.target) && e.target !== toggleRightBtn && !toggleRightBtn.contains(e.target)){
					rightToolbox.classList.remove('visible');
					document.body.classList.remove('right-toolbox-visible');
				}
			}
		});
	}