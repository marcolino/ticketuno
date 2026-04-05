//import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import here all dependencies css's, to avoid importing them multiple times
import 'react-phone-input-2/lib/material.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
