import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './data/config' // aplica la configuración guardada antes de dibujar
import App from './App'
import { DataProvider } from './data/DataContext'
import { NominaProvider } from './data/NominaContext'
import { PqrProvider } from './data/PqrContext'
import { DocumentosProvider } from './data/DocumentosContext'
import { OperacionProvider } from './data/OperacionContext'
import { AsistenteProvider } from './data/AsistenteContext'
import { ToastProvider } from './components/ui/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <DataProvider>
          <NominaProvider>
            <PqrProvider>
              <OperacionProvider>
                <DocumentosProvider>
                  <AsistenteProvider>
                    <App />
                  </AsistenteProvider>
                </DocumentosProvider>
              </OperacionProvider>
            </PqrProvider>
          </NominaProvider>
        </DataProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
