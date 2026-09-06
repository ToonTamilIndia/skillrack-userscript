const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SOLUTIONS_DIR = path.join(__dirname, 'solutions');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    // Language-scoped: /solutions/<lang>/<programId>.md  (e.g. /solutions/c/2571.md)
    // Legacy flat:     /solutions/<programId>.md          (served from solutions/c for back-compat)
    let m = urlPath.match(/^\/solutions\/([a-z0-9+]+)\/(\d+)\.md$/);
    let file;
    if (m) {
        file = path.join(SOLUTIONS_DIR, m[1], m[2] + '.md');
    } else {
        m = urlPath.match(/^\/solutions\/(\d+)\.md$/);
        if (!m) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found. Expected /solutions/<lang>/<ProgramID>.md or /solutions/<ProgramID>.md');
            return;
        }
        // Legacy flat path -> look under solutions/c (the historical default language)
        file = path.join(SOLUTIONS_DIR, 'c', m[1] + '.md');
    }
    if (!file.startsWith(SOLUTIONS_DIR) || !fs.existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('No solution found: ' + urlPath);
        return;
    }

    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Read error');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`SkillRack solutions server running at http://localhost:${PORT}`);
    console.log(`  e.g. http://localhost:${PORT}/solutions/c/2571.md`);
});
