import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from '@/App.jsx'
import '@/styles/forge.css'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
)
