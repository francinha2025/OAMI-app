import React from "react";

type State = {
  hasError: boolean;
  error: any;
};

export default class ErrorBoundary extends React.Component<any, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("💥 Erro capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-red-100 dark:border-red-900/30 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Ocorreu um erro</h2>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mb-6 uppercase tracking-wider">Se persistir, atualize o app ou fale com o suporte.</p>

            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all mb-4"
            >
              🔄 Recarregar Sistema
            </button>

            <div className="mt-6 text-left">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Detalhes técnicos:</p>
               <pre className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl text-[10px] text-red-600 dark:text-red-400 font-mono overflow-auto max-h-40 border border-red-100 dark:border-red-900/20">
                {String(this.state.error)}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
