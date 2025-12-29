import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom';

import axios from 'axios';

const isProduction = window.location.hostname.includes('vercel.app');
axios.defaults.baseURL = isProduction ? '' : (import.meta.env.VITE_SERVER_URL || '');
axios.defaults.withCredentials = true;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
