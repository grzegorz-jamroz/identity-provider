import path from 'path';

import dotenv from 'dotenv';

// Note: No need for fileURLToPath here since we can rely on process.cwd()
// which is the root of where you run the `node` command.
// We assume your .env files are in the project root.
const projectRoot = process.cwd();

dotenv.config({ path: path.resolve(projectRoot, '.env') });
dotenv.config({ path: path.resolve(projectRoot, '.env.local'), override: true });

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(projectRoot, '.env.test'), override: true });
}
