import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './app/page';
import ProcessingPage from './app/processing/page';
import ResultsPage from './app/results/page';
import RoulettePage from './app/roulette/page';
import RootLayout from './app/layout';

function App() {
  return (
    <BrowserRouter>
      <RootLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/roulette" element={<RoulettePage />} />
        </Routes>
      </RootLayout>
    </BrowserRouter>
  );
}

export default App;
