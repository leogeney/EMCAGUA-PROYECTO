import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { DataProvider } from './data/DataContext'
import { NominaProvider } from './data/NominaContext'
import { ToastProvider } from './components/ui/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <DataProvider>
          <NominaProvider>
            <App />
          </NominaProvider>
        </DataProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
