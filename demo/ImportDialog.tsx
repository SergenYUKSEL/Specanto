import { useEffect, useRef, useState } from 'react';
import { Icon } from '../src/ui/Icon';

export function ImportDialog({ onClose, onImport }: { onClose: () => void; onImport: (input: { spec: string } | { specUrl: string }) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function readFile(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Le document dépasse la limite de 2 Mio.'); return; }
    try { onImport({ spec: await file.text() }); }
    catch { setError('Impossible de lire ce fichier. Choisissez un fichier JSON ou YAML.'); }
  }
  function loadUrl(event: React.FormEvent) {
    event.preventDefault();
    try {
      const value = new URL(url);
      if (!['http:', 'https:'].includes(value.protocol) || value.username || value.password) throw new Error();
      onImport({ specUrl: value.href });
    } catch { setError('Saisissez une URL HTTP ou HTTPS complète, sans identifiants.'); }
  }
  return <dialog ref={dialog} className="import-dialog" onCancel={onClose} aria-labelledby="import-title">
    <div className="dialog-heading"><h2 id="import-title">Votre API, ici.</h2><button onClick={onClose} aria-label="Fermer l’import"><Icon name="close" size={22} /></button></div>
    <p>Chargez une description OpenAPI 3.1 au format JSON ou YAML.</p>
    <label className="file-drop">Choisir un fichier JSON ou YAML<input type="file" accept=".json,.yaml,.yml,application/json" onChange={event => void readFile(event.target.files?.[0])} /><span>2 Mio maximum · Le fichier reste dans votre navigateur.</span></label>
    <div className="import-divider">ou depuis une URL</div>
    <form onSubmit={loadUrl}><label htmlFor="spec-url">URL de la description OpenAPI</label><input id="spec-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://votre-api.fr/openapi.json" required /><button type="submit" className="primary-link">Charger la documentation <Icon name="arrowUpRight" size={22} /></button></form>
    {error && <p className="import-error" role="alert">{error}</p>}
    <p className="dialog-note">Le chargement par URL dépend des autorisations du serveur. Aucun secret du client de test n’est transmis.</p>
  </dialog>;
}
