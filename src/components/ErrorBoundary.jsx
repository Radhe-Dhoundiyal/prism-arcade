import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="arcade-shell recovery-panel" role="alert">
      <h1>This view stopped unexpectedly</h1>
      <p>No new result is available. Your stored progress has not been reset.</p>
      <button onClick={() => { this.setState({ failed: false }); this.props.onRecover(); }}>Return to lobby</button>
    </main>;
  }
}
