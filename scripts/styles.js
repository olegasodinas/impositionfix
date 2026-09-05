/*
    ImpositionFix - PDF Imposition Tool
    Copyright (C) 2026 Olegas Spausdinimas
*/

window.__textStyles = {};
window.__activeStyleId = null;
window.__customFonts = window.__customFonts || {};
window.__fontVariationsCache = {}; // Cache for variable font instances
window.__systemFontsList = [];

// ---- Color helpers (shared by Styles tab + renderers) ----
function cmykToRgbArray(c, m, y, k) {
    return [
        Math.max(0, Math.min(1, (1 - (c || 0)) * (1 - (k || 0)))),
        Math.max(0, Math.min(1, (1 - (m || 0)) * (1 - (k || 0)))),
        Math.max(0, Math.min(1, (1 - (y || 0)) * (1 - (k || 0))))
    ];
}

function rgbToCmykArray(r, g, b) {
    r = Math.max(0, Math.min(1, r || 0));
    g = Math.max(0, Math.min(1, g || 0));
    b = Math.max(0, Math.min(1, b || 0));
    const k = 1 - Math.max(r, g, b);
    const denom = (1 - k) || 1;
    return [
        Math.max(0, Math.min(1, (1 - r - k) / denom)),
        Math.max(0, Math.min(1, (1 - g - k) / denom)),
        Math.max(0, Math.min(1, (1 - b - k) / denom)),
        Math.max(0, Math.min(1, k))
    ];
}

// HSV helpers for the visual picker (h in degrees 0-360, s/v 0-1).
function rgbToHsv(r, g, b) {
    r = r || 0; g = g || 0; b = b || 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    const s = (max === 0) ? 0 : d / max;
    return [h, s, max];
}

function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s || 0));
    v = Math.max(0, Math.min(1, v || 0));
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [r + m, g + m, b + m];
}

// ---- Editable color palettes (CMYK + RGB), persisted to localStorage ----
const PALETTE_STORAGE_KEY = 'pdf_color_palettes';

function defaultCmykPalette() {
    return [
        { name: 'Cyan',       c: [1, 0, 0, 0] },
        { name: 'Magenta',    c: [0, 1, 0, 0] },
        { name: 'Yellow',     c: [0, 0, 1, 0] },
        { name: 'Black',      c: [0, 0, 0, 1] },
        { name: 'Red',        c: [0, 1, 1, 0] },
        { name: 'Green',      c: [1, 0, 1, 0] },
        { name: 'Blue',       c: [1, 1, 0, 0] },
        { name: 'Rich Black', c: [0.6, 0.4, 0.4, 1] },
        { name: 'Orange',     c: [0, 0.6, 1, 0] },
        { name: 'Purple',     c: [0.5, 1, 0, 0] },
        { name: 'Warm Gray',  c: [0, 0.12, 0.2, 0.28] },
        { name: 'Brown',      c: [0, 0.6, 1, 0.4] }
    ];
}

function defaultRgbPalette() {
    return [
        { name: 'White',    c: [1, 1, 1] },
        { name: 'Silver',   c: [0.75, 0.75, 0.75] },
        { name: 'Gray',     c: [0.5, 0.5, 0.5] },
        { name: 'Black',    c: [0, 0, 0] },
        { name: 'Red',      c: [1, 0, 0] },
        { name: 'Maroon',   c: [0.5, 0, 0] },
        { name: 'Orange',   c: [1, 0.65, 0] },
        { name: 'Yellow',   c: [1, 1, 0] },
        { name: 'Lime',     c: [0, 1, 0] },
        { name: 'Green',    c: [0, 0.5, 0] },
        { name: 'Cyan',     c: [0, 1, 1] },
        { name: 'Blue',     c: [0, 0, 1] },
        { name: 'Navy',     c: [0, 0, 0.5] },
        { name: 'Magenta',  c: [1, 0, 1] },
        { name: 'Purple',   c: [0.5, 0, 0.5] }
    ];
}

function loadColorPalettes() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(PALETTE_STORAGE_KEY)); } catch (e) {}
    window.__cmykPalette = (saved && Array.isArray(saved.cmyk)) ? saved.cmyk : defaultCmykPalette();
    window.__rgbPalette  = (saved && Array.isArray(saved.rgb))  ? saved.rgb  : defaultRgbPalette();
}

function saveColorPalettes() {
    if (!window.__saveSettingsEnabled) return;
    try {
        localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify({
            cmyk: window.__cmykPalette,
            rgb: window.__rgbPalette
        }));
    } catch (e) {}
}

// Read the active color space + channel array of a text style.
// Legacy styles have no `colorSpace`, default to CMYK.
function styleColorChannels(style) {
    const space = (style && style.colorSpace) || 'cmyk';
    const c = (style && style.color) || [0, 0, 0, 1];
    return { space, c: c.slice() };
}

// CSS rgb() string for the on-screen preview.
window.styleColorToCss = function (style) {
    const { space, c } = styleColorChannels(style);
    if (space === 'rgb') {
        return `rgb(${Math.round((c[0] || 0) * 255)}, ${Math.round((c[1] || 0) * 255)}, ${Math.round((c[2] || 0) * 255)})`;
    }
    const rgb = cmykToRgbArray(c[0], c[1], c[2], c[3]);
    return `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`;
};

// pdf-lib color object for PDF export (uses the matching rgb/cmyk factory).
window.styleTextColor = function (style, pdfLib) {
    const { space, c } = styleColorChannels(style);
    if (space === 'rgb') {
        return pdfLib.rgb(c[0] || 0, c[1] || 0, c[2] || 0);
    }
    return pdfLib.cmyk(c[0] || 0, c[1] || 0, c[2] || 0, c[3] || 0);
};

const PRELOAD_FONTS = [
    // Uncomment and modify to load your fonts:
    // { name: 'MyFont', url: 'fonts/MyFont.ttf' },
    // Example:
    // { name: 'Oswald-Variable', url: 'fonts/Oswald-VariableFont_wght.ttf' },
    // { name: 'NotoSans-Variable', url: 'fonts/NotoSans-VariableFont_wdth,wght.ttf' },
    // { name: 'NotoSans-Italic-Variable', url: 'fonts/NotoSans-Italic-VariableFont_wdth,wght.ttf' },
    // { name: 'NotoSerif-Variable', url: 'fonts/NotoSerif-VariableFont_wdth,wght.ttf' },
    // { name: 'NotoSerif-Italic-Variable', url: 'fonts/NotoSerif-Italic-VariableFont_wdth,wght.ttf' },
    // { name: 'OpenSans-Variable', url: 'fonts/OpenSans-VariableFont_wdth,wght.ttf' },
    // { name: 'OpenSans-Italic-Variable', url: 'fonts/OpenSans-Italic-VariableFont_wdth,wght.ttf' },
    // { name: 'Roboto-Variable', url: 'fonts/Roboto-VariableFont_wdth,wght.ttf' },
    // { name: 'Roboto-Italic-Variable', url: 'fonts/Roboto-Italic-VariableFont_wdth,wght.ttf' },
    // { name: 'RobotoSerif-Variable', url: 'fonts/RobotoSerif-VariableFont_GRAD,opsz,wdth,wght.ttf' },
    // { name: 'RobotoSerif-Italic-Variable', url: 'fonts/RobotoSerif-Italic-VariableFont_GRAD,opsz,wdth,wght.ttf' },
];

async function ensureFontkit() {
    if (window.fontkit) return true;
    try {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'libs/fontkit.min.js';
            s.onload = resolve;
            s.onerror = () => reject(new Error('Local load failed'));
            document.head.appendChild(s);
        });
        return true;
    } catch (e) {
        try {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://unpkg.com/@pdf-lib/fontkit/dist/fontkit.umd.js';
                s.onload = resolve;
                s.onerror = () => reject(new Error('CDN load failed'));
                document.head.appendChild(s);
            });
            return true;
        } catch(e2) {
            console.warn("Could not load fontkit library:", e2);
            return false;
        }
    }
}

async function getFontVariations(fontName) {
    if (window.__fontVariationsCache[fontName]) return window.__fontVariationsCache[fontName];
    const fontData = window.__customFonts[fontName];
    if (!fontData) return null;
    const buffer = fontData.buffer;
    if (!buffer) return null;

    if (!window.fontkit && !(await ensureFontkit())) return null;

    try {
        const font = window.fontkit.create(new Uint8Array(buffer));
        if (font.namedVariations) {
            const vars = Object.keys(font.namedVariations);
            if (vars.length > 0) {
                // Store both names and the mapping for future use (e.g. CSS mapping)
                window.__fontVariationsCache[fontName] = { names: vars, map: font.namedVariations };
                return window.__fontVariationsCache[fontName];
            }
        }
    } catch (e) {
        console.warn("Error parsing font variations:", e);
    }
    return null;
}

async function loadPreloadedFonts() {
    if (PRELOAD_FONTS.length) {
        // file:// protocol blocks fetching local resources in the browser.
        if (window.location.protocol === 'file:') {
            console.warn("Cannot preload fonts via file:// protocol due to browser security (CORS).");
            alert("Warning: You are opening this file directly (file://).\n\nBrowser security prevents loading custom fonts automatically from the 'fonts/' folder in this mode.\n\nSolution:\n1. Use the 'Load Full Font File' button to load fonts manually.\n2. OR run a local web server (e.g., 'npm start' or 'python3 -m http.server').");
            return;
        }
        for (const font of PRELOAD_FONTS) {
            try {
                const res = await fetch(font.url);
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const buffer = await res.arrayBuffer();
                const fontFace = new FontFace(font.name, buffer);
                await fontFace.load();
                document.fonts.add(fontFace);
                window.__customFonts[font.name] = { buffer: buffer.slice(0), path: font.url };
            } catch (e) {
                console.warn(`Failed to preload font ${font.name}:`, e);
                console.warn(`Check if file exists at: ${font.url}`);
                alert(`Failed to load font "${font.name}" from "${font.url}".\n\nCheck if the file exists and the name is correct.\nIf using local files, ensure you are running a local server (http://) not file://.`);
            }
        }
    }

    if (document.getElementById('rtContentStyles')) renderStylesUI();
}

window.saveCustomFontsList = function() {
    if(window.__saveSettingsEnabled){
        const paths = [];
        if (window.__customFonts) {
            for (const name in window.__customFonts) {
                if (window.__customFonts[name].path) {
                    paths.push({ name: name, path: window.__customFonts[name].path });
                }
            }
        }
        localStorage.setItem('pdf_custom_font_paths', JSON.stringify(paths));
    }
};

async function loadSavedCustomFonts() {
    // Saved fonts are restored from their in-memory buffers only; there is no
    // filesystem access in the browser web app.
    if (document.getElementById('rtContentStyles')) renderStylesUI();
}

window.showSystemFontPicker = async function(callback) {
    // System font enumeration is not available in the browser web app;
    // use the "Load Full Font File" button instead.
    alert("System fonts are not available in the web app.\n\nUse the 'Load Full Font File' button to load a TTF/OTF/WOFF file instead.");
};

function loadSystemFontsList() {
    // No system font enumeration in the browser web app.
    window.__systemFontsList = [];
}

window.initStylesTab = function() {
    const rtTabTransform = document.getElementById('rtTabTransform');
    const rtContentTransform = document.getElementById('rtContentTransform');
    
    if (!rtTabTransform || !rtContentTransform) return;

    if (document.getElementById('rtTabStyles')) {
        renderStylesUI();
        // Re-render the editor whenever the tab is clicked so saved swatches refresh live.
        const stylesTabBtn = document.getElementById('rtTabStyles');
        if (stylesTabBtn && !stylesTabBtn.dataset.refreshWired) {
            stylesTabBtn.dataset.refreshWired = '1';
            stylesTabBtn.addEventListener('click', () => { renderEditor(); });
            // Also reflect the renamed label.
            stylesTabBtn.textContent = 'Text Styles';
        }
        return;
    }

    const tabsContainer = rtTabTransform.parentNode;
    const contentContainer = rtContentTransform.parentNode;

    // Create Tab Button
    const stylesTab = document.createElement('button');
    stylesTab.id = 'rtTabStyles';
    stylesTab.className = 'toolbox-tab';
    stylesTab.textContent = 'Text Styles';
    stylesTab.style.flex = '1';
    stylesTab.style.background = 'transparent';
    stylesTab.style.border = 'none';
    stylesTab.style.borderBottom = '2px solid transparent';
    stylesTab.style.color = '#888';
    stylesTab.style.cursor = 'pointer';
    stylesTab.style.padding = '8px 0';
    stylesTab.style.fontSize = '12px';
    stylesTab.style.fontWeight = 'bold';
    
    tabsContainer.appendChild(stylesTab);

    // Create Content Area
    const stylesContent = document.createElement('div');
    stylesContent.id = 'rtContentStyles';
    stylesContent.style.display = 'none';
    stylesContent.style.padding = '10px';
    stylesContent.style.height = '100%';
    stylesContent.style.overflowY = 'auto';
    
    contentContainer.appendChild(stylesContent);

    renderStylesUI();
};

window.renderStylesUI = renderStylesUI;

window.__scratchColor = window.__scratchColor || { color: [0, 0, 0, 1], colorSpace: 'cmyk' };

window.renderColorSwatches = function (container, style, onChange) {
    container.innerHTML = '';
    const mkLabel = (txt) => {
        const l = document.createElement('label');
        l.textContent = txt;
        l.style.display = 'block';
        l.style.fontSize = '10px';
        l.style.color = '#aaa';
        l.style.marginBottom = '3px';
        return l;
    };
    const makeSwatch = (item, space) => {
        const wrap = document.createElement('div');
        wrap.style.position = 'relative';
        const sw = document.createElement('div');
        sw.title = item.name;
        sw.style.height = '20px';
        sw.style.borderRadius = '3px';
        sw.style.border = '1px solid #444';
        sw.style.cursor = 'pointer';
        // Outline the swatch that matches the style's currently picked color
        const isPicked = style && style.color && Array.isArray(item.c) &&
            space === (style.colorSpace || 'cmyk') &&
            item.c.length === style.color.length &&
            item.c.every((v, i) => Math.abs((v || 0) - (style.color[i] || 0)) < 0.001);
        if (isPicked) {
            sw.style.outline = '2px solid #fff';
            sw.style.outlineOffset = '-2px';
        }
        if (space === 'rgb') {
            sw.style.background = `rgb(${Math.round((item.c[0] || 0) * 255)}, ${Math.round((item.c[1] || 0) * 255)}, ${Math.round((item.c[2] || 0) * 255)})`;
        } else {
            const r = cmykToRgbArray(item.c[0], item.c[1], item.c[2], item.c[3]);
            sw.style.background = `rgb(${Math.round(r[0] * 255)}, ${Math.round(r[1] * 255)}, ${Math.round(r[2] * 255)})`;
        }
        sw.onclick = () => {
            style.colorSpace = space;
            style.color = item.c.slice();
            if (typeof onChange === 'function') onChange();
        };
        wrap.appendChild(sw);
        return wrap;
    };
    const cmykPal = (window.__cmykPalette || []);
    if (cmykPal.length) {
        container.appendChild(mkLabel('CMYK'));
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(6, 1fr)';
        grid.style.gap = '4px';
        grid.style.marginBottom = '8px';
        cmykPal.forEach((item) => grid.appendChild(makeSwatch(item, 'cmyk')));
        container.appendChild(grid);
    }
    const rgbPal = (window.__rgbPalette || []);
    if (rgbPal.length) {
        container.appendChild(mkLabel('RGB'));
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(6, 1fr)';
        grid.style.gap = '4px';
        rgbPal.forEach((item) => grid.appendChild(makeSwatch(item, 'rgb')));
        container.appendChild(grid);
    }
    if (!cmykPal.length && !rgbPal.length) {
        container.appendChild(mkLabel('No saved colors yet. Use the Swatches tab to create some.'));
    }
};

window.initColorTab = function () {
    const rtTabTransform = document.getElementById('rtTabTransform');
    if (!rtTabTransform) return;
    if (!document.getElementById('rtTabColor')) return;
    const render = () => {
        const container = document.getElementById('rtContentColor');
        if (!container) return;
        container.innerHTML = '';
        const header = document.createElement('h3');
        header.textContent = 'Color Swatches';
        container.appendChild(header);
        const sub = document.createElement('div');
        sub.style.fontSize = '11px';
        sub.style.color = '#888';
        sub.style.marginBottom = '10px';
        sub.textContent = 'Pick or mix a color, then Save it to the palette. Switch the profile (CMYK / RGB) to choose which palette it is saved to.';
        container.appendChild(sub);
        const mixerHost = document.createElement('div');
        container.appendChild(mixerHost);
        window.renderColorMixer(mixerHost, window.__scratchColor, () => {
            try {
                if (window.__saveSettingsEnabled) {
                    localStorage.setItem('pdf_scratch_color', JSON.stringify(window.__scratchColor));
                }
            } catch (e) {}
        });
    };
    const btn = document.getElementById('rtTabColor');
    if (btn) btn.addEventListener('click', render);
    render();
};
function renderStylesUI() {
    const container = document.getElementById('rtContentStyles');
    if(!container) return;
    container.innerHTML = '';

    // Initialize default style if none exists
    if (Object.keys(window.__textStyles).length === 0) {
        window.__textStyles['Default'] = createDefaultStyle();
        window.__activeStyleId = 'Default';
    }

    // Header
    const header = document.createElement('h3');
    header.textContent = 'Text Styles';
    container.appendChild(header);

    // Style List / Selector
    const listContainer = document.createElement('div');
    listContainer.style.marginBottom = '15px';
    
    const select = document.createElement('select');
    select.className = 'toolbox-input';
    select.style.width = '100%';
    select.style.marginBottom = '5px';
    
    const updateSelect = () => {
        select.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '-- Select Style --';
        select.appendChild(defaultOpt);
        
        Object.keys(window.__textStyles).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if(name === window.__activeStyleId) opt.selected = true;
            select.appendChild(opt);
        });
    };
    updateSelect();

    select.onchange = (e) => {
        window.__activeStyleId = e.target.value;
        renderEditor();
    };

    listContainer.appendChild(select);

    // Add / Delete Buttons
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '5px';

    const addBtn = window.createToolboxBtn('add', 'New', () => {
        window.showPrompt("Style Name:", "", (name) => {
            if(name && !window.__textStyles[name]){
                window.__textStyles[name] = createDefaultStyle();
                window.__activeStyleId = name;
                saveStyles();
                updateSelect();
                renderEditor();
            }
        });
    });
    addBtn.style.flex = '1';
    const delBtn = window.createDeleteBtn(() => {
        if(window.__activeStyleId && confirm(`Delete style "${window.__activeStyleId}"?`)){
            delete window.__textStyles[window.__activeStyleId];
            window.__activeStyleId = null;
            saveStyles();
            updateSelect();
            renderEditor();
        }
    });

    btnRow.appendChild(addBtn);
    btnRow.appendChild(delBtn);
    listContainer.appendChild(btnRow);
    container.appendChild(listContainer);

    // Editor Container
    const editorContainer = document.createElement('div');
    editorContainer.id = 'styleEditorContainer';
    container.appendChild(editorContainer);

    renderEditor();
}

function createDefaultStyle() {
    return {
        fontFamily: 'Helvetica',
        fontSize: 12,
        fontStyle: 'Normal',
        color: [0, 0, 0, 1], // CMYK
        colorSpace: 'cmyk',
        align: 'left',
        opacity: 1
    };
}

function saveStyles() {
    if(window.__saveSettingsEnabled){
        localStorage.setItem('pdf_text_styles', JSON.stringify(window.__textStyles));
    }

    // Update Data Merge cards if they are visible and re-render pages
    if (window.renderDataMergeCards) {
        window.renderDataMergeCards();
    }
    if (window.renderPages) {
        window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
    }
}

// Reusable color mixer: profile dropdown (RGB/CMYK), per-channel slider +
// numeric value, live swatch and a standard CMYK palette.
// `onChange` is called after each committed change (e.g. saveStyles()).
window.renderColorMixer = function (container, style, onChange) {
    container.innerHTML = '';

    const { space: initialSpace, c: initialColor } = styleColorChannels(style);

    let currentSpace = initialSpace;
    // Keep both representations always in sync so switching profiles never changes
    // the actual color.
    let cmyk = (currentSpace === 'cmyk')
        ? initialColor.slice()
        : rgbToCmykArray(initialColor[0], initialColor[1], initialColor[2]);
    let rgb = (currentSpace === 'rgb')
        ? initialColor.slice()
        : cmykToRgbArray(initialColor[0], initialColor[1], initialColor[2], initialColor[3]);
    // HSV is the master for the visual SV square + hue bar selection.
    let hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    let svCanvas, svCtx, svW, svH, hueCanvas, hueCtx, hueW, hueH;

    const mkRow = () => { const d = document.createElement('div'); d.style.marginBottom = '7px'; return d; };
    const mkLabel = (txt) => {
        const l = document.createElement('label');
        l.textContent = txt;
        l.style.display = 'block';
        l.style.fontSize = '10px';
        l.style.color = '#aaa';
        l.style.marginBottom = '2px';
        return l;
    };

    const colorFromCmyk = (c) => {
        const r = cmykToRgbArray(c[0], c[1], c[2], c[3]);
        return `rgb(${Math.round(r[0] * 255)}, ${Math.round(r[1] * 255)}, ${Math.round(r[2] * 255)})`;
    };
    const colorFromRgb = (r) => `rgb(${Math.round(r[0] * 255)}, ${Math.round(r[1] * 255)}, ${Math.round(r[2] * 255)})`;

    // Commit current working color into the style and notify.
    let channelRows = [];
    const swatch = document.createElement('div');
    const readout = document.createElement('div');

    const refresh = () => {
        channelRows.forEach((row) => {
            const val = (currentSpace === 'cmyk')
                ? Math.round(cmyk[row.idx] * 100)
                : Math.round(rgb[row.idx] * 255);
            row.slider.value = val;
            row.num.value = val;
            row.valLbl.textContent = String(val);
        });
        const css = (currentSpace === 'cmyk') ? colorFromCmyk(cmyk) : colorFromRgb(rgb);
        swatch.style.background = css;
        const fmt = (currentSpace === 'cmyk') ? cmyk.map(v => Math.round(v * 100)) : rgb.map(v => Math.round(v * 255));
        readout.textContent = currentSpace.toUpperCase() + '  ' + fmt.join(' / ');
        drawVisual();
    };

    // Draw the SV (saturation/value) square + hue bar from the current HSV.
    function drawVisual() {
        if (!svCanvas || !hueCanvas) return;
        const h = hsv[0];
        const w = svCanvas.width, hh = svCanvas.height;
        const base = `hsl(${h},100%,50%)`;
        const g1 = svCtx.createLinearGradient(0, 0, w, 0);
        g1.addColorStop(0, '#fff');
        g1.addColorStop(1, base);
        svCtx.fillStyle = g1;
        svCtx.fillRect(0, 0, w, hh);
        const g2 = svCtx.createLinearGradient(0, 0, 0, hh);
        g2.addColorStop(0, 'rgba(0,0,0,0)');
        g2.addColorStop(1, 'rgba(0,0,0,1)');
        svCtx.fillStyle = g2;
        svCtx.fillRect(0, 0, w, hh);

        // Marker at current S/V.
        const mx = hsv[1] * w;
        const my = (1 - hsv[2]) * hh;
        svCtx.beginPath();
        svCtx.arc(mx, my, 6, 0, Math.PI * 2);
        svCtx.lineWidth = 2;
        svCtx.strokeStyle = '#fff';
        svCtx.stroke();
        svCtx.beginPath();
        svCtx.arc(mx, my, 6, 0, Math.PI * 2);
        svCtx.lineWidth = 1;
        svCtx.strokeStyle = '#000';
        svCtx.stroke();

        // Hue bar.
        const hueGrad = hueCtx.createLinearGradient(0, 0, hueCanvas.width, 0);
        for (let i = 0; i <= 6; i++) hueGrad.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`);
        hueCtx.fillStyle = hueGrad;
        hueCtx.fillRect(0, 0, hueCanvas.width, hueCanvas.height);
        const hx = (h / 360) * hueCanvas.width;
        hueCtx.strokeStyle = '#fff';
        hueCtx.lineWidth = 2;
        hueCtx.beginPath();
        hueCtx.moveTo(hx, 0);
        hueCtx.lineTo(hx, hueCanvas.height);
        hueCtx.stroke();
        hueCtx.lineWidth = 1;
        hueCtx.strokeStyle = '#000';
        hueCtx.beginPath();
        hueCtx.moveTo(hx, 0);
        hueCtx.lineTo(hx, hueCanvas.height);
        hueCtx.stroke();
    }

    // Apply an HSV-derived color to the style in the currently selected profile.
    function applyHsv() {
        rgb = hsvToRgb(hsv[0], hsv[1], hsv[2]);
        cmyk = rgbToCmykArray(rgb[0], rgb[1], rgb[2]);
        commit();
    }

    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    const commit = () => {
        if (currentSpace === 'cmyk') {
            style.colorSpace = 'cmyk';
            style.color = cmyk.slice();
            rgb = cmykToRgbArray(cmyk[0], cmyk[1], cmyk[2], cmyk[3]);
        } else {
            style.colorSpace = 'rgb';
            style.color = rgb.slice();
            cmyk = rgbToCmykArray(rgb[0], rgb[1], rgb[2]);
        }
        hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
        if (typeof onChange === 'function') onChange();
        refresh();
    };

    // --- Visual picker (SV square + hue bar) ---
    const rVisual = mkRow();
    rVisual.appendChild(mkLabel('Color picker'));
    svCanvas = document.createElement('canvas');
    svCanvas.style.width = '100%';
    svCanvas.style.height = '150px';
    svCanvas.style.borderRadius = '5px';
    svCanvas.style.border = '1px solid #444';
    svCanvas.style.cursor = 'crosshair';
    svCanvas.style.display = 'block';
    svW = svCanvas.width = 300;
    svH = svCanvas.height = 150;
    svCtx = svCanvas.getContext('2d');
    rVisual.appendChild(svCanvas);

    hueCanvas = document.createElement('canvas');
    hueCanvas.style.width = '100%';
    hueCanvas.style.height = '18px';
    hueCanvas.style.borderRadius = '4px';
    hueCanvas.style.border = '1px solid #444';
    hueCanvas.style.cursor = 'pointer';
    hueCanvas.style.display = 'block';
    hueCanvas.style.marginTop = '6px';
    hueW = hueCanvas.width = 300;
    hueH = hueCanvas.height = 18;
    hueCtx = hueCanvas.getContext('2d');
    rVisual.appendChild(hueCanvas);
    container.appendChild(rVisual);

    // Drag/set Saturation + Value by clicking/dragging on the square.
    let svDragging = false;
    const pickSV = (e) => {
        const rect = svCanvas.getBoundingClientRect();
        const x = clamp01((e.clientX - rect.left) / rect.width);
        const y = clamp01((e.clientY - rect.top) / rect.height);
        hsv[1] = x;      // saturation across
        hsv[2] = 1 - y;  // value up (top = bright)
        applyHsv();
    };
    svCanvas.addEventListener('pointerdown', (e) => {
        svDragging = true;
        svCanvas.setPointerCapture(e.pointerId);
        pickSV(e);
    });
    svCanvas.addEventListener('pointermove', (e) => { if (svDragging) pickSV(e); });
    svCanvas.addEventListener('pointerup', () => { svDragging = false; });
    svCanvas.addEventListener('pointercancel', () => { svDragging = false; });

    // Drag/set Hue on the bar.
    let hueDragging = false;
    const pickHue = (e) => {
        const rect = hueCanvas.getBoundingClientRect();
        const x = clamp01((e.clientX - rect.left) / rect.width);
        hsv[0] = x * 360;
        // If the current color is black/gray (saturation or value is 0), the
        // hue alone can't change anything — hsvToRgb(h, 0, 0) stays black and
        // the bar looks dead until the SV square is touched. Seed S/V so the
        // picked hue becomes visible immediately.
        if (hsv[1] <= 0) hsv[1] = 1;
        if (hsv[2] <= 0) hsv[2] = 1;
        applyHsv();
    };
    hueCanvas.addEventListener('pointerdown', (e) => {
        hueDragging = true;
        hueCanvas.setPointerCapture(e.pointerId);
        pickHue(e);
    });
    hueCanvas.addEventListener('pointermove', (e) => { if (hueDragging) pickHue(e); });
    hueCanvas.addEventListener('pointerup', () => { hueDragging = false; });
    hueCanvas.addEventListener('pointercancel', () => { hueDragging = false; });

    // --- Profile dropdown ---
    const rProfile = mkRow();
    rProfile.appendChild(mkLabel('Color profile'));
    const profileSel = document.createElement('select');
    profileSel.className = 'toolbox-input';
    profileSel.style.width = '100%';
    [
        ['cmyk', 'CMYK'],
        ['rgb', 'RGB']
    ].forEach(([v, l]) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = l;
        profileSel.appendChild(o);
    });
    profileSel.value = currentSpace;
    profileSel.onchange = () => {
        currentSpace = profileSel.value;
        buildChannels();
        buildPalette();
        if (palHeaderLabel) palHeaderLabel.textContent = currentSpace === 'cmyk' ? 'Palette (CMYK)' : 'Palette (RGB)';
        commit();
    };
    rProfile.appendChild(profileSel);
    container.appendChild(rProfile);

    // --- Swatch + readout ---
    const rSwatch = mkRow();
    const swRow = document.createElement('div');
    swRow.style.display = 'flex';
    swRow.style.alignItems = 'center';
    swRow.style.gap = '6px';
    swatch.style.width = '38px';
    swatch.style.height = '34px';
    swatch.style.borderRadius = '4px';
    swatch.style.border = '1px solid #555';
    swatch.style.flexShrink = '0';
    readout.style.fontSize = '10px';
    readout.style.color = '#ccc';
    readout.style.fontFamily = 'monospace';
    swRow.appendChild(swatch);
    swRow.appendChild(readout);
    rSwatch.appendChild(swRow);
    container.appendChild(rSwatch);

    // --- Channel sliders + values ---
    const channelsWrap = document.createElement('div');
    container.appendChild(channelsWrap);

    function buildChannels() {
        channelsWrap.innerHTML = '';
        channelRows = [];
        const isCmyk = (currentSpace === 'cmyk');
        const n = isCmyk ? 4 : 3;
        const labels = isCmyk ? ['C', 'M', 'Y', 'K'] : ['R', 'G', 'B'];
        const max = isCmyk ? 100 : 255;

        for (let i = 0; i < n; i++) {
            const row = mkRow();
            const top = document.createElement('div');
            top.style.display = 'flex';
            top.style.justifyContent = 'space-between';
            const lab = document.createElement('label');
            lab.textContent = labels[i];
            lab.style.fontSize = '10px';
            lab.style.color = '#aaa';
            const valLbl = document.createElement('label');
            valLbl.style.fontSize = '10px';
            valLbl.style.color = '#ccc';
            top.appendChild(lab);
            top.appendChild(valLbl);

            const bottom = document.createElement('div');
            bottom.style.display = 'flex';
            bottom.style.gap = '5px';
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = 0;
            slider.max = max;
            slider.className = 'toolbox-slider';
            slider.style.flex = '1';
            const num = document.createElement('input');
            num.type = 'number';
            num.min = 0;
            num.max = max;
            num.className = 'toolbox-input no-spin';
            num.style.width = '52px';
            num.style.textAlign = 'center';

            bottom.appendChild(slider);
            bottom.appendChild(num);
            row.appendChild(top);
            row.appendChild(bottom);
            channelsWrap.appendChild(row);

            const entry = { idx: i, slider, num, valLbl };
            const setChannel = (rawV) => {
                const v = parseFloat(rawV);
                if (isNaN(v)) return;
                const clamped = Math.max(0, Math.min(max, Math.round(v)));
                if (currentSpace === 'cmyk') cmyk[i] = clamped / 100;
                else rgb[i] = clamped / 255;
                commit();
            };
            slider.oninput = () => { entry.valLbl.textContent = slider.value; setChannel(slider.value); };
            num.oninput = () => { if (num.value === '' || isNaN(parseFloat(num.value))) { entry.valLbl.textContent = ''; return; } entry.valLbl.textContent = num.value; setChannel(num.value); };
            channelRows.push(entry);
        }
    }

    // --- Editable palette (matches the active color space: CMYK or RGB) ---
    let paletteGrid = null;
    let palHeaderLabel = null;
    const getActivePalette = () => (currentSpace === 'cmyk') ? window.__cmykPalette : window.__rgbPalette;

    const saveCurrentToPalette = () => {
        const pal = getActivePalette();
        const name = (currentSpace === 'cmyk')
            ? `C${Math.round(cmyk[0] * 100)} M${Math.round(cmyk[1] * 100)} Y${Math.round(cmyk[2] * 100)} K${Math.round(cmyk[3] * 100)}`
            : `R${Math.round(rgb[0] * 255)} G${Math.round(rgb[1] * 255)} B${Math.round(rgb[2] * 255)}`;
        const c = (currentSpace === 'cmyk') ? cmyk.slice() : rgb.slice();
        // Avoid exact duplicates.
        if (!pal.some(it => it.c.length === c.length && it.c.every((v, i) => Math.abs(v - c[i]) < 0.005))) {
            pal.push({ name, c });
            saveColorPalettes();
            buildPalette();
        } else {
            alert('That color is already in the palette.');
        }
    };

    function buildPalette() {
        if (!paletteGrid) return;
        paletteGrid.innerHTML = '';
        const isCmyk = (currentSpace === 'cmyk');
        (getActivePalette() || []).forEach((item, idx) => {
            const wrap = document.createElement('div');
            wrap.style.position = 'relative';
            const sw = document.createElement('div');
            sw.title = item.name + (isCmyk
                ? ` (${item.c.map(v => Math.round(v * 100)).join('/')})`
                : ` (${item.c.map(v => Math.round(v * 255)).join('/')})`);
            sw.style.height = '22px';
            sw.style.borderRadius = '3px';
            sw.style.border = '1px solid #444';
            sw.style.cursor = 'pointer';
            sw.style.background = isCmyk ? colorFromCmyk(item.c) : colorFromRgb(item.c);
            sw.onclick = () => {
                if (isCmyk) cmyk = item.c.slice();
                else rgb = item.c.slice();
                commit();
            };
            // Right-click to remove the saved swatch.
            sw.oncontextmenu = (e) => {
                e.preventDefault();
                const pal = getActivePalette();
                pal.splice(idx, 1);
                saveColorPalettes();
                buildPalette();
            };
            wrap.appendChild(sw);
            paletteGrid.appendChild(wrap);
        });
    }

    const rPalette = mkRow();
    const palHeader = document.createElement('div');
    palHeader.style.display = 'flex';
    palHeader.style.alignItems = 'center';
    palHeader.style.justifyContent = 'space-between';
    palHeaderLabel = mkLabel(currentSpace === 'cmyk' ? 'Palette (CMYK)' : 'Palette (RGB)');
    palHeader.appendChild(palHeaderLabel);
    const savePalBtn = window.createToolboxBtn('add', 'Save', saveCurrentToPalette, 'Save current color to palette');
    savePalBtn.style.padding = '1px 6px';
    savePalBtn.style.fontSize = '10px';
    savePalBtn.style.height = '20px';
    palHeader.appendChild(savePalBtn);
    rPalette.appendChild(palHeader);
    paletteGrid = document.createElement('div');
    paletteGrid.style.display = 'grid';
    paletteGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
    paletteGrid.style.gap = '4px';
    rPalette.appendChild(paletteGrid);
    // Palette + Save button go directly ABOVE the channel sliders
    container.insertBefore(rPalette, channelsWrap);

    buildChannels();
    buildPalette();
    refresh();
};

async function renderEditor() {
    const container = document.getElementById('styleEditorContainer');
    if(!container) return;
    container.innerHTML = '';

    const styleName = window.__activeStyleId;
    if(!styleName || !window.__textStyles[styleName]) return;

    const style = window.__textStyles[styleName];

    // Helper for rows
    const mkRow = () => { const d = document.createElement('div'); d.style.marginBottom = '8px'; return d; };
    const mkLabel = (txt) => { const l = document.createElement('label'); l.textContent = txt; l.style.display='block'; l.style.fontSize='10px'; l.style.color='#aaa'; return l; };

    // Font Family
    const r1 = mkRow();
    r1.appendChild(mkLabel('Font Family'));
    
    const fontRow = document.createElement('div');
    fontRow.style.display = 'flex';
    fontRow.style.gap = '5px';

    const fontSel = document.createElement('select');
    fontSel.className = 'toolbox-input';
    fontSel.style.flex = '1';
    
    const standardFonts = ['Helvetica', 'Times', 'Courier', 'Symbol', 'ZapfDingbats'];
    const customFonts = Object.keys(window.__customFonts || {});
    const systemFonts = (window.__systemFontsList || []).map(f => f.name);
    
    const allFonts = [...new Set([...standardFonts, ...customFonts, ...systemFonts])].sort((a, b) => a.localeCompare(b));
    
    const groups = {};
    allFonts.forEach(f => {
        let prefix = f.split(/[- _]/)[0];
        if (prefix === 'Noto' || /^Noto[A-Z]/.test(prefix)) prefix = 'Noto';
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(f);
    });

    Object.keys(groups).sort((a, b) => a.localeCompare(b)).forEach(prefix => {
        const items = groups[prefix];
        const parent = items.length > 1 ? document.createElement('optgroup') : fontSel;
        if (items.length > 1) { parent.label = prefix; fontSel.appendChild(parent); }
        
        items.forEach(f => {
            const o = document.createElement('option');
            o.value = f; o.textContent = f;
            parent.appendChild(o);
        });
    });
    fontSel.value = style.fontFamily;
    fontSel.onchange = async (e) => { 
        style.fontFamily = e.target.value; 
        style.fontStyle = 'Normal'; 
        saveStyles(); 
        await renderEditor(); 
    };
    
    const loadFontFileBtn = window.createToolboxBtn('upload_file', null, () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ttf,.otf,.woff,.woff2';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.onchange = async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const buffer = await file.arrayBuffer();
                const name = file.name.replace(/\.[^/.]+$/, "");
                try {
                    const fontFace = new FontFace(name, buffer);
                    await fontFace.load();
                    document.fonts.add(fontFace);
                    if (!window.__customFonts) window.__customFonts = {};
                    const fontData = { buffer: buffer.slice(0) };
                    window.__customFonts[name] = fontData;
                    window.saveCustomFontsList();
                    style.fontFamily = name;
                    saveStyles();
                    renderEditor();
                } catch (err) {
                    alert("Error loading font file: " + err.message);
                }
            }
            document.body.removeChild(input);
        };
        input.click();
    }, "Load Full Font File (TTF/OTF/WOFF)");
    loadFontFileBtn.style.width = '30px';
    loadFontFileBtn.style.padding = '0';

    fontRow.appendChild(fontSel);
    fontRow.appendChild(loadFontFileBtn);
    r1.appendChild(fontRow);
    container.appendChild(r1);

    // Font Style & Size
    const r2 = mkRow();
    r2.style.display = 'flex';
    r2.style.gap = '5px';
    
    const w1 = document.createElement('div'); w1.style.flex = '1';
    w1.appendChild(mkLabel('Style'));
    const styleSel = document.createElement('select');
    styleSel.className = 'toolbox-input';
    styleSel.style.width = '100%';
    
    // Populate styles (Standard or Variable)
    let styleOptions = ['Normal', 'Bold', 'Italic', 'Bold Italic'];
    const fontData = window.__customFonts[style.fontFamily];
    const vars = fontData ? await getFontVariations(style.fontFamily) : null;
    if (vars && vars.names.length > 0) {
        styleOptions = vars.names;
    }

    styleOptions.forEach(s => {
        const o = document.createElement('option');
        o.value = s; o.textContent = s;
        styleSel.appendChild(o);
    });
    
    if (!styleOptions.includes(style.fontStyle) && styleOptions.length > 0) style.fontStyle = styleOptions[0];
    styleSel.value = style.fontStyle;
    styleSel.onchange = (e) => { style.fontStyle = e.target.value; saveStyles(); };
    w1.appendChild(styleSel);

    const w2 = document.createElement('div'); w2.style.flex = '1';
    w2.appendChild(mkLabel('Size (pt)'));
    const sizeInp = document.createElement('input');
    sizeInp.type = 'number';
    sizeInp.className = 'toolbox-input';
    sizeInp.style.width = '100%';
    sizeInp.value = style.fontSize;
    sizeInp.oninput = (e) => { style.fontSize = parseFloat(e.target.value) || 0; saveStyles(); };
    w2.appendChild(sizeInp);

    r2.appendChild(w1);
    r2.appendChild(w2);
    container.appendChild(r2);

    // Alignment
    const r3 = mkRow();
    r3.appendChild(mkLabel('Alignment'));
    const alignSel = document.createElement('select');
    alignSel.className = 'toolbox-input';
    alignSel.style.width = '100%';
    ['left', 'center', 'right'].forEach(a => {
        const o = document.createElement('option');
        o.value = a; o.textContent = a.charAt(0).toUpperCase() + a.slice(1);
        alignSel.appendChild(o);
    });
    alignSel.value = style.align;
    alignSel.onchange = (e) => { style.align = e.target.value; saveStyles(); };
    r3.appendChild(alignSel);
    container.appendChild(r3);

    // Color: pick from saved swatches (full mixer lives in the Swatches tab).
    // The currently picked color is highlighted with a white outline on its swatch.
    const swatchHost = document.createElement('div');
    container.appendChild(swatchHost);
    const renderSwatches = () => window.renderColorSwatches(swatchHost, style, () => { saveStyles(); renderSwatches(); });
    renderSwatches();

    // Opacity
    const r5 = mkRow();
    r5.appendChild(mkLabel('Opacity'));
    const opRange = document.createElement('input');
    opRange.type = 'range';
    opRange.min = 0; opRange.max = 100;
    opRange.value = Math.round((style.opacity !== undefined ? style.opacity : 1) * 100);
    opRange.className = 'toolbox-slider';
    opRange.style.width = '100%';
    opRange.oninput = (e) => {
        style.opacity = parseInt(e.target.value) / 100;
        saveStyles();
    };
    r5.appendChild(opRange);
    container.appendChild(r5);
}

// Load initial styles
try {
    const saved = localStorage.getItem('pdf_text_styles');
    if (saved) window.__textStyles = JSON.parse(saved);
} catch (e) {}
// Restore the scratch color edited in the Swatches tab.
try {
    const sc = JSON.parse(localStorage.getItem('pdf_scratch_color') || 'null');
    if (sc && Array.isArray(sc.color) && (sc.colorSpace === 'cmyk' || sc.colorSpace === 'rgb')) {
        window.__scratchColor = sc;
    }
} catch (e) {}
loadColorPalettes();
loadPreloadedFonts().then(loadSavedCustomFonts).then(loadSystemFontsList);