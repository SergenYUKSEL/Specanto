import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const repository = resolve(import.meta.dir, '..');
const temporary = await mkdtemp(join(tmpdir(), 'specanto-consumer-'));
try {
  const pack = Bun.spawnSync(['bun', 'pm', 'pack', '--destination', temporary], { cwd: repository, stdout: 'pipe', stderr: 'pipe' });
  if (pack.exitCode !== 0) throw new Error(pack.stderr.toString());
  const tarball = (await Array.fromAsync(new Bun.Glob('*.tgz').scan(temporary)))[0];
  if (!tarball) throw new Error('Package archive was not created');
  const manifest = {
    name: 'specanto-clean-consumer', private: true, type: 'module',
    dependencies: { '@specanto/react': `file:${join(temporary, tarball)}`, react: '19.3.0', 'react-dom': '19.3.0', vite: '8.3.4' },
  };
  await writeFile(join(temporary, 'package.json'), JSON.stringify(manifest));
  await writeFile(join(temporary, 'index.html'), '<div id="root"></div><script type="module" src="/main.jsx"></script>');
  await writeFile(join(temporary, 'main.jsx'), 'import React from "react"; import { createRoot } from "react-dom/client"; import { ApiReference } from "@specanto/react"; import "@specanto/react/styles.css"; createRoot(document.getElementById("root")).render(React.createElement(ApiReference, {spec: {openapi:"3.1.1",info:{title:"Consumer",version:"1"},paths:{}}}));');
  for (const command of [['bun', 'install'], ['bun', '--bun', 'vite', 'build']]) {
    const task = Bun.spawn(command, { cwd: temporary, stdout: 'inherit', stderr: 'inherit' });
    if (await task.exited !== 0) throw new Error(`Consumer command failed: ${command.join(' ')}`);
  }
  console.log('Clean consumer: built package, React peer dependency and exported CSS verified.');
} finally { await rm(temporary, { recursive: true, force: true }); }
