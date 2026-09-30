import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import App from './App'
import './index.css'
if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark')
createRoot(document.getElementById('root')).render(<HashRouter><AuthProvider><App /></AuthProvider></HashRouter>)
