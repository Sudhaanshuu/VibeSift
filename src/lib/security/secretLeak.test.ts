import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security & Secret Leakage Prevention Gate', () => {
  it('ensures .gitignore strictly blocks sensitive environment and credential files', () => {
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    // Must ignore .env files
    expect(content).toMatch(/\.env/);
    // Must ignore local config
    expect(content).toMatch(/node_modules/);
    expect(content).toMatch(/dist/);
  });

  it('scans all TypeScript source files to verify no live AWS keys or private secrets are hardcoded', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    
    const getAllFiles = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach((file: string) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllFiles(filePath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          results.push(filePath);
        }
      });
      return results;
    };

    const files = getAllFiles(srcDir);
    expect(files.length).toBeGreaterThan(10);

    const sensitivePatterns = [
      /AKIA[0-9A-Z]{16}/, // AWS Access Key ID
      /-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----/, // Private Cryptographic Keys
      /ghp_[0-9a-zA-Z]{36}/, // GitHub Personal Access Token
      /sk_live_[0-9a-zA-Z]{24}/, // Stripe Live Secret Key
    ];

    files.forEach((file) => {
      const code = fs.readFileSync(file, 'utf-8');
      sensitivePatterns.forEach((pattern) => {
        const match = code.match(pattern);
        if (match) {
          throw new Error(`Potential secret leak detected in ${file}: ${match[0]}`);
        }
      });
    });
  });
});
