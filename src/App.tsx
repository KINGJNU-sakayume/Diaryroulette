import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Write from './pages/Write'
import Archive from './pages/Archive'
import Drafts from './pages/Drafts'
import Stats from './pages/Stats'
import DevReviewPanel from './components/DevReviewPanel/DevReviewPanel'
import { ThemeProvider } from './contexts/ThemeContext'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <div className="min-h-full" style={{ fontFamily: '"Noto Serif KR", serif' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/write" element={<Write />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/drafts" element={<Drafts />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
          <DevReviewPanel />
        </div>
      </HashRouter>
    </ThemeProvider>
  )
}
