import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const repository = resolve(import.meta.dir, '..');
const roots = ['react-markdown', 'yaml', 'react', 'react-dom', '@fontsource-variable/archivo', '@fontsource/ibm-plex-mono'];
const packages = new Map<string, { version: string; license: string; text: string }>();

async function visit(name: string): Promise<void> {
  if (packages.has(name)) return;
  const directory = join(repository, 'node_modules', name);
  const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as {
    version: string; license?: string; dependencies?: Record<string, string>;
  };
  const licenseFiles = (await readdir(directory)).filter((file) => /^licen[sc]e(?:[.-]|$)/i.test(file)).sort();
  if (licenseFiles.length === 0) throw new Error(`Missing installed license text: ${name}`);
  const text = (await Promise.all(licenseFiles.map((file) => readFile(join(directory, file), 'utf8')))).join('\n\n').trim();
  packages.set(name, { version: manifest.version, license: manifest.license ?? 'See text', text });
  for (const dependency of Object.keys(manifest.dependencies ?? {}).sort()) await visit(dependency);
}

for (const root of roots) await visit(root);
let notices = '# Third-party notices\n\n';
notices += 'Generated from the installed, locked dependencies by `bun run scripts/notices.ts`. These notices cover the React library and the demo, including bundled Markdown/YAML dependencies, React peers and self-hosted demo fonts. Build/test tools are not included in the distributed runtime. Font files are bundled only with the demo; a library consumer supplies its own fonts. Each dependency retains its own license.\n\n';
for (const [name, item] of [...packages].sort(([left], [right]) => left.localeCompare(right))) {
  notices += `## ${name} ${item.version} (${item.license})\n\n\`\`\`text\n${item.text}\n\`\`\`\n\n`;
}

const destination = join(repository, 'THIRD_PARTY_NOTICES.md');
if (process.argv.includes('--check')) {
  if (await readFile(destination, 'utf8') !== notices) throw new Error('Third-party notices are stale. Run bun run scripts/notices.ts.');
} else {
  await writeFile(destination, notices);
  const fonts = join(repository, 'public', 'licenses');
  await mkdir(fonts, { recursive: true });
  await writeFile(join(fonts, 'Archivo.txt'), `${packages.get('@fontsource-variable/archivo')!.text}\n`);
  await writeFile(join(fonts, 'IBM-Plex-Mono.txt'), `${packages.get('@fontsource/ibm-plex-mono')!.text}\n`);
}
console.log(`Third-party notices ${process.argv.includes('--check') ? 'verified' : 'generated'}: ${packages.size} packages.`);
