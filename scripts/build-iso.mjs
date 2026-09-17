import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const psScript = path.join(__dirname, 'package-iso.ps1');

if (!fs.existsSync(psScript)) {
  console.error(`[ERROR] PowerShell script not found: ${psScript}`);
  process.exit(1);
}

console.log(`[INFO] Executing ISO packager from Node.js...`);

try {
  // Pass any CLI arguments forwarded to this script directly to the PowerShell script
  const userArgs = process.argv.slice(2);
  const psArgs = [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    psScript,
    ...userArgs
  ];

  execFileSync('powershell.exe', psArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: true,
  });
  console.log(`[SUCCESS] ISO packaging completed successfully.`);
} catch (error) {
  console.error(`[ERROR] Failed to package ISO:`, error.message);
  process.exit(1);
}
