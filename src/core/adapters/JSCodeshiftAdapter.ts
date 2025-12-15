import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class JSCodeshiftAdapter {
  private codemodPath: string;

  constructor() {
    // Resolve path to the compiled codemod
    // Assuming implementation is in src/codemods/js/fill-hollow-functions.ts
    // In prod, it should be in dist/codemods/js/fill-hollow-functions.js
    this.codemodPath = path.resolve(__dirname, '../../codemods/js/fill-hollow-functions.js');
  }

  async run(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return;

    // Construct jscodeshift command
    // We use the jscodeshift binary from node_modules
    const binPath = path.resolve(process.cwd(), 'node_modules/.bin/jscodeshift');

    const args = [
      '-t',
      this.codemodPath,
      '--parser',
      'ts',
      '--extensions',
      'js,ts,jsx,tsx',
      ...filePaths,
    ];

    return new Promise((resolve, reject) => {
      const process = spawn(binPath, args, { stdio: 'inherit' });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`jscodeshift exited with code ${code}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }
}
