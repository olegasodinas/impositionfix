// Plugin: Filter Overlay
// Adds a physical "filter" box covering the whole sheet, colored by CMYK
// sliders, with selectable blend modes (Multiply, Screen, Lighten, ...) and
// opacity. Rendered in the preview via CSS mix-blend-mode and in the exported
// PDF via pdf-lib's ExtGState blend mode + opacity.
(function () {
    const STORAGE_KEY = 'pdf_plugin_filter_overlay';
    const LAYER_ID = 'plugin-filter-overlay-layer';

    // Blend modes: name as shown in UI, CSS mix-blend-mode value, pdf-lib value.
    const MODES = [
        { label: 'Normal',       css: 'normal',      pdf: 'Normal' },
        { label: 'Multiply',     css: 'multiply',    pdf: 'Multiply' },
        { label: 'Screen',       css: 'screen',      pdf: 'Screen' },
        { label: 'Overlay',      css: 'overlay',     pdf: 'Overlay' },
        { label: 'Darken',       css: 'darken',      pdf: 'Darken' },
        { label: 'Lighten',      css: 'lighten',     pdf: 'Lighten' },
        { label: 'Color Dodge',  css: 'color-dodge', pdf: 'ColorDodge' },
        { label: 'Color Burn',   css: 'color-burn',  pdf: 'ColorBurn' },
        { label: 'Hard Light',   css: 'hard-light',  pdf: 'HardLight' },
        { label: 'Soft Light',   css: 'soft-light',  pdf: 'SoftLight' },
        { label: 'Difference',   css: 'difference',  pdf: 'Difference' },
        { label: 'Exclusion',    css: 'exclusion',   pdf: 'Exclusion' },
        { label: 'Hue',          css: 'hue',         pdf: 'Hue' },
        { label: 'Saturation',   css: 'saturation',  pdf: 'Saturation' },
        { label: 'Color',        css: 'color',       pdf: 'Color' },
        { label: 'Luminosity',   css: 'luminosity',  pdf: 'Luminosity' },
        // Custom mode: weighted by a midtone luminance mask so pure white and
        // pure black are left completely untouched. Preview uses an SVG
        // backdrop-filter (see ensureMidtoneFilter); PDF export approximates
        // with SoftLight, which also preserves pure black/white exactly.
        { label: 'Midtones Only', css: 'midtone',    pdf: 'SoftLight', midtone: true }
    ];

    const MIDTONE_FILTER_ID = 'plugin-midtone-filter';
    const MIDTONE_FLOOD_ID = 'plugin-midtone-flood';
    const MIDTONE_FUNCA_ID = 'plugin-midtone-funca';

    // Rebuild the feFuncA alpha table so the midtone mask covers luminance
    // [toneLo, toneHi] with soft ~12% feathered edges (shrunk if the window
    // is narrow). 21 knots => piecewise-linear L steps of 0.05.
    function updateMidtoneTable(lo, hi) {
        const funcA = document.getElementById(MIDTONE_FUNCA_ID);
        if (!funcA) return;
        lo = Math.max(0, Math.min(1, lo !== undefined ? lo : 0.2));
        hi = Math.max(0, Math.min(1, hi !== undefined ? hi : 0.8));
        if (hi <= lo) hi = Math.min(1, lo + 0.05);
        const N = 21;
        const feather = Math.min(0.12, (hi - lo) / 2);
        const vals = [];
        for (let i = 0; i < N; i++) {
            const L = i / (N - 1);
            let w = 1;
            if (L < lo + feather) w = (L - lo) / feather;
            if (L > hi - feather) w = Math.min(w, (hi - L) / feather);
            vals.push(Math.max(0, Math.min(1, w)).toFixed(3));
        }
        funcA.setAttribute('tableValues', vals.join(' '));
    }

    // Inject (once) the SVG filter used by the "Midtones Only" mode:
    //   1. luminanceToAlpha  -> per-pixel backdrop luminance L
    //   2. alpha table 0,0,1,1,0,0 -> mask w (0 below ~20% L, ramps to 1 in
    //      the 40-60% midtones, back to 0 above ~80% L)
    //   3. flood the filter color, clipped by the mask (F * w)
    //   4. feBlend multiply with the backdrop: co = B*(1-w) + B*F*w
    //      => darkens midtones toward the filter color; white (w=0) and
    //         black (w=0) pass through unchanged.
    function ensureMidtoneFilter() {
        let svg = document.getElementById(MIDTONE_FILTER_ID);
        if (svg) return svg;
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = MIDTONE_FILTER_ID;
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', MIDTONE_FILTER_ID + '-f');
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        filter.setAttribute('x', '0');
        filter.setAttribute('y', '0');
        filter.setAttribute('width', '100%');
        filter.setAttribute('height', '100%');
        const mk = (tag, attrs) => {
            const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
            Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
            filter.appendChild(el);
            return el;
        };
        mk('feColorMatrix', { type: 'luminanceToAlpha', result: 'lum' });
        const funcA = mk('feComponentTransfer', { in: 'lum', result: 'mask' });
        funcA.appendChild(mk('feFuncA', { id: MIDTONE_FUNCA_ID, type: 'table', tableValues: '0 0 1 1 0 0' }));
        mk('feFlood', { id: MIDTONE_FLOOD_ID, 'flood-color': '#808080', 'flood-opacity': '0.5', result: 'flood' });
        mk('feComposite', { in: 'flood', in2: 'mask', operator: 'in', result: 'fw' });
        mk('feBlend', { in: 'fw', in2: 'SourceGraphic', mode: 'multiply' });
        svg.appendChild(filter);
        document.body.appendChild(svg);
        return svg;
    }

    const overlay = {
        id: 'filter-overlay',
        // State (restored in init). CMYK channels are 0-1.
        cmyk: [0, 0, 0, 0],
        mode: 'Multiply',
        opacity: 0.5,
        // Midtone mode window (backdrop luminance 0-1) controlled by the
        // "Tone Range" sliders: effect fades in above toneLo and out below toneHi.
        toneLo: 0.2,
        toneHi: 0.8,

        // Custom settings UI rendered inside the Data tab's plugin fold-out
        // panel (supported by ui.js renderPluginOverlays).
        renderSettings: function (panel) { buildFilterPanel(panel); },

        // ---- Preview: full-sheet DOM layer with CSS mix-blend-mode ----
        drawPreview: function (container, pageNum, slotIndex) {
            if (this.visible === false) return;
            const sheet = container.closest ? container.closest('.page') : null;
            if (!sheet) return;
            // NOTE: query within the sheet — there is one layer per .page
            let layer = sheet.querySelector('#' + LAYER_ID);
            if (!layer) {
                layer = document.createElement('div');
                layer.id = LAYER_ID;
                layer.style.position = 'absolute';
                layer.style.inset = '0';
                layer.style.pointerEvents = 'none';
                layer.style.zIndex = '40';
                sheet.appendChild(layer);
            }
            applyLayerStyle.call(this, layer);
        },

        // ---- PDF export: full-sheet rectangle with ExtGState blend mode ----
        // Drawn from the SHEET-level pass (drawPdfSheet runs after every slot of
        // the sheet has already been placed in the content stream). This is the
        // correct home for a full-sheet filter.
        //
        // Previously this lived in drawPdf, which is invoked once per SLOT via
        // drawPdfOverlays. The __filterOverlayDrawn guard forced it to draw on
        // the FIRST slot, putting the full-page rectangle into the stream
        // between slot 1 and slot 2. Slots 2..N were then painted ON TOP of the
        // filter, so on every sheet only the first page's content was blended —
        // while the white sheet/paper background (already in the stream around
        // the slots) was tinted. A full-sheet filter must cover every slot, so
        // it must be emitted after all slot content.
        drawPdfSheet: function (newPage, pxToPt, pdfLib, sheetIndex, sheetWidthPt) {
            if (this.visible === false) return;
            try {
                let size = null;
                try { size = newPage.getSize(); } catch (e) { /* ignore */ }
                const W = size ? size.width : (sheetWidthPt || newPage.getWidth());
                const H = size ? size.height : newPage.getHeight();
                const c = this.cmyk || [0, 0, 0, 0];
                const opacity = Math.max(0, Math.min(1, this.opacity !== undefined ? this.opacity : 0.5));
                const modeDef = MODES.find(m => m.pdf === this.mode) || MODES[1];
                // "Midtones Only" exports as SoftLight: mathematically keeps pure
                // black (Cb=0) and pure white (Cb=1) unchanged and weights the
                // effect toward midtones. The on-screen SVG mask is stricter
                // (hard 20-80% window), which a PDF ExtGState cannot express.
                const opts = {
                    x: 0,
                    y: 0, // PDF coords, bottom-left origin (no wrapping proxy here)
                    width: W,
                    height: H,
                    color: pdfLib.cmyk(c[0] || 0, c[1] || 0, c[2] || 0, c[3] || 0),
                    opacity: opacity
                };
                try {
                    newPage.drawRectangle(Object.assign({}, opts, { blendMode: modeDef.pdf }));
                } catch (eNoBlend) {
                    // Older pdf-lib without blendMode support — still apply color+opacity.
                    newPage.drawRectangle(opts);
                }
            } catch (e) {
                console.error('[filter-overlay] drawPdfSheet failed:', e);
            }
        }
    };

    function applyLayerStyle(layer) {
        const c = (this.cmyk && this.cmyk.length === 4) ? this.cmyk : [0, 0, 0, 0];
        const rgb = (typeof cmykToRgbArray === 'function')
            ? cmykToRgbArray(c[0], c[1], c[2], c[3])
            : [1 - c[3], 1 - c[3], 1 - c[3]];
        const to255 = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255);
        const modeDef = MODES.find(m => m.pdf === this.mode) || MODES[1];
        const opacity = Math.max(0, Math.min(1, this.opacity !== undefined ? this.opacity : 0.5));
        if (modeDef.midtone) {
            // Custom SVG backdrop-filter path (exact midtone masking).
            ensureMidtoneFilter();
            updateMidtoneTable(this.toneLo, this.toneHi);
            const flood = document.getElementById(MIDTONE_FLOOD_ID);
            if (flood) {
                flood.setAttribute('flood-color', `rgb(${to255(rgb[0])}, ${to255(rgb[1])}, ${to255(rgb[2])})`);
                flood.setAttribute('flood-opacity', String(opacity));
            }
            layer.style.backgroundColor = 'transparent';
            layer.style.mixBlendMode = 'normal';
            layer.style.opacity = '1';
            layer.style.backdropFilter = 'url(#' + MIDTONE_FILTER_ID + '-f)';
            layer.style.webkitBackdropFilter = 'url(#' + MIDTONE_FILTER_ID + '-f)';
        } else {
            layer.style.backdropFilter = '';
            layer.style.webkitBackdropFilter = '';
            layer.style.backgroundColor = `rgb(${to255(rgb[0])}, ${to255(rgb[1])}, ${to255(rgb[2])})`;
            layer.style.mixBlendMode = modeDef.css;
            layer.style.opacity = opacity;
        }
    }

    // Sync every sheet: create/update layers when enabled, remove when disabled.
    // Wired as afterRender so stale layers can never survive a re-render.
    function syncLayers() {
        const o = overlay;
        document.querySelectorAll('.page').forEach(sheet => {
            let layer = sheet.querySelector('#' + LAYER_ID);
            if (o.visible === false) {
                if (layer) layer.remove();
                return;
            }
            if (!layer) {
                layer = document.createElement('div');
                layer.id = LAYER_ID;
                layer.style.position = 'absolute';
                layer.style.inset = '0';
                layer.style.pointerEvents = 'none';
                layer.style.zIndex = '40';
                sheet.appendChild(layer);
            }
            applyLayerStyle.call(o, layer);
        });
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                cmyk: overlay.cmyk, mode: overlay.mode, opacity: overlay.opacity,
                toneLo: overlay.toneLo, toneHi: overlay.toneHi
            }));
        } catch (e) { /* ignore */ }
    }


    // Shared UI registry: every built panel instance registers its controls so
    // refreshUI() can resync ALL instances (fold-out + Filter tab) from the
    // overlay state after any change. This avoids stale/disconnected closures
    // where one instance's controls stop reflecting the other's changes.
    function refreshUI() {
        if (!overlay.__ui) return;
        overlay.__ui = overlay.__ui.filter(u => u.root && u.root.isConnected);
        const en = !!(MODES.find(m => m.pdf === overlay.mode) || {}).midtone;
        // While a slider drag is in progress we must not rewrite any slider
        // .value (it breaks native drag tracking) — but the color swatch and
        // row dimming are safe to update live. This also keeps the swatch
        // fresh even if a pointerup was ever missed and the flag stuck.
        const dragging = !!overlay.__dragging;
        // A control the user is currently dragging must NOT be rewritten from
        // state — setting .value mid-drag breaks native drag tracking and the
        // slider feels dead. Skip the active element.
        const isBusy = (el) => el && (el === document.activeElement || el.matches(':active'));
        overlay.__ui.forEach(ui => {
            // Live color display — updated on every call, drag or not
            if (ui.swatch) paintSwatchEl(ui.swatch);
            if (dragging) return;
            if (ui.modeSel && !isBusy(ui.modeSel)) ui.modeSel.value = overlay.mode;
            // Tone range: dimmed (visual hint) outside Midtones mode, but the
            // sliders stay interactive so they can never get "stuck" inactive.
            ui.toneRows.forEach(r => { r.style.opacity = en ? '1' : '0.35'; });
            ui.toneInputs.forEach(s => {
                s.disabled = false;
                if (isBusy(s)) return;
                const key = s.dataset.key;
                s.value = String(Math.round((overlay[key] !== undefined ? overlay[key] : 0.2) * 100));
                const val = s.parentElement.querySelector('span:last-child');
                if (val) val.textContent = s.value + '%';
            });
            if (ui.opSlider && !isBusy(ui.opSlider)) {
                ui.opSlider.value = String(Math.round((overlay.opacity !== undefined ? overlay.opacity : 0.5) * 100));
                if (ui.opVal && !isBusy(ui.opVal)) ui.opVal.textContent = ui.opSlider.value + '%';
            }
            (ui.chSliders || []).forEach(s => {
                if (isBusy(s)) return;
                const ch = parseInt(s.dataset.ch, 10);
                s.value = String(Math.round((overlay.cmyk[ch] || 0) * 100));
                const val = s.parentElement.querySelector('span:last-child');
                if (val) val.textContent = s.value + '%';
            });
        });
    }

    function paintSwatchEl(el) {
        const rgb = (typeof cmykToRgbArray === 'function')
            ? cmykToRgbArray(overlay.cmyk[0], overlay.cmyk[1], overlay.cmyk[2], overlay.cmyk[3])
            : [1 - overlay.cmyk[3], 1 - overlay.cmyk[3], 1 - overlay.cmyk[3]];
        const to255 = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255);
        el.style.backgroundColor = `rgb(${to255(rgb[0])}, ${to255(rgb[1])}, ${to255(rgb[2])})`;
    }

    // Mark a slider as "being dragged" from pointerdown until pointerup.
    // Pointer events cover mouse, touch and pen — unlike :active/focus, which
    // are unreliable for range inputs on touch devices.
    function attachDragGuard(s) {
        if (!s || s.__dragGuard) return;
        s.__dragGuard = true;
        s.addEventListener('pointerdown', () => { overlay.__dragging = true; });
    }

    window.impositionfix.registerPlugin({
        name: 'filter-overlay',
        displayName: 'Filter Overlay',
        version: '1.0.0',

        overlays: [overlay],

        hooks: {
            afterRender: function () { syncLayers(); }
        },

        init: function (api) {
            // Restore persisted state
            try {
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
                if (saved) {
                    if (Array.isArray(saved.cmyk) && saved.cmyk.length === 4) overlay.cmyk = saved.cmyk;
                    if (saved.mode) overlay.mode = saved.mode;
                    if (saved.opacity !== undefined) overlay.opacity = saved.opacity;
                    if (saved.toneLo !== undefined) overlay.toneLo = saved.toneLo;
                    if (saved.toneHi !== undefined) overlay.toneHi = saved.toneHi;
                }
            } catch (e) { /* ignore */ }

            // ---- Settings tab (right toolbox) ----
            api.ui.tabs.push({
                id: 'filter-overlay',
                label: 'Filter',
                contentFn: function (panel) { buildFilterPanel(panel); }
            });

            // Release the drag guard and resync every panel once any slider
            // drag ends (registered once globally). 'blur' clears a flag that
            // got stuck by a pointerup outside the window (e.g. alt-tab).
            if (!overlay.__pointerUpWired) {
                overlay.__pointerUpWired = true;
                const endDrag = () => {
                    if (overlay.__dragging) {
                        overlay.__dragging = false;
                        refreshUI();
                    }
                };
                window.addEventListener('pointerup', endDrag);
                window.addEventListener('pointercancel', endDrag);
                window.addEventListener('blur', endDrag);
                document.addEventListener('pointerup', endDrag);
            }

            // The app's injectPluginUI() runs at DOMContentLoaded, but plugins
            // load asynchronously AFTER that — so the app never injects plugin
            // tabs on its own. Self-inject (idempotent, retried until the tab
            // bar exists), mirroring the app's injection logic in ui.js.
            let tries = 0;
            const tryInject = () => {
                const tabBar = document.querySelector('.rtTabBar');
                if (!tabBar) {
                    if (++tries < 40) setTimeout(tryInject, 250);
                    return;
                }
                if (tabBar.querySelector('[data-tab="filter-overlay"]')) return; // already there
                const tab = api.ui.tabs[api.ui.tabs.length - 1];
                const tabBtn = document.createElement('button');
                tabBtn.className = 'toolbox-btn';
                tabBtn.textContent = tab.label;
                tabBtn.dataset.tab = tab.id;
                tabBtn.onclick = () => {
                    document.querySelectorAll('.rtContentTab').forEach(p => p.style.display = 'none');
                    let panel = document.getElementById('tab-panel-' + tab.id);
                    if (!panel) {
                        panel = document.createElement('div');
                        panel.id = 'tab-panel-' + tab.id;
                        panel.className = 'rtContentTab';
                        panel.style.display = 'flex';
                        panel.style.flexDirection = 'column';
                        document.querySelector('.rtContentArea').appendChild(panel);
                        if (typeof tab.contentFn === 'function') tab.contentFn(panel);
                    } else {
                        panel.style.display = '';
                    }
                    document.querySelectorAll('.rtTabBar .toolbox-btn').forEach(b => {
                        b.style.borderBottom = '2px solid transparent';
                        b.style.color = '#888';
                    });
                    tabBtn.style.borderBottom = '2px solid #00bcd4';
                    tabBtn.style.color = '#fff';
                };
                tabBar.appendChild(tabBtn);
            };
            tryInject();
        }
    });

    function buildFilterPanel(panel) {
        panel.style.gap = '8px';

        const mkLabel = (txt) => {
            const l = document.createElement('label');
            l.textContent = txt;
            l.style.cssText = 'font-size:10px; color:#aaa; margin-top:4px';
            return l;
        };

        // NOTE: no enable checkbox here — the Data tab's plugin fold-out
        // toggle already turns the overlay on (when unfolded) and off
        // (when folded), keeping visible state in one place.

        // Blend mode
        panel.appendChild(mkLabel('Filter Mode'));
        const modeSel = document.createElement('select');
        modeSel.className = 'toolbox-input';
        MODES.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.pdf;
            opt.textContent = m.label;
            modeSel.appendChild(opt);
        });
        modeSel.value = overlay.mode;
        modeSel.onchange = () => {
            overlay.mode = modeSel.value;
            saveState();
            syncLayers();
            refreshUI();
        };
        panel.appendChild(modeSel);

        // Opacity
        panel.appendChild(mkLabel('Opacity'));
        const opRow = document.createElement('div');
        opRow.style.cssText = 'display:flex; align-items:center; gap:6px';
        const opSlider = document.createElement('input');
        opSlider.type = 'range';
        opSlider.min = '0'; opSlider.max = '100'; opSlider.step = '1';
        opSlider.value = String(Math.round((overlay.opacity !== undefined ? overlay.opacity : 0.5) * 100));
        opSlider.className = 'toolbox-slider';
        attachDragGuard(opSlider);
        const opVal = document.createElement('span');
        opVal.style.cssText = 'font-size:10px; color:#ccc; min-width:34px; text-align:right';
        const paintOp = () => { opVal.textContent = opSlider.value + '%'; };
        paintOp();
        opSlider.oninput = () => {
            overlay.opacity = parseInt(opSlider.value, 10) / 100;
            opVal.textContent = opSlider.value + '%';
            saveState();
            syncLayers();
            refreshUI();
        };
        opRow.appendChild(opSlider);
        opRow.appendChild(opVal);
        panel.appendChild(opRow);

        // Tone Range (Midtones Only mode): which luminance band is affected —
        // "from" = lights cutoff, "to" = darks cutoff. Sliders stay interactive
        // in every mode (dimmed outside Midtones) so they can never get stuck.
        const toneRows = [];
        const toneInputs = [];
        panel.appendChild(mkLabel('Tone Range (Midtones Only)'));
        const mkToneRow = (label, key, otherKey, isLower) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; gap:6px; margin-bottom:2px';
            const lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:10px; color:#aaa; min-width:56px';
            lbl.textContent = label;
            const s = document.createElement('input');
            s.type = 'range';
            s.min = '0'; s.max = '100'; s.step = '1';
            s.dataset.key = key;
            s.value = String(Math.round((overlay[key] !== undefined ? overlay[key] : 0.2) * 100));
            s.className = 'toolbox-slider';
            attachDragGuard(s);
            const val = document.createElement('span');
            val.style.cssText = 'font-size:10px; color:#ccc; min-width:34px; text-align:right';
            val.textContent = s.value + '%';
            s.oninput = () => {
                let v = parseInt(s.value, 10) / 100;
                const o = overlay[otherKey];
                // Keep the window valid: lo < hi with a small gap
                if (isLower && v > o - 0.05) v = Math.max(0, o - 0.05);
                if (!isLower && v < o + 0.05) v = Math.min(1, o + 0.05);
                overlay[key] = v;
                val.textContent = Math.round(v * 100) + '%';
                saveState();
                syncLayers();
                refreshUI();
            };
            toneRows.push(row);
            toneInputs.push(s);
            row.appendChild(lbl);
            row.appendChild(s);
            row.appendChild(val);
            panel.appendChild(row);
        };
        mkToneRow('From (light)', 'toneLo', 'toneHi', true);
        mkToneRow('To (dark)', 'toneHi', 'toneLo', false);

        // CMYK sliders + live swatch (sliders returned so Reset can sync UI)
        const { chSliders, swatch } = buildCmykControls(panel);

        // Register this panel instance for shared state->UI refreshes
        overlay.__ui = (overlay.__ui || []).filter(u => u.root && u.root.isConnected);
        overlay.__ui.push({ root: panel, modeSel, opSlider, opVal, toneRows, toneInputs, chSliders, swatch });

        // Reset to no-filter
        if (window.createToolboxBtn) {
            const resetBtn = window.createToolboxBtn('restart_alt', 'Reset (No Filter)', () => {
                overlay.cmyk = [0, 0, 0, 0];
                overlay.opacity = 0.5;
                overlay.mode = 'Multiply';
                saveState();
                syncLayers();
                refreshUI();
            }, 'Reset filter to transparent (no effect)');
            panel.appendChild(resetBtn);
        }
    }


    function buildCmykControls(panel) {
        // CMYK sliders + live swatch
        const mkLabel = (txt) => {
            const l = document.createElement('label');
            l.textContent = txt;
            l.style.cssText = 'font-size:10px; color:#aaa; margin-top:4px';
            return l;
        };
        panel.appendChild(mkLabel('CMYK Color'));
        const swatch = document.createElement('div');
        swatch.style.cssText = 'height:26px; border-radius:3px; border:1px solid #444; margin-bottom:4px';
        panel.appendChild(swatch);

        const names = ['Cyan (C)', 'Magenta (M)', 'Yellow (Y)', 'Black (K)'];
        const chSliders = [];
        names.forEach((name, ch) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; gap:6px; margin-bottom:2px';
            const lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:10px; color:#aaa; min-width:56px';
            lbl.textContent = name;
            const s = document.createElement('input');
            s.type = 'range';
            s.min = '0'; s.max = '100'; s.step = '1';
            s.dataset.ch = String(ch);
            s.value = String(Math.round((overlay.cmyk[ch] || 0) * 100));
            s.className = 'toolbox-slider';
            attachDragGuard(s);
            const val = document.createElement('span');
            val.style.cssText = 'font-size:10px; color:#ccc; min-width:34px; text-align:right';
            val.textContent = s.value + '%';
            s.oninput = () => {
                overlay.cmyk[ch] = parseInt(s.value, 10) / 100;
                val.textContent = s.value + '%';
                saveState();
                syncLayers();
                refreshUI();
            };
            chSliders.push(s);
            row.appendChild(lbl);
            row.appendChild(s);
            row.appendChild(val);
            panel.appendChild(row);
        });
        paintSwatchEl(swatch);
        return { chSliders, swatch };
    }
})();

