import { useCallback, useState } from 'react';
import AppShell from './components/layout/AppShell';
import TelaLogin from './components/auth/TelaLogin';
import SeletorMes from './components/dashboard/SeletorMes';
import ResumoMensal from './components/dashboard/ResumoMensal';
import ErroCarregamento from './components/dashboard/ErroCarregamento';
import CadastroRapido from './components/lancamento/CadastroRapido';
import ListaLancamentos from './components/historico/ListaLancamentos';
import EdicaoGasto from './components/historico/EdicaoGasto';
import AvisoAtualizacao from './components/ui/AvisoAtualizacao';
import BotaoInstalar from './components/ui/BotaoInstalar';
import FaixaOffline from './components/ui/FaixaOffline';
import Toast from './components/ui/Toast';
import { usePeriodo } from './hooks/usePeriodo';
import { useGastos } from './hooks/useGastos';
import { useOnline } from './hooks/useOnline';
import { useSessao } from './hooks/useSessao';
import { supabase } from './lib/supabase';

export default function App() {
  const { sessao, carregando: carregandoSessao } = useSessao();
  const online = useOnline();

  return (
    <>
      {carregandoSessao ? (
        <TelaCarregando />
      ) : sessao ? (
        // Chave por usuário: trocar de conta descarta o estado do dono anterior
        // em vez de reaproveitá-lo.
        <Aplicacao key={sessao.user.id} online={online} />
      ) : (
        // A faixa acompanha o login de propósito. Sessão expirada com o app
        // offline não tem como renovar o token, e sem o aviso a tentativa de
        // entrar pareceria senha errada.
        <>
          <FaixaOffline online={online} />
          <TelaLogin />
        </>
      )}

      <AvisoAtualizacao />
    </>
  );
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

function Aplicacao({ online }) {
  const { ano, mes, ehMesCorrente, anterior, proximo, irParaHoje } = usePeriodo();
  const { gastos, totais, carregando, erro, adicionar, editar, excluir, recarregar } =
    useGastos(ano, mes);
  const [toast, setToast] = useState(null);
  const [emEdicao, setEmEdicao] = useState(null);
  const fecharToast = useCallback(() => setToast(null), []);

  return (
    <>
      <AppShell>
        <FaixaOffline online={online} />

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

        <ListaLancamentos gastos={gastos} onSelecionar={setEmEdicao} />

        <BotaoInstalar />
      </AppShell>

      {emEdicao && (
        <EdicaoGasto
          gasto={emEdicao}
          onSalvar={editar}
          onExcluir={excluir}
          onFechar={() => setEmEdicao(null)}
        />
      )}

      <Toast toast={toast} onFechar={fecharToast} />
    </>
  );
}
