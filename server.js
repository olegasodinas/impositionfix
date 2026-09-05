/*
    ImpositionFix - Local Web + Ghostscript Server
    Copyright (C) 2026 Olegas Spausdinimas

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program. If not, see <https://www.gnu.org/licenses/>.
*/

// Simple static file server that also runs Ghostscript for PDF optimization.
//
//   npm start            -> serves the app at http://localhost:3000
//   POST /optimize       -> Header X-Gs-Args = JSON array of gs args,
//                           Body = raw PDF bytes. Returns optimized PDF.
//
// This lets the renderer (browser) optimize PDFs without Node integration:
// the app is a plain static web app, and Ghostscript runs only here.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.txt': 'text/plain; charset=utf-8',
    '.pdf': 'application/pdf',
    '.md': 'text/markdown; charset=utf-8',
    '.map': 'application/json'
};

function send(res, status, body, contentType) {
    res.writeHead(status, { 'Content-Type': contentType || 'text/plain; charset=utf-8' });
    res.end(body);
}

function resolvePath(urlPath) {
    const decoded = decodeURIComponent(urlPath);
    const rel = decoded.replace(/^[/]/, '');
    const full = path.resolve(ROOT, rel);
    if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
    return full;
}

function serve(res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) return send(res, 500, 'Server error');
        const ext = path.extname(filePath).toLowerCase();
        send(res, 200, data, MIME[ext] || 'application/octet-stream');
    });
}

function handleStatic(req, res, urlPath) {
    const filePath = resolvePath(urlPath);
    if (!filePath) return send(res, 403, 'Forbidden');
    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            if (filePath === ROOT) {
                const idx = path.join(ROOT, 'index.html');
                fs.stat(idx, (e2) => {
                    if (e2) return send(res, 404, 'Not found');
                    serve(res, idx);
                });
            } else {
                send(res, 404, 'Not found');
            }
            return;
        }
        serve(res, filePath);
    });
}

function cleanup(dir) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
}

function handleOptimize(req, res) {
    const argsHeader = req.headers['x-gs-args'] || '[]';
    let args;
    try { args = JSON.parse(argsHeader); } catch (e) { return send(res, 400, 'Invalid X-Gs-Args'); }
    if (!Array.isArray(args)) return send(res, 400, 'X-Gs-Args must be a JSON array');

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length === 0) return send(res, 400, 'No PDF body received');

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'impfix_'));
        const inPath = path.join(tmpDir, 'input.pdf');
        const outPath = path.join(tmpDir, 'output.pdf');
        fs.writeFileSync(inPath, buffer);

        const gsArgs = args.concat(['-sOutputFile=' + outPath, inPath]);

        execFile('gs', gsArgs, { timeout: 300000, maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
            if (err) {
                cleanup(tmpDir);
                const msg = (err.code === 'ENOENT')
                    ? 'Ghostscript (gs) is not installed or not on PATH.'
                    : String(stderr || stdout || err.message).slice(0, 600);
                return send(res, 500, msg);
            }
            fs.readFile(outPath, (e2, outBuffer) => {
                cleanup(tmpDir);
                if (e2) return send(res, 500, 'Ghostscript did not produce an output file.');
                res.writeHead(200, {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'attachment; filename="output.pdf"'
                });
                res.end(outBuffer);
            });
        });
    });
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const urlPath = url.pathname;

    if (req.method === 'GET' && urlPath === '/api/plugins') {
        const pluginsDir = path.join(ROOT, 'plugins');
        fs.readdir(pluginsDir, (err, entries) => {
            if (err) return send(res, 500, 'Cannot read plugins directory');
            const files = entries.filter(f => f.endsWith('.js'));
            send(res, 200, JSON.stringify(files), 'application/json');
        });
        return;
    }
    if (req.method === 'POST' && urlPath === '/optimize') {
        return handleOptimize(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return send(res, 405, 'Method not allowed');
    }
    if (urlPath === '/' || urlPath === '') {
        return handleStatic(req, res, '/index.html');
    }
    return handleStatic(req, res, urlPath);
});

server.listen(PORT, () => {
    console.log('ImpositionFix running at http://localhost:' + PORT);
});