/*
    ImpositionFix - PDF Imposition Tool
    Copyright (C) 2026 Olegas Spausdinimas
*/

window.__textStyles = {};
window.__activeStyleId = null;
window.__customFonts = window.__customFonts || {};
window.__fontVariationsCache = {}; // Cache for variable font instances

// Preload local fonts from fonts/ folder
const PRELOAD_FONTS = [
    // Uncomment and modify to load your fonts:
    // { name: 'MyFont', url: 'fonts/MyFont.ttf' },
    // Example:
    { name: 'Oswald-Variable', url: 'fonts/Oswald-VariableFont_wght.ttf' },
    { name: 'NotoSerif-Variable', url: 'fonts/NotoSerif-VariableFont_wdth,wght.ttf' },
    { name: 'NotoSerif-Italic-Variable', url: 'fonts/NotoSerif-Italic-VariableFont_wdth,wght.ttf' },
    { name: 'OpenSans-Variable', url: 'fonts/OpenSans-VariableFont_wdth,wght.ttf' },
    { name: 'OpenSans-Italic-Variable', url: 'fonts/OpenSans-Italic-VariableFont_wdth,wght.ttf' },
    { name: 'RobotoSerif-Variable', url: 'fonts/RobotoSerif-VariableFont_GRAD,opsz,wdth,wght.ttf' },
    { name: 'RobotoSerif-Italic-Variable', url: 'fonts/RobotoSerif-Italic-VariableFont_GRAD,opsz,wdth,wght.ttf' }
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
    const buffer = window.__customFonts[fontName];
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
        if (window.location.protocol === 'file:') {
            console.warn("Cannot preload fonts via file:// protocol due to browser security (CORS).");
            alert("Warning: You are opening this file directly (file://).\n\nBrowser security prevents loading custom fonts automatically from the 'fonts/' folder in this mode.\n\nSolution:\n1. Use the 'Load Full Font File' button to load fonts manually.\n2. OR run a local web server (e.g., 'python3 -m http.server').");
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
                window.__customFonts[font.name] = buffer.slice(0);
            } catch (e) {
                console.warn(`Failed to preload font ${font.name}:`, e);
                console.warn(`Check if file exists at: ${font.url}`);
                alert(`Failed to load font "${font.name}" from "${font.url}".\n\nCheck if the file exists and the name is correct.\nIf using local files, ensure you are running a local server (http://) not file://.`);
            }
        }
    }

    if (document.getElementById('rtContentStyles')) renderStylesUI();
}

window.initStylesTab = function() {
    const rtTabTransform = document.getElementById('rtTabTransform');
    const rtContentTransform = document.getElementById('rtContentTransform');
    
    if (!rtTabTransform || !rtContentTransform) return;

    if (document.getElementById('rtTabStyles')) {
        renderStylesUI();
        return;
    }

    const tabsContainer = rtTabTransform.parentNode;
    const contentContainer = rtContentTransform.parentNode;

    // Create Tab Button
    const stylesTab = document.createElement('button');
    stylesTab.id = 'rtTabStyles';
    stylesTab.className = 'toolbox-tab';
    stylesTab.textContent = 'Styles';
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

function renderStylesUI() {
    const container = document.getElementById('rtContentStyles');
    if(!container) return;
    container.innerHTML = '';

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
        const name = prompt("Style Name:");
        if(name && !window.__textStyles[name]){
            window.__textStyles[name] = createDefaultStyle();
            window.__activeStyleId = name;
            saveStyles();
            updateSelect();
            renderEditor();
        }
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
    const customFonts = Object.keys(window.__customFonts || {}).sort();
    
    [...standardFonts, ...customFonts].forEach(f => {
        const o = document.createElement('option');
        o.value = f; o.textContent = f;
        fontSel.appendChild(o);
    });
    fontSel.value = style.fontFamily;
    fontSel.onchange = async (e) => { style.fontFamily = e.target.value; style.fontStyle = 'Normal'; saveStyles(); await renderEditor(); };
    
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
                    window.__customFonts[name] = buffer.slice(0);
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
    const vars = await getFontVariations(style.fontFamily);
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

    // Color (CMYK)
    const r4 = mkRow();
    r4.appendChild(mkLabel('Color (CMYK)'));
    const cRow = document.createElement('div');
    cRow.style.display = 'flex';
    cRow.style.gap = '2px';
    ['C','M','Y','K'].forEach((k, idx) => {
        const i = document.createElement('input');
        i.type = 'number';
        i.min = 0; i.max = 100;
        i.value = Math.round(style.color[idx] * 100);
        i.className = 'toolbox-input no-spin';
        i.style.flex = '1';
        i.style.textAlign = 'center';
        i.title = k;
        i.oninput = (e) => {
            let v = parseInt(e.target.value);
            if(isNaN(v)) v = 0;
            style.color[idx] = v / 100;
            saveStyles();
        };
        cRow.appendChild(i);
    });
    r4.appendChild(cRow);
    container.appendChild(r4);

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
loadPreloadedFonts();