import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Write from './pages/Write'
import Archive from './pages/Archive'
import Drafts from './pages/Drafts'
import Stats from './pages/Stats'
import DevReviewPanel from './components/DevReviewPanel/DevReviewPanel'

export default function App() {
  return (
    <HashRouter>
      <div className="dark min-h-full" style={{ fontFamily: '"Noto Serif KR", serif' }}>
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
  )
}
