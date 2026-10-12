export {};

const api = Bun.spawn(['bun', 'run', 'server/index.ts'], { env: { ...process.env, PORT: '3001' }, stdout: 'inherit', stderr: 'inherit' });
const ui = Bun.spawn(['bun', '--bun', 'vite', '--config', 'vite.demo.config.ts', '--host', '0.0.0.0'], { stdout: 'inherit', stderr: 'inherit' });
const stop = () => { api.kill(); ui.kill(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
const code = await Promise.race([api.exited, ui.exited]);
stop();
process.exit(code);
