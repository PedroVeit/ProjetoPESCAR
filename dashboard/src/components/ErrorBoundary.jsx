import { Component } from "react";
import { C } from "../constants/theme";

// Um erro de render numa aba não pode apagar o dashboard inteiro no meio da
// apresentação: mostra o aviso no lugar da aba e mantém a navegação viva.
export default class ErrorBoundary extends Component {
  state = { erro: null };
  static getDerivedStateFromError(erro) { return { erro }; }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.erro) this.setState({ erro: null }); }
  render() {
    if (!this.state.erro) return this.props.children;
    return <div style={{ padding: 18, borderRadius: 12, border: `1px solid ${C.red}55`, background: `${C.red}10`, fontSize: 13, color: C.text }}>
      <b style={{ color: C.red }}>Esta aba encontrou um erro.</b> As outras continuam funcionando.
      <pre style={{ marginTop: 8, fontSize: 11, color: C.muted, whiteSpace: "pre-wrap" }}>{String(this.state.erro?.message || this.state.erro)}</pre>
    </div>;
  }
}
