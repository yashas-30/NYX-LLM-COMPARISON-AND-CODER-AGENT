import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-red-500/[0.03] border border-red-500/20 rounded-[2rem] shadow-xl">
          <AlertCircle size={32} className="text-red-500 mb-4" />
          <h2 className="text-xs font-black text-white tracking-widest uppercase mb-2">Component Fault</h2>
          <p className="text-[9px] text-red-500/60 font-mono text-center max-w-[250px] leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred in this node."}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
          >
            Reset Node
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
