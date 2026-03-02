import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // React StrictMode can cause Supabase auth lock issues in development
  // by double-mounting components. We disable it here to avoid
  // "Lock broken by another request with the 'steal' option" AbortErrors.
  // <StrictMode>
    <App />
  // </StrictMode>,
)
