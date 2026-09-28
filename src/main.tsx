// 글쓰기·제목용 명조체. 화면 UI는 시스템 고딕을 쓴다.
import '@fontsource/noto-serif-kr/400.css'
import '@fontsource/noto-serif-kr/700.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
