import { useEffect, useRef, useState } from 'react';
import { Icon } from '../src/ui/Icon';

export function ImportDialog({ onClose, onImport, locale = 'fr' }: { onClose: () => void; onImport: (input: { spec: string } | { specUrl: string }) => void; locale?: 'fr' | 'en' }) {
  const text = locale === 'en' ? {
    tooLarge: 'The document exceeds the 2 MiB limit.', unreadable: 'Unable to read this file. Choose a JSON or YAML file.', invalidUrl: 'Enter a complete HTTP or HTTPS URL without credentials.',
    title: 'Your API, here.', close: 'Close import', intro: 'Load an OpenAPI 3.1 description in JSON or YAML.', file: 'Choose a JSON or YAML file', size: '2 MiB maximum · The file stays in your browser.',
    divider: 'or from a URL', url: 'OpenAPI description URL', load: 'Load documentation', note: 'URL loading depends on server permissions. No request-console secret is sent.',
  } : {
    tooLarge: 'Le document dépasse la limite de 2 Mio.', unreadable: 'Impossible de lire ce fichier. Choisissez un fichier JSON ou YAML.', invalidUrl: 'Saisissez une URL HTTP ou HTTPS complète, sans identifiants.',
    title: 'Votre API, ici.', close: 'Fermer l’import', intro: 'Chargez une description OpenAPI 3.1 au format JSON ou YAML.', file: 'Choisir un fichier JSON ou YAML', size: '2 Mio maximum · Le fichier reste dans votre navigateur.',
    divider: 'ou depuis une URL', url: 'URL de la description OpenAPI', load: 'Charger la documentation', note: 'Le chargement par URL dépend des autorisations du serveur. Aucun secret du client de test n’est transmis.',
  };
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function readFile(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError(text.tooLarge); return; }
    try { onImport({ spec: await file.text() }); }
    catch { setError(text.unreadable); }
  }
  function loadUrl(event: React.FormEvent) {
    event.preventDefault();
    try {
      const value = new URL(url);
      if (!['http:', 'https:'].includes(value.protocol) || value.username || value.password) throw new Error();
      onImport({ specUrl: value.href });
    } catch { setError(text.invalidUrl); }
  }
  return <dialog ref={dialog} className="import-dialog" onCancel={onClose} aria-labelledby="import-title">
    <div className="dialog-heading"><h2 id="import-title">{text.title}</h2><button onClick={onClose} aria-label={text.close}><Icon name="close" size={22} /></button></div>
    <p>{text.intro}</p>
    <label className="file-drop">{text.file}<input type="file" accept=".json,.yaml,.yml,application/json" onChange={event => void readFile(event.target.files?.[0])} /><span>{text.size}</span></label>
    <div className="import-divider">{text.divider}</div>
    <form onSubmit={loadUrl}><label htmlFor="spec-url">{text.url}</label><input id="spec-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://api.example.com/openapi.json" required /><button type="submit" className="primary-link">{text.load} <Icon name="arrowUpRight" size={22} /></button></form>
    {error && <p className="import-error" role="alert">{error}</p>}
    <p className="dialog-note">{text.note}</p>
  </dialog>;
}
