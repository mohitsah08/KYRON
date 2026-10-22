import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from './context/RouterContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { App } from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </RouterProvider>
  </React.StrictMode>
);
