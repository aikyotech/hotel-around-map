/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Without this, an uncaught render error unmounts the whole React tree, leaving a blank
// white screen with no clue what happened. Catch it and show something actionable instead.
// This codebase has no @types/react installed (function components silently fall back to
// implicit "any" without it), which breaks the usual generic typing for class components.
// Declaring props/state explicitly here works around that for this one class component.
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white rounded-2xl border border-rose-100 shadow-lg p-6 text-center">
            <p className="text-sm font-bold text-slate-800 mb-2">画面の表示中にエラーが発生しました</p>
            <p className="text-xs text-slate-500 mb-4 break-words">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl"
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
