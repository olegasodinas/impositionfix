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

// Project Save/Load
window.saveProjectData = async function() {
    const defaultName = (window.__importedFiles && window.__importedFiles[0] && window.__importedFiles[0].name)
        ? window.__importedFiles[0].name.replace(/\.[^/.]+$/, "")
        : 'Untitled Project';

    // Determine a common base directory for relative paths.
    // We try to use the directory of the first imported file's path.
    // (Files loaded in the browser carry no filesystem path, so relative
    // path resolution is disabled when running as a static web app.)
        let commonBase = null;
    let nodePath = null;

    // Helper: serialize a file path to relative-or-absolute
    const serializePath = (f) => {
        if (!f || typeof f.path !== 'string' || !f.path || !nodePath || !commonBase) {
            return f.path;
        }
        try {
            const rel = nodePath.relative(commonBase, f.path);
            // Only use relative path if it's meaningful (not going up too many levels)
            if (rel && !rel.startsWith('..')) {
                return rel;
            }
        } catch(err) { /* ignore */ }
        return f.path;
    };

    const project = {
        version: 1,
        name: defaultName,
        timestamp: new Date().toISOString(),
        settings: {},
        globals: {},
        files: []
    };

    // Inputs
    const ids = [
        'rowsInput', 'colsInput', 'markGapXInput', 'markGapYInput',
        'cropBleedXInput', 'cropBleedYInput', 'innerCropBleedXInput', 'innerCropBleedYInput',
        'innerCropStyleSelect', 'boxXInput', 'boxYInput', 'paperSelect', 'pageRangeInput',
        'autoGridCheck', 'showCropMarksCheck', 'gridDuplexCheck',
        'transformProportionalCheckbox', 'markGapProportionalCheckbox', 'cropBleedProportionalCheckbox', 'innerCropBleedProportionalCheckbox',
        'slotWidthInput', 'slotHeightInput', 'slotScalePercentInput', 'slotProportionalCheckbox', 'linkSlotScaleCheckbox',
        'expandLeftInput', 'expandRightInput', 'expandTopInput', 'expandBottomInput',
        'sheetWidthInput', 'sheetHeightInput',
        'rotationInput', 'scaleSlider', 'skewXInput', 'skewYInput', 'offsetXInput', 'offsetYInput',
        'mergeSourceSelect', 'mergePageNumInput', 'dpiInput', 'layoutSelect'
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            if (id === 'linkSlotScaleCheckbox') {
                project.settings[id] = el.classList.contains('active');
            } else {
                project.settings[id] = (el.type === 'checkbox') ? el.checked : el.value;
            }
        }
    });

    // Globals
    project.globals = {
        __overlays: window.__overlays,
        __mergeData: window.__mergeData,
        __mergeEnabled: window.__mergeEnabled,
        __mergeConfig: window.__mergeConfig,
        __mergeSource: window.__mergeSource,
        __textStyles: window.__textStyles,
        __customFonts: (() => {
            const fonts = {};
            if (window.__customFonts) {
                for (const name in window.__customFonts) {
                    if (window.__customFonts[name].path) {
                        fonts[name] = { path: window.__customFonts[name].path };
                    }
                }
            }
            return fonts;
        })(),
        __pageTransforms: window.__pageTransforms,
        __slotTransforms: window.__slotTransforms,
        __gridDuplexMirror: window.__gridDuplexMirror,
        __currentRotation: window.__currentRotation,
        __currentScaleX: window.__currentScaleX,
        __currentScaleY: window.__currentScaleY,
        __skewX: window.__skewX,
        __skewY: window.__skewY,
        __offsetX: window.__offsetX,
        __offsetY: window.__offsetY,
        __slotX: window.__slotX,
        __slotY: window.__slotY,
        __slotW: window.__slotW,
        __slotH: window.__slotH,
        __trimW: window.__trimW,
        __trimH: window.__trimH,
        __expandL: window.__expandL,
        __expandR: window.__expandR,
        __expandT: window.__expandT,
        __expandB: window.__expandB,
        __fitToPage: window.__fitToPage,
        __preferUpscaleNotRotate: window.__preferUpscaleNotRotate,
        __fillImage: window.__fillImage,
        __stretchImage: window.__stretchImage,
        __renderNative: window.__renderNative,
        __showPageNumbers: window.__showPageNumbers,
        __placedDpi: window.__placedDpi,
        __frameBgCMYK: window.__frameBgCMYK,
        __frameBgString: window.__frameBgString,
        __fileNames: window.__fileNames,
        __filePageCounts: window.__filePageCounts,
        __fileWidthMm: window.__fileWidthMm,
        __fileHeightMm: window.__fileHeightMm,
        __creepEnabled: window.__creepEnabled,
        __creepTotal: window.__creepTotal,
        __creepCentered: window.__creepCentered,
        __creepDirection: window.__creepDirection,
        __creepMode: window.__creepMode,
        __creepWithFrame: window.__creepWithFrame
    };

        // Serialize Files
    if (window.__importedFiles) {
        for (const item of window.__importedFiles) {
            if (item.type === 'group') {
                const group = { type: 'group', name: item.name, files: [], hidden: item.hidden };
                for (const f of item.files) {
                    if (f.path || f.url || f.name) {
                        group.files.push({
                            name: f.name,
                            type: f.type,
                            path: serializePath(f),
                            url: f.url,
                            dummy: f.dummy,
                            pageCount: f.pageCount
                        });
                    }
                }
                if (group.files.length > 0) project.files.push(group);
            } else if (item.path || item.url || item.name) {
                project.files.push({
                    name: item.name,
                    type: item.type,
                    path: serializePath(item),
                    url: item.url,
                    hidden: item.hidden,
                    dummy: item.dummy,
                    pageCount: item.pageCount
                });
            }
        }
    }

    const blob = new Blob([JSON.stringify(project, null, 2)], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'imposition-project.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.loadProjectData = async function(data) {
    if(!data || !data.settings || !data.globals) {
        alert('Invalid project file.');
        return;
    }

    window.__projectActive = true;
    window.__projectName = data.name || 'Untitled Project';
    window.__preservePageRange = true;
    const statusProject = document.getElementById('statusProjectName');
    if(statusProject) statusProject.textContent = `Project: ${window.__projectName}`;

    const savedPageRange = (data.settings && data.settings.pageRangeInput) ? data.settings.pageRangeInput : null;

    const g = data.globals;
    if(g.__overlays) window.__overlays = g.__overlays;
    if(g.__mergeData) window.__mergeData = g.__mergeData;
    if(g.__mergeEnabled !== undefined) window.__mergeEnabled = g.__mergeEnabled;
    if(g.__mergeConfig) window.__mergeConfig = g.__mergeConfig;
    if(g.__mergeSource) window.__mergeSource = g.__mergeSource;
    if(g.__textStyles) window.__textStyles = g.__textStyles;
    if(g.__pageTransforms) window.__pageTransforms = g.__pageTransforms;
    if(g.__slotTransforms) window.__slotTransforms = g.__slotTransforms;
    
    ['__gridDuplexMirror', '__currentRotation', '__currentScaleX', '__currentScaleY', '__skewX', '__skewY', '__offsetX', '__offsetY', '__slotX', '__slotY', '__slotW', '__slotH', '__trimW', '__trimH', '__expandL', '__expandR', '__expandT', '__expandB', '__fitToPage', '__preferUpscaleNotRotate', '__fillImage', '__stretchImage', '__renderNative', '__showPageNumbers', '__placedDpi', '__frameBgCMYK', '__frameBgString', '__fileNames', '__filePageCounts', '__fileWidthMm', '__fileHeightMm', '__creepEnabled', '__creepTotal', '__creepCentered', '__creepDirection', '__creepMode', '__creepWithFrame'].forEach(k => { if(g[k] !== undefined) window[k] = g[k]; });

    let missingFiles = [];

        // Restore Files
    if (data.files && window.openPdfFile) {
        const reconstructedFiles = [];

        const loadFileItem = async (fData) => {
            let file = null;
            // 1. Try URL
            if (fData.url) {
                try {
                    const res = await fetch(fData.url);
                    if (res.ok) {
                        const blob = await res.blob();
                        file = new File([blob], fData.name, { type: fData.type });
                        file.url = fData.url;
                    }
                } catch (e) {}
            }
            // 2. Fallback
            if (!file) {
                missingFiles.push(fData.name);
                file = { name: fData.name, dummy: true, path: fData.path };
            }
            if (fData.hidden) file.hidden = true;
            if (fData.pageCount) file.pageCount = fData.pageCount;
            return file;
        };

        for (const item of data.files) {
            if (item.type === 'group') {
                const group = { type: 'group', name: item.name, files: [], hidden: item.hidden };
                for (const f of item.files) {
                    const file = await loadFileItem(f);
                    group.files.push(file);
                }
                reconstructedFiles.push(group);
            } else {
                const file = await loadFileItem(item);
                reconstructedFiles.push(file);
            }
        }
        window.__importedFiles = reconstructedFiles;
        await window.openPdfFile(reconstructedFiles, true);
    }

    if(missingFiles.length > 0){
        alert('Could not locate these files:\n' + missingFiles.join('\n') + '\n\nThey were replaced with placeholders.');
    }

    if (g.__customFonts) {
        const newCustomFonts = {};
        const promises = [];
        // Fonts are only restored if their data was kept in memory; reading them
        // back from a filesystem path requires Node/Electron and is not available
        // in the browser web app.
        for (const name in g.__customFonts) {
            const fontData = g.__customFonts[name];
            if (fontData && fontData.buffer) {
                newCustomFonts[name] = { buffer: fontData.buffer, path: fontData.path };
                try {
                    const fontFace = new FontFace(name, fontData.buffer);
                    promises.push(fontFace.load().then(loadedFace => {
                        document.fonts.add(loadedFace);
                    }));
                } catch (e) {
                    console.warn(`Failed to load font ${name}:`, e);
                }
            }
        }
        await Promise.all(promises).catch(e => console.warn("Error loading fonts from project:", e));
        window.__customFonts = newCustomFonts;
        if(window.saveCustomFontsList) window.saveCustomFontsList();
    }

    Object.keys(data.settings).forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            if(el.type === 'checkbox') el.checked = data.settings[id];
            else el.value = data.settings[id];
        }
    });

    if(window.updateSlotSizeFromInputs) window.updateSlotSizeFromInputs();

    // Reconstruct state if files were not loaded (e.g. local files in project)
    if ((!window.__importedFiles || window.__importedFiles.length === 0) && window.__fileNames && window.__fileNames.length > 0) {
        window.__importedFiles = window.__fileNames.map(name => ({ name: name, dummy: true }));
        if (window.renderFileList) window.renderFileList();
    }

    if (!window.__pdfDoc && window.__filePageCounts && window.__filePageCounts.length > 0) {
        const totalPages = window.__filePageCounts.reduce((a, b) => a + b, 0);
        const wPt = (window.__fileWidthMm || 215.9) * 72 / 25.4;
        const hPt = (window.__fileHeightMm || 279.4) * 72 / 25.4;
        window.__pdfDoc = {
            numPages: totalPages,
            getPage: async (i) => ({
                getViewport: ({scale}) => ({ width: wPt * (scale||1), height: hPt * (scale||1) }),
                render: () => ({ promise: Promise.resolve() }),
                dummy: true
            })
        };
    }

    if(window.renderOverlayInputs) window.renderOverlayInputs();
    if(window.renderDataMergeCards) window.renderDataMergeCards();
    if(window.renderStylesUI) window.renderStylesUI();
    if(window.updateSheetSize) window.updateSheetSize();
    const nativeCheckbox = document.getElementById('nativeCheckbox');
    if(nativeCheckbox) nativeCheckbox.dispatchEvent(new Event('change'));
    if(window.renderPages) window.renderPages(window.__currentRotation||0, {x: window.__currentScaleX||1, y: window.__currentScaleY||1}, {x: window.__offsetX||0, y: window.__offsetY||0});
    if(window.drawSheetCropMarks) window.drawSheetCropMarks();
    if(window.drawSheetOverlays) window.drawSheetOverlays();
    if(window.syncSelectionToUI) window.syncSelectionToUI();
    const bgTransparentCheckbox = document.getElementById('bgTransparentCheckbox');
    if(bgTransparentCheckbox) bgTransparentCheckbox.dispatchEvent(new Event('change'));

    if(savedPageRange){
        const pageRangeInput = document.getElementById('pageRangeInput');
        if(pageRangeInput) pageRangeInput.value = savedPageRange;
    }
};

const projectFileInput = document.createElement('input');
projectFileInput.type = 'file'; projectFileInput.accept = '.json'; projectFileInput.style.display = 'none'; projectFileInput.id = 'projectFileInput';
document.body.appendChild(projectFileInput);
projectFileInput.addEventListener('change', (e) => { 
    const file = e.target.files[0]; 
    if(!file) return; 
    const reader = new FileReader(); 
    reader.onload = (ev) => { 
        try { 
            let basePath = null;
            window.loadProjectData(JSON.parse(ev.target.result)); 
        } catch(err) { 
            alert('Error loading project: ' + err.message); 
        } 
    }; 
    reader.readAsText(file); 
    e.target.value = ''; 
});
