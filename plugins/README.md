# Plugins

Drop `.js` files into this directory. They will be auto-discovered and loaded by the app.

## Plugin API

Plugins are plain global-scope scripts. Use `window.impositionfix.registerPlugin` to register.

```js
window.impositionfix.registerPlugin({
    name: 'my-plugin',
    version: '1.0.0',
    displayName: 'My Plugin',
    init: function(api) {
        console.log('Plugin initialized:', api);
    },
    hooks: {
        beforeRender: function(ctx) {
            // ctx.slotIndex, ctx.pageIndex, ctx.rotation, ctx.scale, ctx.offset
        },
        afterRender: function(ctx) {},
        beforeExport: function(ctx) {
            // ctx.options
        },
        afterExport: function(ctx) {}
    },
    overlays: [
        {
            id: 'my-overlay',
            x: 10,    // mm from top-left of the trim box (editable in the Data tab)
            y: 10,
            size: 30,
            drawPreview: function(container, pageNum, slotIndex, ctx) {
                // DOM overlay, CSS pixels, top-left origin (0,0) = top-left of the slot.
                if (this.visible === false || pageNum <= 0) return;
                const pxPerMm = 96 / 25.4;
                const xPx = (parseFloat(this.x) || 0) * pxPerMm;
                const yPx = (parseFloat(this.y) || 0) * pxPerMm;
                const sizePx = (parseFloat(this.size) || 30) * pxPerMm;
                const el = document.createElement('div');
                Object.assign(el.style, {
                    position: 'absolute', left: xPx + 'px', top: yPx + 'px',
                    width: sizePx + 'px', height: sizePx + 'px',
                    background: 'rgba(0, 0, 0, 0.2)', pointerEvents: 'none', zIndex: '10'
                });
                container.appendChild(el);
            },
            drawPdf: function(newPage, boxX, boxY, boxW, boxH, pdfLib, pageNum, offset, slotIndex, ctx) {
                // Vector overlay, points. See "Coordinate system & overlay positioning" below.
                if (this.visible === false || pageNum <= 0) return;
                const ptPerMm = 72 / 25.4;
                const wPt = (parseFloat(this.size) || 30) * ptPerMm;
                const xPt = (parseFloat(this.x) || 0) * ptPerMm;
                const yPt = (parseFloat(this.y) || 0) * ptPerMm;
                const offX = offset ? (offset.x || 0) : 0;
                const offY = offset ? (offset.y || 0) : 0;
                // X from the LEFT edge of the sheet (add boxX + offset.x).
                // Y passed as a distance from the TOP edge of the box — the Proxy flips it.
                const { rgb } = pdfLib;
                newPage.drawRectangle({
                    x: boxX + offX + xPt,
                    y: offY + yPt,           // top-relative; Proxy applies boxH - y
                    width: wPt,
                    height: wPt,
                    color: rgb(0, 0, 0),
                    opacity: 0.2
                });
            }
        }
    ],
    layouts: [
        {
            id: 'my-layout',
            generate: function(rows, cols) {
                // Return custom layout config
            }
        }
    ],
    ui: {
        buttons: [
            {
                label: 'My Button',
                icon: '<span class="material-icons">star</span>',
                title: 'Do something',
                onClick: function() { alert('clicked'); }
            }
        ],
        tabs: [
            {
                id: 'my-tab',
                label: 'My Tab',
                contentFn: function(panel) {
                    panel.innerHTML = '<p>Tab content</p>';
                }
            }
        ]
    }
});
```
