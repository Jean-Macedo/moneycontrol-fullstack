import { useCallback, useState } from 'react';
import AppShell from './components/layout/AppShell';
import SeletorMes from './components/dashboard/SeletorMes';
import ResumoMensal from './components/dashboard/ResumoMensal';
import ErroCarregamento from './components/dashboard/ErroCarregamento';
import CadastroRapido from './components/lancamento/CadastroRapido';
import Toast from './components/ui/Toast';
import { usePeriodo } from './hooks/usePeriodo';
import { useGastos } from './hooks/useGastos';

export default function App() {
  const { ano, mes, ehMesCorrente, anterior, proximo, irParaHoje } = usePeriodo();
  const { gastos, totais, carregando, erro, adicionar, recarregar } = useGastos(ano, mes);
  const [toast, setToast] = useState(null);
  const fecharToast = useCallback(() => setToast(null), []);

  return (
    <>
      <AppShell>
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
