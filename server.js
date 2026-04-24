import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Import the TanStack Start server
const serverEntry = await import('./dist/server/server.js');

// Serve static assets from dist/client with proper caching
app.use(express.static(join(__dirname, 'dist/client'), {
  maxAge: '1y',
  immutable: true,
  index: false, // Don't serve index.html automatically
}));

// Handle all other routes with TanStack Start
app.use(async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const url = new URL(`${protocol}://${host}${req.originalUrl}`);
    
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    });
    
    const response = await serverEntry.default.fetch(request);
    
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    const body = await response.arrayBuffer();
    res.send(Buffer.from(body));
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stellaster Kitchen server running on port ${PORT}`);
});
