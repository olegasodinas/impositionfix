// Plugin: Watermark Circle (DEBUG)
// Draws a red circle overlay on every page in preview and PDF export.
window.impositionfix.registerPlugin({
    name: 'watermark-circle',
    displayName: 'Watermark Circle (DEBUG)',
    version: '1.0.0',
    overlays: [
        {
            id: 'watermark-circle',
            x: 50,
            y: 50,
            size: 30,
            drawPreview: function(container, pageNum, slotIndex, ctx) {
                console.log('[watermark-circle] drawPreview called', { pageNum, slotIndex, container: !!container, visible: this.visible });
                if (pageNum <= 0) {
                    console.log('[watermark-circle] skipping - pageNum <= 0');
                    return;
                }
                if (this.visible === false) {
                    console.log('[watermark-circle] skipping - visible === false');
                    return;
                }
                const pxPerMm = 96 / 25.4;
                const sizeMm = parseFloat(this.size) || 30;
                const xMm = parseFloat(this.x) || 0;
                const yMm = parseFloat(this.y) || 0;
                const sizePx = sizeMm * pxPerMm;
                const xPx = xMm * pxPerMm;
                const yPx = yMm * pxPerMm;
                console.log('[watermark-circle] drawing at', { xPx, yPx, sizePx });
                const circle = document.createElement('div');
                Object.assign(circle.style, {
                    position: 'absolute',
                    left: xPx + 'px',
                    top: yPx + 'px',
                    width: sizePx + 'px',
                    height: sizePx + 'px',
                    borderRadius: '50%',
                    border: '3px solid rgb(0, 0, 255)',
                    backgroundColor: 'rgba(255, 0, 0, 0.5)',
                    pointerEvents: 'none',
                    zIndex: '10'
                });
                container.appendChild(circle);
                console.log('[watermark-circle] circle appended to container', container);
            },
            drawPdf: function(newPage, boxX, boxY, boxW, boxH, pdfLib, pageNum, offset, slotIndex, ctx) {
                if (pageNum <= 0) return;
                if (this.visible === false) return;
                const ptPerMm = 72 / 25.4;
                const sizeMm = parseFloat(this.size) || 30;
                const xMm = parseFloat(this.x) || 0;
                const yMm = parseFloat(this.y) || 0;
                const offX = offset ? (offset.x || 0) : 0;
                const offY = offset ? (offset.y || 0) : 0;
                // pdf-lib quirk: `drawCircle({ size })` treats `size` as the SEMI-AXIS
                // (radius), not the diameter — it draws a circle 2× that value wide (this
                // build does not halve it, unlike upstream pdf-lib; see the built-in duplex
                // bubbles which pass `size: bubbleRadiusPt`). So to get a circle of exactly
                // `size` mm in diameter, use drawEllipse with xScale = yScale = the radius
                // in points. (Passing `radius` to drawCircle is ignored → 200pt default.)
                const diameter = sizeMm * ptPerMm;
                const radius = diameter / 2;
                // IMPORTANT: pdf-lib uses a bottom-left origin, but the page passed to
                // drawPdf is wrapped in a Proxy that flips Y (boxY + boxH - y). So mirror the
                // preview's top-left convention: add boxX + offset.x to X, and pass Y as
                // a distance from the TOP edge of the box (offset.y + mm) -- do NOT add
                // boxY or do the boxH - y flip yourself, or the circle will be mirrored.
                // drawEllipse centers on (x, y), so offset by `radius` to keep the circle's
                // top-left aligned with the mm point (same as the preview rect).
                const centerX = boxX + offX + (xMm * ptPerMm) + radius;
                const centerY = offY + (yMm * ptPerMm) + radius; // top-relative; Proxy flips it
                const { rgb } = pdfLib;
                // Keep colors AND opacity identical to drawPreview so the export matches
                // the screen. drawPreview uses a 50%-transparent RED fill (rgba 0.5) with a
                // solid BLUE border. pdf-lib applies `opacity` to the FILL (ca) and
                // `borderOpacity` to the STROKE (CA), so set them separately:
                newPage.drawEllipse({
                    x: centerX,
                    y: centerY,
                    xScale: radius,
                    yScale: radius,
                    color: rgb(1, 0, 0), // = preview backgroundColor rgb(255, 0, 0)
                    opacity: 0.5, // = preview rgba(..., 0.5) fill alpha
                    borderColor: rgb(0, 0, 1), // = preview border rgb(0, 0, 255)
                    borderWidth: 2.25, // 3px CSS @96dpi => 2.25pt
                    borderOpacity: 1 // keep border fully opaque, as in the preview
                });
            }
        }
    ]
});