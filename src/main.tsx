// Noto Serif KR — weights used in the app
import '@fontsource/noto-serif-kr/300.css'
import '@fontsource/noto-serif-kr/400.css'
import '@fontsource/noto-serif-kr/600.css'
import '@fontsource/noto-serif-kr/700.css'

// Playfair Display — used for decorative headings
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/playfair-display/700.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
