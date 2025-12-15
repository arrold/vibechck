import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import { DocsLayout } from './layouts/DocsLayout';
import Installation from './pages/docs/Installation.jsx';
import Configuration from './pages/docs/Configuration.jsx';
import Mechanics from './pages/docs/Mechanics.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Docs Routes nested under layout */}
        <Route path="/docs" element={<DocsLayout />}>
          <Route index element={<Navigate to="/docs/installation" replace />} />
          <Route path="installation" element={<Installation />} />
          <Route path="configuration" element={<Configuration />} />
          <Route path="how-it-works" element={<Mechanics />} />
        </Route>
      </Routes>
    </Router>
  );
}
