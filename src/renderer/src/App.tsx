import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import ProjectList from '@renderer/pages/ProjectList';
import Workspace from '@renderer/pages/Workspace';
import './global.css';

import { Navigate } from 'react-router-dom';
import WordSettingsPage from './modules/WordSettings';
import CharactersPage from './modules/Characters';
import ScenesPage from './modules/Scenes';

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/workspace/:projectId" element={<Workspace />}>
            <Route path="settings" element={<WordSettingsPage />} />
            <Route path="characters" element={<CharactersPage />} />
            <Route path="scenes" element={<ScenesPage />} />
            <Route index element={<Navigate to="settings" replace />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
