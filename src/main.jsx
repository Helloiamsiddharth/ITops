import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ConfigProvider } from './ConfigContext'
import App from './App'
import './index.css'
if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark')
createRoot(document.getElementById('root')).render(
  <HashRouter><AuthProvider><ConfigProvider><App /></ConfigProvider></AuthProvider></HashRouter>)
