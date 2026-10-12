import type { HistoryEntry, HistoryOutcome } from '../core/session';
import type { Operation } from '../core/types';
import { Icon } from './Icon';
import '../styles/session.css';

const labels = {
  en: {
    session: 'Session', favorites: 'Favorites', history: 'Request history', clearHistory: 'Clear request history', clearFavorites: 'Clear favorites', clear: 'Clear',
    emptyFavorites: 'No favorites. Save operations with the favorite button.', emptyHistory: 'No requests sent during this session.',
    privacy: 'Memory only: operation, server origin, status and timing. No parameters, headers or bodies. Cleared on import or reload.',
    navigate: (method: string, path: string) => `Open documentation for ${method} ${path}`,
    missingOrigin: 'Unknown origin',
    outcomes: { response: 'Response', cancelled: 'Cancelled', timeout: 'Timed out', 'network-error': 'Network error', 'transport-error': 'Transport error' } satisfies Record<HistoryOutcome, string>,
  },
  fr: {
    session: 'Session', favorites: 'Favoris', history: 'Historique des requêtes', clearHistory: 'Effacer l’historique des requêtes', clearFavorites: 'Effacer les favoris', clear: 'Effacer',
    emptyFavorites: 'Aucun favori. Enregistrez des opérations avec le bouton favori.', emptyHistory: 'Aucune requête envoyée pendant cette session.',
    privacy: 'En mémoire : opération, origine du serveur, statut et durée. Aucun paramètre, en-tête ou corps. Effacé à l’import ou au rechargement.',
    navigate: (method: string, path: string) => `Ouvrir la documentation de ${method} ${path}`,
    missingOrigin: 'Origine inconnue',
    outcomes: { response: 'Réponse', cancelled: 'Annulée', timeout: 'Délai dépassé', 'network-error': 'Erreur réseau', 'transport-error': 'Erreur du transport' } satisfies Record<HistoryOutcome, string>,
  },
};

export type SessionPanelProps = {
  history: readonly HistoryEntry[];
  favorites: readonly Operation[];
  onNavigate: (operationId: string) => void;
  onClearHistory: () => void;
  onClearFavorites: () => void;
  locale?: 'en' | 'fr';
};

export function SessionPanel({ history, favorites, onNavigate, onClearHistory, onClearFavorites, locale = 'fr' }: SessionPanelProps) {
  const text = labels[locale];
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' });
  return <details className="sp-session-panel">
    <summary aria-label={`${text.session}: ${favorites.length} ${text.favorites}, ${history.length} ${text.history}`}><span>{text.session}</span><span className="sp-session-count" aria-hidden="true">{favorites.length} / {history.length}</span><Icon name="arrow" size={14} /></summary>
    <p className="sp-session-privacy">{text.privacy}</p>
    <section aria-label={text.favorites}>
      <div className="sp-session-heading"><h2>{text.favorites} <span>{favorites.length}</span></h2><button type="button" aria-label={text.clearFavorites} onClick={onClearFavorites} disabled={!favorites.length}>{text.clear}</button></div>
      {favorites.length ? <ul className="sp-session-list">{favorites.map(operation => <li key={operation.id}>
        <button type="button" className="sp-session-entry" onClick={() => onNavigate(operation.id)} aria-label={text.navigate(operation.method, operation.path)}>
          <span className="sp-session-operation"><span className={`sp-method sp-method-${operation.method.toLowerCase()}`}>{operation.method}</span><code>{operation.path}</code></span>
          <span className="sp-session-summary">{operation.summary}</span>
        </button>
      </li>)}</ul> : <p className="sp-session-empty">{text.emptyFavorites}</p>}
    </section>
    <section aria-label={text.history}>
      <div className="sp-session-heading"><h2>{text.history} <span>{history.length}</span></h2><button type="button" aria-label={text.clearHistory} onClick={onClearHistory} disabled={!history.length}>{text.clear}</button></div>
      {history.length ? <ol className="sp-session-list">{history.map(entry => <li key={entry.id}>
        <button type="button" className="sp-session-entry" onClick={() => onNavigate(entry.operationId)} aria-label={text.navigate(entry.method, entry.path)}>
          <span className="sp-session-operation"><span className={`sp-method sp-method-${entry.method.toLowerCase()}`}>{entry.method}</span><code>{entry.path}</code></span>
          <span className="sp-session-origin">{entry.origin ?? text.missingOrigin}</span>
          <span className="sp-session-result" data-outcome={entry.outcome} data-error={entry.status !== undefined && entry.status >= 400}>
            <span>{entry.status ?? text.outcomes[entry.outcome]}</span><span>{entry.duration} ms</span>
            <time dateTime={new Date(entry.timestamp).toISOString()} title={fullDate.format(entry.timestamp)}>{time.format(entry.timestamp)}</time>
          </span>
        </button>
      </li>)}</ol> : <p className="sp-session-empty">{text.emptyHistory}</p>}
    </section>
  </details>;
}
