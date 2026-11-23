import { buildSampleDataset, SAMPLE_BUSINESS } from '../lib/sample';
import { go } from '../lib/router';
import { useStore } from '../lib/store';
import { IUpload } from '../components/Icons';

export function NeedData() {
  const { ws, replaceAll } = useStore();
  return (
    <div className="page">
      <div className="container narrow">
        <div className="card empty">
          <div className="driver-icon" style={{ margin: '0 auto 18px', background: 'var(--lime)', width: 56, height: 56 }}>
            <IUpload />
          </div>
          <h2>Add your data to get started</h2>
          <p className="muted" style={{ maxWidth: '52ch', margin: '0 auto' }}>
            Upload a sales CSV (staffing, stock and feedback are optional), or try BranchPulse with a ready-made café chain.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 22 }}>
            <a className="btn btn-primary" href="#/data">
              Upload my files
            </a>
            <button
              className="btn btn-lime"
              onClick={() => {
                const { data, files } = buildSampleDataset();
                replaceAll({ ...ws, data, files, settings: { ...ws.settings, businessName: ws.settings.businessName || SAMPLE_BUSINESS } });
                go('/overview');
              }}
            >
              Try the sample data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
