import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/shared/Layout'
import Home    from './pages/Home'
import Write   from './pages/Write'
import Archive from './pages/Archive'
import Drafts  from './pages/Drafts'
import Stats   from './pages/Stats'
import DevReviewPanel from './components/DevReviewPanel/DevReviewPanel'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={
            <Layout>
              <Home />
            </Layout>
          } />
          <Route path="/write" element={<Write />} />
          <Route path="/archive" element={
            <Layout>
              <Archive />
            </Layout>
          } />
          <Route path="/drafts" element={
            <Layout>
              <Drafts />
            </Layout>
          } />
          <Route path="/stats" element={
            <Layout>
              <Stats />
            </Layout>
          } />
        </Routes>
        {import.meta.env.DEV && <DevReviewPanel />}
      </HashRouter>
    </ThemeProvider>
  )
}
