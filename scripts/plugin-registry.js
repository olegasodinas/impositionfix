/*
    ImpositionFix - Plugin Registry
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

window.impositionfix = window.impositionfix || {
    _plugins: [],
    _hooks: { beforeRender: [], afterRender: [], beforeExport: [], afterExport: [] },
    _overlays: [],
    _layouts: {},
    _ui: { buttons: [], tabs: [] },
};

window.impositionfix.registerPlugin = function(plugin) {
    if (!plugin || !plugin.name) {
        console.warn('Plugin rejected: missing name');
        return;
    }
    window.impositionfix._plugins.push(plugin);

    if (plugin.hooks) {
        if (plugin.hooks.beforeRender) window.impositionfix._hooks.beforeRender.push(plugin.hooks.beforeRender);
        if (plugin.hooks.afterRender)  window.impositionfix._hooks.afterRender.push(plugin.hooks.afterRender);
        if (plugin.hooks.beforeExport) window.impositionfix._hooks.beforeExport.push(plugin.hooks.beforeExport);
        if (plugin.hooks.afterExport)  window.impositionfix._hooks.afterExport.push(plugin.hooks.afterExport);
    }

    if (plugin.overlays) {
        const overlays = Array.isArray(plugin.overlays) ? plugin.overlays : [plugin.overlays];
        overlays.forEach(o => {
            o._pluginName = plugin.name;
            o.displayName = plugin.displayName;
            if (window.__saveSettingsEnabled) {
                try {
                    const saved = localStorage.getItem('pdf_plugin_overlays');
                    if (saved) {
                        const state = JSON.parse(saved);
                        const match = state.find(s => (o.id || o.name) === (s.id || s.name));
                        if (match) {
                            o.visible = match.visible;
                            if (match.x !== undefined) o.x = match.x;
                            if (match.y !== undefined) o.y = match.y;
                            if (match.size !== undefined) o.size = match.size;
                        } else {
                            o.visible = o.visible !== false;
                        }
                    } else {
                        o.visible = o.visible !== false;
                    }
                } catch (e) {
                    o.visible = o.visible !== false;
                }
            } else {
                o.visible = o.visible !== false;
            }
            window.impositionfix._overlays.push(o);
            if (!window.__overlays) window.__overlays = [];
            window.__overlays.push(o);
        });
        console.log('[plugin-registry] Registered', overlays.length, 'overlay(s) from plugin:', plugin.name, '| Total plugin overlays:', window.impositionfix._overlays.length);
    }

    if (plugin.layouts) {
        (Array.isArray(plugin.layouts) ? plugin.layouts : [plugin.layouts]).forEach(l => {
            window.impositionfix._layouts[l.id] = l;
        });
    }

    if (plugin.ui) {
        if (plugin.ui.buttons) window.impositionfix._ui.buttons.push(...plugin.ui.buttons);
        if (plugin.ui.tabs)    window.impositionfix._ui.tabs.push(...plugin.ui.tabs);
    }

    if (typeof plugin.init === 'function') {
        try { plugin.init(window.impositionfix); } catch (e) { console.error('Plugin init failed:', plugin.name, e); }
    }

    if (window.__pdfDoc && window.renderPages) {
        window.renderPages(window.__currentRotation || 0, {x: window.__currentScaleX || 1, y: window.__currentScaleY || 1}, {x: window.__offsetX || 0, y: window.__offsetY || 0});
        if (window.drawSheetOverlays) window.drawSheetOverlays();
    }
    if (typeof window.__refreshPluginOverlaysUI === 'function') {
        window.__refreshPluginOverlaysUI();
    }
};
