"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { card, secondaryBtn } from "../styles";

type ErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("view boundary error:", error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section style={{ ...card, maxWidth: 680, margin: "0 auto" }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>משהו בתצוגה הזו נתקע</div>
        <div style={{ color: "#475569", lineHeight: 1.7, marginBottom: 14 }}>
          אפשר להמשיך להשתמש באפליקציה ולעבור לתצוגה אחרת. טעינה מחדש של התצוגה תנסה לפתוח אותה שוב.
        </div>
        <button style={secondaryBtn} onClick={() => this.setState({ hasError: false })}>
          נסה שוב
        </button>
      </section>
    );
  }
}
