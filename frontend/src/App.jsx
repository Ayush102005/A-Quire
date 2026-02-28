import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import VideoPlayer from './pages/VideoPlayer';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/learning/:courseId" element={<VideoPlayer />} />
    </Routes>
  );
}

export default App;
