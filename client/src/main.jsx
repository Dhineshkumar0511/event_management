import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '20px',
            padding: '16px 18px',
            background: 'rgba(8, 20, 36, 0.92)',
            color: '#e2e8f0',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            boxShadow: '0 22px 60px rgba(2, 8, 23, 0.32)',
            backdropFilter: 'blur(18px)',
          },
          success: {
            style: {
              background: 'rgba(6, 78, 59, 0.92)',
              border: '1px solid rgba(52, 211, 153, 0.18)',
              color: '#d1fae5',
            },
            iconTheme: {
              primary: '#34d399',
              secondary: '#052e2b',
            },
          },
          error: {
            style: {
              background: 'rgba(127, 29, 29, 0.94)',
              border: '1px solid rgba(251, 113, 133, 0.18)',
              color: '#ffe4e6',
            },
            iconTheme: {
              primary: '#fb7185',
              secondary: '#4c0519',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
