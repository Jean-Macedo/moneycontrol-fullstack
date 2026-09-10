import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TelaLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setErro(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      // Mensagem única de propósito: distinguir "e-mail não existe" de "senha
      // errada" confirmaria quais contas existem para quem estiver tentando.
      setErro(
        error.message === 'Failed to fetch'
          ? 'Sem conexão. Verifique a internet e tente de novo.'
          : 'E-mail ou senha inválidos.'
      );
      setEntrando(false);
      return;
    }
    // Em caso de sucesso, o onAuthStateChange troca a tela; manter `entrando`
    // ligado evita um piscar do formulário habilitado antes disso.
  }

  const campo =
    'w-full h-14 px-4 rounded-2xl bg-slate-900 border border-slate-800 text-base ' +
    'focus:outline-none focus:ring-2 focus:ring-sky-500';

  return (
    <div className="min-h-full flex justify-center">
      <main className="w-full max-w-md px-4 pt-16 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <h1 className="text-2xl font-semibold tracking-tight">Meus Gastos</h1>
        <p className="text-sm text-slate-400 mt-1">Entre para ver seus lançamentos.</p>

        <form onSubmit={entrar} className="flex flex-col gap-3 mt-8">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            required
            placeholder="E-mail"
            aria-label="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={campo}
          />

          <input
            type="password"
            autoComplete="current-password"
            required
            placeholder="Senha"
            aria-label="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={campo}
          />

          {erro && (
            <p role="alert" className="text-sm text-red-300">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={entrando || !email || !senha}
            className="h-14 rounded-2xl bg-sky-600 font-semibold text-lg
                       active:scale-95 transition disabled:opacity-30 disabled:active:scale-100
                       focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {entrando ? 'Entrando···' : 'Entrar'}
          </button>
        </form>
      </main>
    </div>
  );
}
