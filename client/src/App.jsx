import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './screens/Lobby';
import Room from './screens/Room';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
