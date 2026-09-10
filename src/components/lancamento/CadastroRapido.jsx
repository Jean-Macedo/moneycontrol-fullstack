import { useEffect, useRef, useState } from 'react';
import CampoValor from './CampoValor';
import BotoesCategoria from './BotoesCategoria';
import { parseValor } from '../../lib/parseValor';
import { formatarMoeda } from '../../lib/format';

export default function CadastroRapido({ adicionar, onToast }) {
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const valor = parseValor(texto);

  async function salvar(categoria) {
    if (valor == null || salvando) return; // guarda contra duplo toque
    setSalvando(categoria);
    try {
      await adicionar({ valor, categoria });
      // O campo só é limpo depois do await bem-sucedido: em falha de rede o
      // usuário não perde o que digitou.
      setTexto('');
      navigator.vibrate?.(30);
      onToast({ tipo: 'ok', msg: `${formatarMoeda(valor)} em ${categoria}` });
    } catch {
      onToast({ tipo: 'erro', msg: 'Não foi possível salvar. Tente de novo.' });
    } finally {
      setSalvando(null);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Cadastro rápido de gasto">
      <CampoValor ref={inputRef} valor={texto} onChange={setTexto} />
      <BotoesCategoria
        onSelecionar={salvar}
        habilitado={valor != null}
        salvando={salvando}
      />
    </section>
  );
}
