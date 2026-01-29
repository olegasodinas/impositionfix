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
		document.addEventListener('click', (e) => {
			if(cookieInfoBalloon && cookieInfoBalloon.style.display === 'block'){
				if(!cookieInfoBalloon.contains(e.target) && e.target !== btnCookieInfo){
					cookieInfoBalloon.style.display = 'none';
				}
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
				window.openPdfFile(ev.target.files);
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
		'innerCropStyleSelect', 'boxXInput', 'boxYInput', 'paperSelect', 'pageRangeInput'
	];

	const defaultLayout = {
		rows: 1, cols: 2,
		gapX: 1, gapY: 1,
		bleedX: 2, bleedY: 2,
		innerBleedX: 2, innerBleedY: 2,
		innerMarkStyle: 'solid',
		boxX: 0, boxY: 0,
		paper: '320,450',
		range: '1-'
	};

	const getLayoutSettings = () => {
		return {
			rows: document.getElementById('rowsInput')?.value || 1,
			cols: document.getElementById('colsInput')?.value || 1,
			gapX: document.getElementById('markGapXInput')?.value || 0,
			gapY: document.getElementById('markGapYInput')?.value || 0,
			bleedX: document.getElementById('cropBleedXInput')?.value || 0,
			bleedY: document.getElementById('cropBleedYInput')?.value || 0,
			innerBleedX: document.getElementById('innerCropBleedXInput')?.value || 0,
			innerBleedY: document.getElementById('innerCropBleedYInput')?.value || 0,
			innerMarkStyle: document.getElementById('innerCropStyleSelect')?.value || 'solid',
			boxX: document.getElementById('boxXInput')?.value || 0,
			boxY: document.getElementById('boxYInput')?.value || 0,
			paper: document.getElementById('paperSelect')?.value || '320,450',
			range: document.getElementById('pageRangeInput')?.value || ''
		};
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
			if(el) {
				el.value = val;
				el.dispatchEvent(new Event('input'));
				el.dispatchEvent(new Event('change'));
			}
		};
		
		// Paper first to set sheet size
		const paperEl = document.getElementById('paperSelect');
		if(paperEl && settings.paper){
			paperEl.value = settings.paper;
			paperEl.dispatchEvent(new Event('change'));
		}

		setVal('rowsInput', settings.rows);
		setVal('colsInput', settings.cols);
		setVal('markGapXInput', settings.gapX);
		setVal('markGapYInput', settings.gapY);
		setVal('cropBleedXInput', settings.bleedX);
		setVal('cropBleedYInput', settings.bleedY);
		setVal('innerCropBleedXInput', settings.innerBleedX !== undefined ? settings.innerBleedX : settings.bleedX);
		setVal('innerCropBleedYInput', settings.innerBleedY !== undefined ? settings.innerBleedY : settings.bleedY);
		setVal('innerCropStyleSelect', settings.innerMarkStyle || 'solid');
		setVal('boxXInput', settings.boxX);
		setVal('boxYInput', settings.boxY);
		setVal('pageRangeInput', settings.range);
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
			const name = prompt('Layout Name:');
			if(!name) return;
			const layouts = JSON.parse(localStorage.getItem('pdf_layouts') || '{}');
			layouts[name] = getLayoutSettings();
			localStorage.setItem('pdf_layouts', JSON.stringify(layouts));
			loadLayouts();
			layoutSelect.value = name;
			localStorage.setItem('pdf_last_layout', name);
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
		pageRangeInput.addEventListener('input', ()=>{
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
		const header = document.createElement('h3');
		header.textContent = 'Data Overlays';
		ltContentData.appendChild(header);

		const addBtn = document.createElement('button');
		addBtn.className = 'toolbox-btn';
		addBtn.style.width = 'auto';
		addBtn.style.marginBottom = '10px';
		addBtn.innerHTML = '<span class="material-icons" style="vertical-align:middle; font-size:16px">add</span> Add Square Overlay';
		ltContentData.appendChild(addBtn);

		const addNumBtn = document.createElement('button');
		addNumBtn.className = 'toolbox-btn';
		addNumBtn.style.width = 'auto';
		addNumBtn.style.marginBottom = '10px';
		addNumBtn.innerHTML = '<span class="material-icons" style="vertical-align:middle; font-size:16px">looks_one</span> Add Numbering';
		ltContentData.appendChild(addNumBtn);

		const addColorBarBtn = document.createElement('button');
		addColorBarBtn.className = 'toolbox-btn';
		addColorBarBtn.style.width = 'auto';
		addColorBarBtn.style.marginBottom = '10px';
		addColorBarBtn.innerHTML = '<span class="material-icons" style="vertical-align:middle; font-size:16px">palette</span> Add Color Bar';
		ltContentData.appendChild(addColorBarBtn);

		const addDuplexBtn = document.createElement('button');
		addDuplexBtn.className = 'toolbox-btn';
		addDuplexBtn.style.width = 'auto';
		addDuplexBtn.style.marginBottom = '10px';
		addDuplexBtn.innerHTML = '<span class="material-icons" style="vertical-align:middle; font-size:16px">center_focus_strong</span> Add Duplex Mark';
		ltContentData.appendChild(addDuplexBtn);

		const addRegMarkBtn = document.createElement('button');
		addRegMarkBtn.className = 'toolbox-btn';
		addRegMarkBtn.style.width = 'auto';
		addRegMarkBtn.style.marginBottom = '10px';
		addRegMarkBtn.innerHTML = '<span class="material-icons" style="vertical-align:middle; font-size:16px">wysiwyg</span> Add Registration Mark';
		ltContentData.appendChild(addRegMarkBtn);

		const overlaysContainer = document.createElement('div');
		overlaysContainer.style.display = 'flex';
		overlaysContainer.style.flexDirection = 'column';
		overlaysContainer.style.gap = '10px';
		ltContentData.appendChild(overlaysContainer);

		const renderOverlayInputs = () => {
			overlaysContainer.innerHTML = '';
			if(!window.__overlays) window.__overlays = [];
			
			// Render in reverse order so top layer is at the top of the list
			const listItems = window.__overlays.map((ov, i) => ({ov, i})).reverse();

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
					renderOverlayInputs();
					if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
				});

				const topRow = document.createElement('div');
				topRow.style.display = 'flex';
				topRow.style.justifyContent = 'space-between';
				topRow.style.alignItems = 'center';
				topRow.style.marginBottom = '8px';
				topRow.style.cursor = 'grab';
				topRow.onmousedown = (e) => {
					if(e.target.closest('button')) return;
					row.draggable = true;
				};
				topRow.onmouseup = () => {
					row.draggable = false;
				};
				
				const title = document.createElement('span');
				title.textContent = overlay.type === 'numbering' ? `Numbering ${index + 1}` : `Overlay ${index + 1}`;
				title.style.fontSize = '11px';
				title.style.fontWeight = 'bold';
				title.style.color = '#ddd';

				const removeBtn = document.createElement('button');
				removeBtn.className = 'toolbox-btn';
				removeBtn.style.width = '20px';
				removeBtn.style.height = '20px';
				removeBtn.style.padding = '0';
				removeBtn.style.display = 'flex';
				removeBtn.style.alignItems = 'center';
				removeBtn.style.justifyContent = 'center';
				removeBtn.innerHTML = '<span class="material-icons" style="font-size:14px">close</span>';
				removeBtn.title = 'Remove Overlay';
				removeBtn.onclick = () => {
					window.__overlays.splice(index, 1);
					renderOverlayInputs();
					if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					if(window.drawSheetOverlays) window.drawSheetOverlays();
				};

				topRow.appendChild(title);
				topRow.appendChild(removeBtn);
				row.appendChild(topRow);

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
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					};
					
					wrap.appendChild(lbl);
					wrap.appendChild(sl);
					return wrap;
				};

				const createFacingInput = (ov) => {
					const facingWrap = document.createElement('div');
					facingWrap.style.display = 'flex';
					facingWrap.style.alignItems = 'center';
					facingWrap.style.marginBottom = '4px';
					
					const facingLbl = document.createElement('label');
					facingLbl.textContent = 'Facing Pages';
					facingLbl.style.fontSize = '10px';
					facingLbl.style.color = '#aaa';
					facingLbl.style.marginRight = '5px';
					
					const facingCheck = document.createElement('input');
					facingCheck.type = 'checkbox';
					facingCheck.checked = !!ov.facingPages;
					facingCheck.onchange = (e) => {
						ov.facingPages = e.target.checked;
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					};
					
					facingWrap.appendChild(facingCheck);
					facingWrap.appendChild(facingLbl);
					return facingWrap;
				};

				if (overlay.type === 'numbering') {
					// Font Selector
					const fontWrap = document.createElement('div');
					fontWrap.style.display = 'flex';
					fontWrap.style.alignItems = 'center';
					fontWrap.style.marginBottom = '4px';
					fontWrap.style.gap = '5px';

					const fontLbl = document.createElement('label');
					fontLbl.textContent = 'Font';
					fontLbl.style.width = '50px';
					fontLbl.style.fontSize = '10px';
					fontLbl.style.color = '#aaa';

					const familySel = document.createElement('select');
					familySel.className = 'toolbox-input';
					familySel.style.flex = '1';
					
					const styleSel = document.createElement('select');
					styleSel.className = 'toolbox-input';
					styleSel.style.flex = '1';

					const families = ['Helvetica', 'Times', 'Courier', 'Symbol', 'ZapfDingbats'];
					const styles = ['Normal', 'Bold', 'Italic', 'Bold Italic'];

					families.forEach(f => {
						const opt = document.createElement('option');
						opt.value = f;
						opt.textContent = f;
						familySel.appendChild(opt);
					});

					styles.forEach(s => {
						const opt = document.createElement('option');
						opt.value = s;
						opt.textContent = s;
						styleSel.appendChild(opt);
					});

					// Determine current family/style
					let currentFont = overlay.font || 'Helvetica';
					let curFamily = 'Helvetica';
					let curStyle = 'Normal';

					if(currentFont.startsWith('Times')){
						curFamily = 'Times';
						if(currentFont.includes('BoldItalic')) curStyle = 'Bold Italic';
						else if(currentFont.includes('Bold')) curStyle = 'Bold';
						else if(currentFont.includes('Italic')) curStyle = 'Italic';
					} else if(currentFont.startsWith('Courier')){
						curFamily = 'Courier';
						if(currentFont.includes('BoldOblique')) curStyle = 'Bold Italic';
						else if(currentFont.includes('Bold')) curStyle = 'Bold';
						else if(currentFont.includes('Oblique')) curStyle = 'Italic';
					} else if(currentFont.startsWith('Helvetica')){
						curFamily = 'Helvetica';
						if(currentFont.includes('BoldOblique')) curStyle = 'Bold Italic';
						else if(currentFont.includes('Bold')) curStyle = 'Bold';
						else if(currentFont.includes('Oblique')) curStyle = 'Italic';
					} else if(currentFont === 'Symbol'){
						curFamily = 'Symbol';
					} else if(currentFont === 'ZapfDingbats'){
						curFamily = 'ZapfDingbats';
					}

					familySel.value = curFamily;
					styleSel.value = curStyle;
					if(curFamily === 'Symbol' || curFamily === 'ZapfDingbats') styleSel.disabled = true;

					const updateFont = () => {
						const f = familySel.value;
						const s = styleSel.value;
						let res = f;
						
						if(f === 'Symbol' || f === 'ZapfDingbats'){
							styleSel.disabled = true;
							res = f;
						} else {
							styleSel.disabled = false;
							if(f === 'Times'){
								if(s === 'Normal') res = 'Times-Roman';
								else if(s === 'Bold') res = 'Times-Bold';
								else if(s === 'Italic') res = 'Times-Italic';
								else if(s === 'Bold Italic') res = 'Times-BoldItalic';
							} else {
								// Helvetica or Courier
								res = f;
								if(s === 'Normal') {}
								else if(s === 'Bold') res += '-Bold';
								else if(s === 'Italic') res += '-Oblique';
								else if(s === 'Bold Italic') res += '-BoldOblique';
							}
						}
						overlay.font = res;
						if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
					};

					familySel.onchange = updateFont;
					styleSel.onchange = updateFont;

					fontWrap.appendChild(fontLbl);
					fontWrap.appendChild(familySel);
					fontWrap.appendChild(styleSel);
					row.appendChild(fontWrap);

					row.appendChild(createFacingInput(overlay));

					row.appendChild(createTextInput('Prefix', 'prefix', overlay.prefix));
					row.appendChild(createInput('Digits', 'digits', overlay.digits));
					row.appendChild(createTextInput('Pages', 'pageRange', overlay.pageRange));
					row.appendChild(createInput('Size (pt)', 'fontSize', overlay.fontSize));
					row.appendChild(createInput('Pos X', 'x', overlay.x));
					row.appendChild(createInput('Pos Y', 'y', overlay.y));
					row.appendChild(createCmykInput(overlay));

				} else if (overlay.type === 'colorbar') {
					const mkInp = (lbl, k, v) => {
						const w = createInput(lbl, k, v);
						w.querySelector('input').oninput = (e) => {
							overlay[k] = parseFloat(e.target.value) || 0;
							if(window.drawSheetOverlays) window.drawSheetOverlays();
						};
						return w;
					};
					row.appendChild(mkInp('Cell Size', 'cellSize', overlay.cellSize));
					row.appendChild(mkInp('Pos X', 'x', overlay.x));
					row.appendChild(mkInp('Pos Y', 'y', overlay.y));
					
					const vertWrap = document.createElement('div');
					vertWrap.style.display = 'flex';
					vertWrap.style.alignItems = 'center';
					vertWrap.style.marginBottom = '4px';
					const vertLbl = document.createElement('label');
					vertLbl.textContent = 'Vertical';
					vertLbl.style.width = '50px';
					vertLbl.style.fontSize = '10px';
					vertLbl.style.color = '#aaa';
					const vertCheck = document.createElement('input');
					vertCheck.type = 'checkbox';
					vertCheck.checked = !!overlay.vertical;
					vertCheck.onchange = (e) => { overlay.vertical = e.target.checked; if(window.drawSheetOverlays) window.drawSheetOverlays(); };
					vertWrap.appendChild(vertLbl);
					vertWrap.appendChild(vertCheck);
					row.appendChild(vertWrap);
				} else if (overlay.type === 'duplex') {
					const mkInp = (lbl, k, v) => {
						const w = createInput(lbl, k, v);
						w.querySelector('input').oninput = (e) => {
							overlay[k] = parseFloat(e.target.value) || 0;
							if(window.drawSheetOverlays) window.drawSheetOverlays();
						};
						return w;
					};
					row.appendChild(mkInp('Size', 'size', overlay.size));
					row.appendChild(mkInp('Thickness', 'thickness', overlay.thickness));
					row.appendChild(mkInp('Pos X', 'x', overlay.x));
					row.appendChild(mkInp('Pos Y', 'y', overlay.y));

				} else if (overlay.type === 'regmark') {
					row.appendChild(createInput('Pos X', 'x', overlay.x));
					row.appendChild(createInput('Pos Y', 'y', overlay.y));
					row.appendChild(createOpacityInput(overlay));

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
			renderOverlayInputs();
			if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		};

		addNumBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			let newOverlay = { type: 'numbering', fontSize: 12, x: 5, y: 5, font: 'Helvetica', cmyk: [0, 0, 0, 1] };
			const existing = window.__overlays.find(o => o.type === 'numbering');
			if(existing){
				newOverlay = Object.assign({}, existing);
			}
			window.__overlays.push(newOverlay);
			renderOverlayInputs();
			if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		};

		addColorBarBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			window.__overlays.push({ type: 'colorbar', cellSize: 5, x: 5, y: 50, vertical: true });
			renderOverlayInputs();
			if(window.drawSheetOverlays) window.drawSheetOverlays();
		};

		addDuplexBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			window.__overlays.push({ type: 'duplex', size: 5, thickness: 0.2, x: 10, y: 10 });
			renderOverlayInputs();
			if(window.drawSheetOverlays) window.drawSheetOverlays();
		};

		addRegMarkBtn.onclick = () => {
			if(!window.__overlays) window.__overlays = [];
			window.__overlays.push({ type: 'regmark', x: 0, y: 0, opacity: 1 });
			renderOverlayInputs();
			if(window.drawSheetOverlays) window.drawSheetOverlays();
		};
		
		// Initial render
		renderOverlayInputs();
	}

	// wire UI: Right Toolbar Tabs
	const rtTabTransform = document.getElementById('rtTabTransform');
	const rtTabLayout = document.getElementById('rtTabLayout');
	const rtContentTransform = document.getElementById('rtContentTransform');
	const rtContentLayout = document.getElementById('rtContentLayout');

	if(rtTabTransform && rtTabLayout && rtContentTransform && rtContentLayout){
		rtTabTransform.addEventListener('click', () => {
			rtTabTransform.style.borderBottomColor = '#00bcd4';
			rtTabTransform.style.color = '#fff';
			rtTabLayout.style.borderBottomColor = 'transparent';
			rtTabLayout.style.color = '#888';
			rtContentTransform.style.display = 'block';
			rtContentLayout.style.display = 'none';
		});
		rtTabLayout.addEventListener('click', () => {
			rtTabLayout.style.borderBottomColor = '#00bcd4';
			rtTabLayout.style.color = '#fff';
			rtTabTransform.style.borderBottomColor = 'transparent';
			rtTabTransform.style.color = '#888';
			rtContentTransform.style.display = 'none';
			rtContentLayout.style.display = 'block';
		});
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

	// wire UI: smart fit checkbox
	if(smartFitCheckbox){
		smartFitCheckbox.addEventListener('change', ()=>{
			window.__preferUpscaleNotRotate = smartFitCheckbox.checked;
			window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
		});
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
		const firstPage = pageNums.length > 0 ? pageNums[0] : null;
		const t = (firstPage && window.__pageTransforms[firstPage]) || {};

		const curX = (isSpecific && typeof t.scaleX === 'number') ? t.scaleX : (window.__currentScaleX || 1);
		const curY = (isSpecific && typeof t.scaleY === 'number') ? t.scaleY : (window.__currentScaleY || 1);
		const isUnlocked = (typeof unlockRatioCheckbox !== 'undefined' && unlockRatioCheckbox && unlockRatioCheckbox.checked);

		if(isWidth){
			// If unlocked, update X only. If locked, update both to maintain aspect ratio.
			if(isUnlocked) window.adjustContentScale(newScale, curY, isSpecific ? pageNums : null);
			else window.adjustContentScale(newScale, newScale, isSpecific ? pageNums : null);
		} else {
			// If unlocked, update Y only. If locked, update both.
			if(isUnlocked) window.adjustContentScale(curX, newScale, isSpecific ? pageNums : null);
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
			const x = parseFloat(boxXInput.value) || 0;
			const pageNums = (slotPageCheck && slotPageCheck.checked) ? parsePageRange(slotPageNum.value) : null;
			window.adjustSlotPosition(x, undefined, pageNums);
		});
		boxXInput.addEventListener('mousedown', handleStep);
	}
	if(boxYInput){
		boxYInput.addEventListener('input', ()=>{
			const y = parseFloat(boxYInput.value) || 0;
			const pageNums = (slotPageCheck && slotPageCheck.checked) ? parsePageRange(slotPageNum.value) : null;
			window.adjustSlotPosition(undefined, y, pageNums);
		});
		boxYInput.addEventListener('mousedown', handleStep);
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
				}, 500);
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

	// Wrap openPdfFile to enforce layout settings on load
	const originalOpenPdf = window.openPdfFile;
	window.openPdfFile = async function(arg){
		await originalOpenPdf(arg);
		if(layoutSelect && layoutSelect.value && layoutSelect.value !== 'Default'){
			window.applyCurrentLayout();
		}
	};

	// Sync UI inputs to match the currently selected slot (or global defaults)
	window.syncSelectionToUI = function(){
		const pxPerMm = 96 / 25.4;
		
		// Default / Global values
		let r = window.__currentRotation || 0;
		let sX = window.__currentScaleX || 1;
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

		if(window.__selectedSlots && window.__selectedSlots.length > 0){
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
		}

		// Update UI Elements
		const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
		const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };

		setVal('rotationInput', r);
		if(document.getElementById('rotationSlider')) document.getElementById('rotationSlider').value = (r > 180) ? (r - 360) : r;
		
		setVal('scaleSlider', Math.round(sX * 100));
		setTxt('scaleValue', Math.round(sX * 100) + '%');

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
	};