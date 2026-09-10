import { useCallback, useState } from 'react';
import AppShell from './components/layout/AppShell';
import TelaLogin from './components/auth/TelaLogin';
import SeletorMes from './components/dashboard/SeletorMes';
import ResumoMensal from './components/dashboard/ResumoMensal';
import ErroCarregamento from './components/dashboard/ErroCarregamento';
import CadastroRapido from './components/lancamento/CadastroRapido';
import Toast from './components/ui/Toast';
import { usePeriodo } from './hooks/usePeriodo';
import { useGastos } from './hooks/useGastos';
import { useSessao } from './hooks/useSessao';
import { supabase } from './lib/supabase';

export default function App() {
  const { sessao, carregando: carregandoSessao } = useSessao();

  // Enquanto a sessão gravada não é lida, não mostra nem login nem dashboard —
  // qualquer um dos dois piscaria e depois seria substituído pelo outro.
  if (carregandoSessao) return <TelaCarregando />;
  if (!sessao) return <TelaLogin />;

  // Chave por usuário: trocar de conta descarta o estado do dono anterior em
  // vez de reaproveitá-lo.
  return <Aplicacao key={sessao.user.id} />;
}

function TelaCarregando() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <p className="text-slate-500 text-sm" role="status">
        Carregando···
      </p>
    </div>
  );
}

function Aplicacao() {
  const { ano, mes, ehMesCorrente, anterior, proximo, irParaHoje } = usePeriodo();
  const { gastos, totais, carregando, erro, adicionar, recarregar } = useGastos(ano, mes);
  const [toast, setToast] = useState(null);
  const fecharToast = useCallback(() => setToast(null), []);

  return (
    <>
      <AppShell>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Meus Gastos</h1>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="h-10 px-3 rounded-xl text-sm text-slate-400
                       active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            Sair
          </button>
        </div>

        <SeletorMes
          ano={ano}
          mes={mes}
          ehMesCorrente={ehMesCorrente}
          onAnterior={anterior}
          onProximo={proximo}
          onHoje={irParaHoje}
        />

        {erro ? (
          <ErroCarregamento onTentarNovamente={recarregar} />
        ) : (
          <ResumoMensal
            totais={totais}
            quantidade={gastos.length}
            carregando={carregando}
          />
        )}

        <CadastroRapido adicionar={adicionar} onToast={setToast} />
      </AppShell>

      <Toast toast={toast} onFechar={fecharToast} />
    </>
  );
}
