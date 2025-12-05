'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ReportErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Report Error:', error, errorInfo);
    
    // Log to system logs (in a real app, this would be an API call)
    if (typeof window !== 'undefined') {
      console.error('Error boundary caught:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border-2 border-red-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              خطا در نمایش گزارش
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">
              متأسفانه در نمایش این گزارش خطایی رخ داده است. لطفاً دوباره تلاش کنید.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-right">
                <p className="text-xs font-mono text-red-800 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              تلاش مجدد
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
