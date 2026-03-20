import React from "react";

interface BoardRuntimeBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  resetKey: number;
}

interface BoardRuntimeBoundaryState {
  hasError: boolean;
  resetKey: number;
}

class BoardRuntimeBoundary extends React.Component<
  BoardRuntimeBoundaryProps,
  BoardRuntimeBoundaryState
> {
  state: BoardRuntimeBoundaryState = {
    hasError: false,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    nextProps: BoardRuntimeBoundaryProps,
    prevState: BoardRuntimeBoundaryState
  ) {
    if (nextProps.resetKey !== prevState.resetKey) {
      return {
        hasError: false,
        resetKey: nextProps.resetKey,
      };
    }

    return null;
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default BoardRuntimeBoundary;
