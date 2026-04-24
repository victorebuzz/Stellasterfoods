import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

// Import the TanStack Start server
const serverEntry = await import('./dist/server/server.js');

const PORT = process.env.PORT || 3000;

// MIME types for static assets
const mimeTypes = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Serve static files from dist/client
function serveStatic(url) {
  const pathname = url.pathname;
  
  // Only serve files with known extensions
  const ext = extname(pathname);
  if (!ext || !mimeTypes[ext]) return null;
  
  const clientPath = join(process.cwd(), 'dist/client', pathname);
  
  if (!existsSync(clientPath)) return null;
  
  const content = readFileSync(clientPath);
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  return new Response(content, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

const server = createServer(async (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const url = new URL(`${protocol}://${host}${req.url}`);
  
  // Try serving static assets first
  const staticResponse = serveStatic(url);
  if (staticResponse) {
    res.statusCode = staticResponse.status;
    staticResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const body = await staticResponse.arrayBuffer();
    res.end(Buffer.from(body));
    return;
  }
  
  // Otherwise, forward to TanStack Start handler
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }
  
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: body ? body : undefined,
  });
  
  try {
    const response = await serverEntry.default.fetch(request);
    
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    const responseBody = await response.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Stellaster Kitchen server running on port ${PORT}`);
});
