const http = require('http'); const fs = require('fs'); const path = require('path');
const root = __dirname;
http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (url.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{}'); }
  const name = url === '/' ? 'index.html' : (url.slice(1) === 'admin' ? 'admin.html' : url.slice(1));
  fs.readFile(path.join(root, path.basename(name)), (err, data) => {
    if (err) { res.writeHead(404); return res.end('{}'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}).listen(8791, () => console.log('up'));
