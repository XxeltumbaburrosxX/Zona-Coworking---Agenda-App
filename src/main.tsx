import React, { Component, ReactNode, StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log("🛠️ App Inicializada correctamente - INICIO");

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary atrapó un error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#182865' }}>Ups, algo salió mal.</h1>
          <p style={{ color: '#FF9305' }}>Por favor, recarga la página o contacta a soporte si el problema persiste.</p>
          <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '1rem', overflow: 'auto', fontSize: '12px' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

console.log("✅ App Inicializada correctamente - FIN");
