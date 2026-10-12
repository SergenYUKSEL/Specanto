import { useEffect, useRef, useState } from 'react';
import { ApiReference, SpecComparison, type ReferenceLocale, type ServerProfile } from '../src';
import { Icon } from '../src/ui/Icon';
import { ImportDialog } from './ImportDialog';

const github = 'https://github.com/SergenYUKSEL/Specanto';
const atelierProfiles: ServerProfile[] = [{ id: 'atelier', label: 'Atelier · démo active', url: `${window.location.origin}/api`, description: 'API fictive hébergée avec cette démonstration.' }];

export function App() {
  const path = window.location.pathname.replace(/\/$/, '');
  return path === '/demo' ? <Demo /> : path === '/compare' ? <Comparison /> : <Showcase />;
}

function LanguageSelect({ locale, onChange }: { locale: ReferenceLocale; onChange: (locale: ReferenceLocale) => void }) {
  return <select aria-label={locale === 'fr' ? 'Langue de l’interface' : 'Interface language'} value={locale} onChange={event => onChange(event.target.value === 'en' ? 'en' : 'fr')}><option value="fr">FR</option><option value="en">EN</option></select>;
}

function Comparison() {
  const [locale, setLocale] = useState<ReferenceLocale>(() => new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'fr');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  useEffect(() => { document.title = 'OpenAPI comparison — Specanto'; }, []);
  return <div className="demo-page" data-mode={mode} lang={locale}><header className="demo-toolbar"><a className="back-link" href={`/demo?lang=${locale}`}><Icon name="arrowLeft" /><span>{locale === 'fr' ? 'Référence API' : 'API reference'}</span></a><div className="demo-actions"><LanguageSelect locale={locale} onChange={setLocale} /><button className="theme-button" onClick={() => setMode(current => current === 'light' ? 'dark' : 'light')} aria-label={locale === 'fr' ? 'Changer le thème' : 'Change theme'}><Icon name={mode === 'light' ? 'moon' : 'sun'} size={22} /></button></div></header><SpecComparison locale={locale} colorMode={mode} /></div>;
}

function Demo() {
  const [input, setInput] = useState<{ specUrl: string } | { spec: string }>({ specUrl: '/openapi.json' });
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [importing, setImporting] = useState(false);
  const [revision, setRevision] = useState(0);
  const [locale, setLocale] = useState<ReferenceLocale>(() => new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'fr');
  const reset = () => { setInput({ specUrl: '/openapi.json' }); setRevision(v => v + 1); };
  useEffect(() => { document.title = 'Atelier API — Specanto'; }, []);
  return <div className="demo-page" data-mode={mode}>
    <header className="demo-toolbar" lang={locale}>
      <a className="back-link" href="/"><Icon name="arrowLeft" /><span>Specanto</span></a>
      <span className="demo-indicator"><span /> {locale === 'fr' ? 'API de démonstration' : 'Demonstration API'}</span>
      <div className="demo-actions">
        <a href={`/compare?lang=${locale}`}><Icon name="compare" size={15} />{locale === 'fr' ? 'Comparer' : 'Compare'}</a>
        <button onClick={() => setImporting(true)}>{locale === 'fr' ? 'Importer une API' : 'Import an API'}</button>
        <LanguageSelect locale={locale} onChange={setLocale} />
        <button className="theme-button" onClick={() => setMode(m => m === 'light' ? 'dark' : 'light')} aria-label={locale === 'fr' ? mode === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair' : mode === 'light' ? 'Enable dark mode' : 'Enable light mode'}><Icon name={mode === 'light' ? 'moon' : 'sun'} size={22} /></button>
      </div>
    </header>
    <ApiReference key={revision} {...input} locale={locale} colorMode={mode} serverProfiles={'specUrl' in input && input.specUrl === '/openapi.json' ? atelierProfiles : undefined} />
    <footer className="demo-footnote" lang={locale}>{locale === 'fr' ? 'API fictive. Requêtes HTTP réelles. Aucune commande conservée.' : 'Fictional API. Real HTTP requests. No orders retained.'} <button onClick={reset}>{locale === 'fr' ? 'Revenir à Atelier' : 'Return to Atelier'}</button></footer>
    {importing && <ImportDialog locale={locale} onClose={() => setImporting(false)} onImport={value => { setInput(value); setRevision(v => v + 1); setImporting(false); }} />}
  </div>;
}

function Showcase() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const snippet = 'import { ApiReference } from "@specanto/react";\nimport "@specanto/react/styles.css";\n\n<ApiReference specUrl="/openapi.json" />';
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  async function copy() {
    try { await navigator.clipboard.writeText(snippet); setCopied(true); resetTimer.current = setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  }
  return <div className="showcase">
    <header className="site-header">
      <a href="/" className="site-wordmark" aria-label="Specanto accueil">specanto<span className="brand-period">.</span></a>
      <nav aria-label="Navigation principale"><a href="#approche">L’approche</a><a href={github} target="_blank" rel="noreferrer">GitHub <Icon name="arrowUpRight" /></a><a className="header-demo" href="/demo">Ouvrir la démo <Icon name="arrowUpRight" /></a></nav>
    </header>
    <main>
      <section className="hero">
        <div className="hero-note"><span className="tiny-mark" /> Un fichier OpenAPI. Tout devient lisible.</div>
        <h1>La documentation API,<br />avec du caractère.</h1>
        <div className="hero-bottom">
          <p>Des routes faciles à trouver. Des requêtes à portée de main.<br className="desktop-break" /> Une documentation qui donne envie de comprendre votre API.</p>
          <a className="primary-link" href="/demo">Explorer la démo <Icon name="arrowUpRight" size={22} /></a>
        </div>
        <div className="hero-meta"><span>Bibliothèque React</span><span>OpenAPI 3.1</span><span>Sans compte</span></div>
      </section>
      <section className="live-section" aria-labelledby="live-title">
        <div className="section-heading"><div><h2 id="live-title">De la spec à la requête.</h2><p>Une API de boutique fictive. Un vrai client HTTP. À vous de jouer.</p></div><a href="/demo">Passer en plein écran <Icon name="arrowUpRight" /></a></div>
        <div className="live-frame"><div className="frame-title"><span className="frame-dots"><i /><i /><i /></span><span>Atelier API</span><span className="frame-version">Démo interactive</span></div><ApiReference specUrl="/openapi.json" colorMode="light" /></div>
      </section>
      <section className="approach-section" id="approche">
        <div className="approach-lead"><h2>Votre API a déjà<br />une structure.<br />Donnons-lui une voix.</h2><p>Specanto transforme votre description OpenAPI en une interface de lecture et de test. La typographie crée la hiérarchie. Le contenu garde toute la place.</p></div>
        <div className="principles">
          <article><span className="principle-symbol" aria-hidden="true">Aa</span><div><h3>La lecture, d’abord.</h3><p>Une navigation par tags, des paramètres clairs et des exemples à côté des schémas. La bonne information, au bon endroit.</p></div></article>
          <article><span className="principle-symbol" aria-hidden="true"><Icon name="enter" size={38} /></span><div><h3>Essayez ce que vous lisez.</h3><p>Préparez votre requête, vérifiez la destination et envoyez-la. Le statut, la durée et la réponse restent visibles.</p></div></article>
          <article><span className="principle-symbol" aria-hidden="true"><Icon name="plus" size={38} /></span><div><h3>À sa place dans vos projets.</h3><p>Un composant React et des styles personnalisables. Vos polices, vos couleurs, votre hébergement.</p></div></article>
        </div>
      </section>
      <section className="integration-section">
        <div><h2>Une petite place<br />dans votre code.</h2><p>Le contrat d’intégration tient en quelques lignes.<br />Le package est en préparation ; la démo est disponible dès maintenant.</p><a href={github} target="_blank" rel="noreferrer">Voir le projet sur GitHub <Icon name="arrowUpRight" /></a></div>
        <div className="integration-code"><div><span>React / TypeScript</span><button onClick={copy}>{copied ? 'Copié' : 'Copier l’exemple'}</button></div><pre><code>{snippet}</code></pre><span role="status" className="sr-only">{copied ? 'Exemple copié' : ''}</span></div>
      </section>
    </main>
    <footer className="site-footer"><span className="footer-wordmark">specanto.</span><p>La documentation API, avec du caractère.</p><a href={github} target="_blank" rel="noreferrer">Un projet de Sergen <Icon name="arrowUpRight" /></a></footer>
  </div>;
}
