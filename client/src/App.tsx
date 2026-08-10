import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import ShareClimb from './pages/ShareClimb';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/share/:id" element={<ShareClimb />} />
      </Routes>
    </BrowserRouter>
  );
}
