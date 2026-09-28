import * as Y from 'yjs';
import dotenv from 'dotenv';

dotenv.config();

const getAppUrl = () => process.env.APP_URL || 'http://localhost:3000';

// API Key or Secret to authorize internal API calls between Collaboration Server and Web App
const getInternalApiKey = () => process.env.INTERNAL_API_KEY || 'development_secret_key';

/**
 * Fetches the initial content of a file from the PostgreSQL database via the Web App's internal API.
 */
export async function fetchInitialContent(projectId: string, path: string): Promise<string> {
  const url = `${getAppUrl()}/api/internal/files?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(path)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'x-internal-api-key': getInternalApiKey()
      }
    });

    if (!res.ok) {
      if (res.status === 404) {
        // File doesn't exist yet or is empty
        return '';
      }
      throw new Error(`Failed to fetch initial content: ${res.status}`);
    }

    const data = await res.json();
    return data.content || '';
  } catch (err) {
    console.error(`Error fetching initial content for ${projectId}/${path}:`, err);
    throw err;
  }
}

// Track active timeouts so we can flush them manually if needed
const activeTimeouts = new Map<string, { timeout: NodeJS.Timeout, flush: () => Promise<void> }>();

/**
 * Binds a Y.Doc to debounced persistence.
 */
export function bindStateToPersistence(docName: string, doc: Y.Doc, projectId: string, path: string) {
  const DEBOUNCE_MS = 2000;

  doc.on('update', () => {
    const existing = activeTimeouts.get(docName);
    if (existing) {
      clearTimeout(existing.timeout);
    }
    
    const flushFn = async () => {
      try {
        const text = doc.getText('codemirror').toString();
        
        const url = `${getAppUrl()}/api/internal/files`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': getInternalApiKey()
          },
          body: JSON.stringify({ projectId, path, content: text })
        });

        if (!res.ok) {
          console.error(`Failed to persist document ${docName}, status: ${res.status}`);
        } else {
          console.log(`Successfully persisted ${docName}`);
        }
      } catch (err) {
        console.error(`Error persisting document ${docName}:`, err);
      } finally {
        activeTimeouts.delete(docName);
      }
    };

    const timeout = setTimeout(flushFn, DEBOUNCE_MS);
    activeTimeouts.set(docName, { timeout, flush: flushFn });
  });
}

/**
 * Flushes all pending writes for a specific project.
 */
export async function flushProject(projectId: string): Promise<void> {
  const prefix = `project:${projectId}:file:`;
  const promises: Promise<void>[] = [];
  
  for (const [docName, { timeout, flush }] of activeTimeouts.entries()) {
    if (docName.startsWith(prefix)) {
      clearTimeout(timeout);
      promises.push(flush());
    }
  }
  
  await Promise.all(promises);
}
