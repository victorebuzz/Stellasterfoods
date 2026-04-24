// Railway entry point - wraps TanStack Start fetch handler in Node.js HTTP server
import { createServer } from 'node:http';

// Import the server entry from dist/server/server.js
const serverEntry = await import('./dist/server/server.js');
const handler = serverEntry.default.fetch;

const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  const url = `http://${req.headers.host}${req.url}`;
  
  // Collect request body if present
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }
  
  // Create fetch-compatible Request
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: body ? body : undefined,
  });
  
  // Call TanStack Start handler
  const response = await handler(request);
  
  // Send response
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  
  const responseBody = await response.arrayBuffer();
  res.end(Buffer.from(responseBody));
});

server.listen(PORT, () => {
  console.log(`Stellaster Kitchen server running on port ${PORT}`);
});
