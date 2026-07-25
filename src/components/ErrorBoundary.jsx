import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-semibold text-slate-200">Something went wrong</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
