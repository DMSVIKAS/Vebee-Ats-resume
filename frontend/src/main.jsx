import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { VeeBeeProvider } from './context';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <VeeBeeProvider>
        <App />
      </VeeBeeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
