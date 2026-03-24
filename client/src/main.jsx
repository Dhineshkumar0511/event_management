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
            borderRadius: '14px',
            padding: '14px 18px',
            background: 'rgba(10, 11, 30, 0.96)',
            color: '#eef0ff',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px)',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '14px',
          },
          success: {
            style: {
              background: 'rgba(10, 11, 30, 0.96)',
              border: '1px solid rgba(0, 245, 160, 0.2)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45), 0 0 30px rgba(0, 245, 160, 0.04)',
            },
            iconTheme: {
              primary: '#00f5a0',
              secondary: '#060612',
            },
          },
          error: {
            style: {
              background: 'rgba(10, 11, 30, 0.96)',
              border: '1px solid rgba(244, 63, 138, 0.2)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45), 0 0 30px rgba(244, 63, 138, 0.04)',
            },
            iconTheme: {
              primary: '#f43f8a',
              secondary: '#060612',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
