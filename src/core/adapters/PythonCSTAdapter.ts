import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PythonCSTAdapter {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    // Prefer venv python if exists, else system python
    const venvPython = path.resolve(process.cwd(), '.venv/bin/python3');
    // Simple check if venv python exists (sync check for constructor simplicity, or assume async init)
    // For now, let's just stick to a heuristic or try/catch in run.
    // Better: check process.env or just hardcode venv priority.

    this.pythonPath = venvPython;

    // Script is in src/codemods/python/fill_hollow_functions.py
    // In prod/build, it might be in dist or still in src (since it's .py).
    // Let's assume we copy .py files to dist or traverse back to src.
    // For this env, src is fine.
    this.scriptPath = path.resolve(
      __dirname,
      '../../../src/codemods/python/fill_hollow_functions.py'
    );
  }

  async run(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      await this.transformFile(filePath);
    }
  }

  private async transformFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Spawn python process
      const child = spawn(this.pythonPath, [this.scriptPath]);

      let output = '';
      let errorOutput = '';

      // Write content to stdin
      child.stdin.write(content);
      child.stdin.end();

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      await new Promise<void>((resolve, reject) => {
        child.on('close', async (code) => {
          if (code === 0) {
            // Write back to file if changed
            if (output && output !== content) {
              await fs.writeFile(filePath, output, 'utf-8');
            }
            resolve();
          } else {
            // Fallback to system python if venv failed?
            // Or just log error.
            console.warn(`Python transform failed for ${filePath}: ${errorOutput}`);
            reject(new Error(`LibCST exited with code ${code}`));
          }
        });

        child.on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      console.error(`Failed to transform ${filePath}`, error);
    }
  }
}
