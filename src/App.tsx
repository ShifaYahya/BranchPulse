import { Footer, Header } from './components/Layout';
import { UIProvider } from './components/Feedback';
import { IAlert } from './components/Icons';
import { useRoute } from './lib/router';
import { StoreProvider, useStore } from './lib/store';
import { ActionsPage } from './pages/ActionsPage';
import { ComparePage } from './pages/ComparePage';
import { DataPage } from './pages/DataPage';
import { ExplainPage } from './pages/ExplainPage';
import { HomePage } from './pages/HomePage';
import { GuidePage, HowPage, PrivacyPage } from './pages/InfoPages';
import { OverviewPage } from './pages/OverviewPage';
import { RecordsPage } from './pages/RecordsPage';
import { SettingsPage } from './pages/SettingsPage';

const ROUTES: Record<string, () => JSX.Element> = {
  '/': HomePage,
  '/overview': OverviewPage,
  '/explain': ExplainPage,
  '/compare': ComparePage,
  '/actions': ActionsPage,
  '/records': RecordsPage,
  '/data': DataPage,
  '/settings': SettingsPage,
  '/how': HowPage,
  '/guide': GuidePage,
  '/privacy': PrivacyPage,
};

function Shell() {
  const { path } = useRoute();
  const { saveError } = useStore();
  const View = ROUTES[path] ?? NotFound;
  return (
    <>
      <Header path={path} />
      {saveError && (
        <div className="container" style={{ marginTop: 14 }}>
          <div className="notice bad">
            <IAlert /> <span>{saveError}</span>
          </div>
        </div>
      )}
      <main>
        <View key={path} />
      </main>
      <Footer />
    </>
  );
}

function NotFound() {
  return (
    <div className="page">
      <div className="container narrow card empty">
        <h2>Page not found</h2>
        <p className="muted">That link doesn't go anywhere.</p>
        <a className="btn btn-primary" href="#/" style={{ marginTop: 16 }}>
          Go home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <UIProvider>
        <Shell />
      </UIProvider>
    </StoreProvider>
  );
}
