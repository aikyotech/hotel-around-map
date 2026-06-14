/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import GuestView from './components/GuestView';
import CmsView from './components/CmsView';

export default function App() {
  const [view, setView] = useState<'guest' | 'cms'>(() => {
    // Check search params on first load
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'cms' ? 'cms' : 'guest';
  });

  // Keep route synced with search params so bookmarking / page reload works smoothly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (view === 'cms') {
      params.set('view', 'cms');
    } else {
      params.delete('view');
    }
    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({ path: newRelativePathQuery }, '', newRelativePathQuery);
  }, [view]);

  return (
    <div className="w-full min-h-screen bg-slate-900 overflow-hidden font-sans">
      {view === 'guest' ? (
        <GuestView onGoToCms={() => setView('cms')} />
      ) : (
        <CmsView onBackToGuest={() => setView('guest')} />
      )}
    </div>
  );
}
