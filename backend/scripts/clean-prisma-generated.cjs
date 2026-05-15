/**
 * Best-effort remove generated Prisma client (Windows EPERM when query_engine DLL is locked).
 * Retries with synchronous delay; never fails the npm script.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin */
  }
}

for (let i = 0; i < 8; i++) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    break;
  } catch {
    sleepSync(400);
  }
}
