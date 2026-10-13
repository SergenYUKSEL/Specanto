#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { URL } from 'node:url';
import process from 'node:process';
import { log, error } from 'node:console';
import { starterFiles } from './templates.mjs';

const help = `Specanto — créer une documentation React locale

Usage : specanto init <dossier> [--api-url http://localhost:3001]

Crée une app Vite, un fichier OpenAPI à compléter et un proxy local.
Le dossier doit être nouveau et son parent doit exister.
Aucune dépendance n'est installée ; aucune route backend n'est détectée.
`;

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) { log(help); }
  else {
    if (args[0] !== 'init' || !args[1] || args[1].startsWith('-')) throw new Error(help);
    let apiUrl = 'http://localhost:3001';
    if (args.length !== 2) {
      if (args.length !== 4 || args[2] !== '--api-url' || !args[3]) throw new Error(help);
      apiUrl = args[3];
    }
    let api;
    try { api = new URL(apiUrl); } catch { throw new Error('Utilisez une origine API HTTP(S) valide.'); }
    if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.pathname !== '/' || api.search || api.hash) {
      throw new Error('L’origine API doit être HTTP(S), sans chemin, identifiants ni paramètres.');
    }
    const target = resolve(args[1]);
    const name = basename(target).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'api-docs';
    const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    const files = starterFiles(api.origin, version, name);
    try { await mkdir(target); } catch (cause) {
      if (cause.code === 'EEXIST') throw new Error('Le dossier existe déjà. Choisissez un nouveau dossier ; aucun fichier n’a été remplacé.', { cause });
      throw new Error('Impossible de créer le dossier. Vérifiez son parent et vos permissions.', { cause });
    }
    try {
      for (const [file, content] of Object.entries(files)) {
        const path = join(target, file);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, { flag: 'wx' });
      }
    } catch (cause) {
      await rm(target, { recursive: true, force: true });
      throw cause;
    }
    const shellPath = "'" + target.replaceAll("'", "'\\''") + "'";
    log(`Documentation créée. Adaptez public/openapi.json à vos routes, puis :\n\n  cd ${shellPath}\n  bun install\n  bun run dev\n\nBackend cible : ${api.origin}\nDocumentation : http://127.0.0.1:5193\nAlternative : npm install, puis npm run dev.`);
  }
} catch (cause) {
  error(`Specanto : ${cause instanceof Error ? cause.message : 'Création impossible.'}`);
  process.exitCode = 1;
}
