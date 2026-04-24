import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/shared/Layout'
import Home    from './pages/Home'
import Write   from './pages/Write'
import Archive from './pages/Archive'
import Drafts  from './pages/Drafts'
import Stats   from './pages/Stats'

// DevReviewPanel은 개발 환경에서만 로드.
// import.meta.env.DEV는 빌드 타임 상수로 치환되므로 프로덕션 번들에서는
// lazy 호출 자체가 제거되고 DevReviewPanel 코드는 번들에 포함되지 않는다.
const DevReviewPanel = import.meta.env.DEV
  ? lazy(() => import('./components/DevReviewPanel/DevReviewPanel'))
  : null

// Layout이 자식 라우트를 렌더하는 래퍼.
// Layout의 기존 children 기반 API와 공존시키기 위해 children 대신 <Outlet />을 넘긴다.
function LayoutOutlet() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          {/* Layout을 쓰는 페이지 — 중첩 라우트로 명시 */}
          <Route element={<LayoutOutlet />}>
            <Route index element={<Home />} />
            <Route path="archive" element={<Archive />}>
              {/* /archive/:date — 특정 엔트리 딥링크. Archive 컴포넌트가 URL 파라미터를
                  읽어 해당 엔트리 모달을 자동으로 연다. */}
              <Route path=":date" element={null} />
            </Route>
            <Route path="drafts" element={<Drafts />} />
            <Route path="stats" element={<Stats />} />
          </Route>

          {/* Layout을 쓰지 않는 페이지 — 집필 집중 화면 */}
          <Route path="write" element={<Write />} />
        </Routes>

        {DevReviewPanel && (
          <Suspense fallback={null}>
            <DevReviewPanel />
          </Suspense>
        )}
      </HashRouter>
    </ThemeProvider>
  )
}
