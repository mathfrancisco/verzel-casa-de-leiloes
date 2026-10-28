export const DEMO_PASSWORD = 'demo1234';

interface DemoAccount {
  button: string;
  email: string;
}

const ACCOUNTS: DemoAccount[] = [
  { button: 'Usar conta da Ana', email: 'ana@demo.com' },
  { button: 'Usar conta do Bruno', email: 'bruno@demo.com' },
  { button: 'Usar conta do leiloeiro', email: 'leiloeiro@demo.com' },
];

interface DemoAccountsProps {
  onFill: (credentials: { email: string; password: string }) => void;
}

/** Atalho que só preenche o formulário; o acesso continua pela autenticação normal. */
export function DemoAccounts({ onFill }: DemoAccountsProps) {
  return (
    <details className="demo-accounts">
      <summary>Contas de demonstração</summary>
      <p>Todo saldo é simulado: nenhum dinheiro real é movimentado.</p>
      <ul>
        <li>
          <strong>Licitante</strong> (ana@demo.com, bruno@demo.com): dá lances com saldo simulado.
        </li>
        <li>
          <strong>Leiloeiro</strong> (leiloeiro@demo.com): cria lotes, não dá lance.
        </li>
      </ul>
      <p>
        Senha das contas de demonstração: <code>{DEMO_PASSWORD}</code>. Os botões abaixo apenas
        preenchem o formulário; clique em Entrar para acessar.
      </p>
      <div className="demo-accounts-actions">
        {ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => onFill({ email: account.email, password: DEMO_PASSWORD })}
          >
            {account.button}
          </button>
        ))}
      </div>
      <p>
        Para ver o aviso de lance superado ao vivo, entre com cada conta em um perfil de navegador
        separado (por exemplo, uma janela normal e uma anônima): na mesma janela as contas dividem
        o cookie de sessão.
      </p>
    </details>
  );
}
