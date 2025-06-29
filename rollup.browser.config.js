import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

// Browser-compatible build with Node.js polyfills
export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.browser.umd.js',
    format: 'umd',
    name: 'MarkdownDataExtensionParser',
    sourcemap: true,
    globals: {
      // Define globals for external dependencies if needed
    }
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      compilerOptions: {
        // Override for browser build
        target: 'ES2020',
        lib: ['ES2020', 'DOM'],
        exactOptionalPropertyTypes: false,
        strict: false
      }
    }),
    // Custom plugin to provide Node.js polyfills
    {
      name: 'node-polyfills',
      resolveId(id) {
        if (id === 'fs') return id;
        if (id === 'path') return id;
        if (id === 'util') return id;
        return null;
      },
      load(id) {
        if (id === 'fs') {
          // Provide minimal fs polyfill for browser
          return `
            export function readFileSync() {
              throw new Error('fs.readFileSync is not available in browser');
            }
            export function existsSync() {
              return false;
            }
            export function writeFileSync() {
              throw new Error('fs.writeFileSync is not available in browser');
            }
            export const promises = {
              readFile() {
                throw new Error('fs.promises.readFile is not available in browser');
              },
              writeFile() {
                throw new Error('fs.promises.writeFile is not available in browser');
              },
              access() {
                throw new Error('fs.promises.access is not available in browser');
              }
            };
          `;
        }
        if (id === 'path') {
          // Provide basic path polyfill for browser
          return `
            export function join(...segments) {
              return segments.filter(Boolean).join('/').replace(/\\/\\//g, '/');
            }
            export function resolve(...segments) {
              return segments.filter(Boolean).join('/').replace(/\\/\\//g, '/');
            }
            export function dirname(path) {
              return path.split('/').slice(0, -1).join('/') || '/';
            }
            export function basename(path, ext) {
              const name = path.split('/').pop() || '';
              return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
            }
            export function extname(path) {
              const parts = (path.split('/').pop() || '').split('.');
              return parts.length > 1 ? '.' + parts.pop() : '';
            }
            export const sep = '/';
          `;
        }
        if (id === 'util') {
          // Provide minimal util polyfill for browser
          return `
            export function format(f, ...args) {
              let str = String(f);
              let i = 0;
              return str.replace(/%[sdj%]/g, (x) => {
                if (x === '%%') return x;
                if (i >= args.length) return x;
                switch (x) {
                  case '%s': return String(args[i++]);
                  case '%d': return Number(args[i++]);
                  case '%j':
                    try {
                      return JSON.stringify(args[i++]);
                    } catch (_) {
                      return '[Circular]';
                    }
                  default:
                    return x;
                }
              });
            }
            export function inspect(obj) {
              return JSON.stringify(obj, null, 2);
            }
          `;
        }
        return null;
      }
    }
  ]
};