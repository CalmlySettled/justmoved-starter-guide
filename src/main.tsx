import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeVersionCheck } from './lib/appVersion'

// Initialize version check before app starts
initializeVersionCheck();

createRoot(document.getElementById("root")!).render(<App />);
