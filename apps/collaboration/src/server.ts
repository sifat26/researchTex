import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import * as Y from 'yjs';
// @ts-ignore
import { setupWSConnection, getYDoc, docs } from 'y-websocket/bin/utils';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyCollabToken } from './auth.js';
import { fetchInitialContent, bindStateToPersistence } from './persistence.js';

// CWD is apps/collaboration — load .env from there
dotenv.config(); // loads ./apps/collaboration/.env

console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO (using fallback)');

const port = process.env.COLLABORATION_PORT || 1234;

const app = express();
app.use(cors());

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Flush endpoint to forcefully persist all Yjs documents for a project before compilation
app.post('/collaboration/project/:projectId/flush', express.json(), async (req, res) => {
  const { projectId } = req.params;
  
  // Phase 9 Auth: For now, trust the request if it comes from the internal network or has the internal API key.
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const { flushProject } = await import('./persistence.js');
    await flushProject(projectId);
    res.status(200).send('Flushed');
  } catch (err) {
    console.error(`Failed to flush project ${projectId}`, err);
    res.status(500).send('Internal Server Error');
  }
});

// Restore endpoint to replace the Yjs document state with historical content securely
app.post('/collaboration/project/:projectId/file/:filePath(*)/restore', express.json(), async (req, res) => {
  const { projectId, filePath } = req.params;
  const { content } = req.body;
  
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).send('Unauthorized');
  }

  if (typeof content !== 'string') {
    return res.status(400).send('Missing or invalid content');
  }

  const docName = `project:${projectId}:file:${filePath}`;
  
  // Try to get active doc in memory, or load it
  let doc = docs.get(docName);
  
  if (!doc) {
    // If not in memory, we load it just to restore it and bind persistence
    doc = getYDoc(docName, true);
    const initialContent = await fetchInitialContent(projectId, filePath);
    const text = doc.getText('codemirror');
    if (initialContent) {
      text.insert(0, initialContent);
    }
    bindStateToPersistence(docName, doc, projectId, filePath);
  }

  // Atomically replace all content in the y-text
  const text = doc.getText('codemirror');
  doc.transact(() => {
    text.delete(0, text.length);
    text.insert(0, content);
  }, 'restore-version');
  
  res.status(200).send('Restored');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (request, socket, head) => {
  // Validate URL: /collaboration/project/:projectId/file/:fileId?token=...
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  if (pathParts[0] !== 'collaboration' || pathParts[1] !== 'project' || pathParts[3] !== 'file') {
    socket.destroy();
    return;
  }
  
  const projectId = pathParts[2];
  // The rest of the path is the file path (which might contain slashes)
  const rawFilePath = pathParts.slice(4).join('/');
  const filePath = decodeURIComponent(rawFilePath);
  
  // y-websocket appends "/" + roomName to the URL; when roomName is empty this corrupts
  // the query string (e.g. ?token=abc → ?token=abc/). Strip the trailing slash.
  const rawToken = url.searchParams.get('token');
  const token = rawToken ? rawToken.replace(/\/$/, '') : null;
  
  if (!projectId || !filePath || !token) {
    socket.destroy();
    return;
  }
  
  // Phase 9 Authorization Boundary
  const isValid = await verifyCollabToken(token, projectId);
  if (!isValid) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  
  const docName = `project:${projectId}:file:${filePath}`;

  // If the document is not already loaded in memory, fetch initial content from DB
  if (!docs.has(docName)) {
    try {
      const initialContent = await fetchInitialContent(projectId, filePath);
      
      // We create a temporary Y.Doc, apply the content, and setupWSConnection will use this doc name
      const doc = getYDoc(docName, true);
      const text = doc.getText('codemirror');
      if (initialContent) {
        text.insert(0, initialContent);
      }
      
      // Setup debounced persistence for this document
      bindStateToPersistence(docName, doc, projectId, filePath);
    } catch (err) {
      console.error(`Failed to initialize document ${docName}`, err);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
      return;
    }
  }

  wss.handleUpgrade(request, socket, head, (ws: any) => {
    wss.emit('connection', ws, request, { docName });
  });
});

wss.on('connection', (ws: any, request: any, { docName }: any) => {
  console.log(`Client connected to ${docName}`);
  
  // y-websocket's setupWSConnection handles the sync protocol and awareness
  // It will create the document in its internal map if it doesn't exist,
  // but since we pre-created it (or it already exists), it will use that.
  setupWSConnection(ws, request, { 
    docName, 
    gc: true 
  });
});

server.listen(port, () => {
  console.log(`Collaboration server running on ws://localhost:${port}`);
});
