import { loginSchema } from '@leilao/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FormField } from '../../components/FormField';
import { fieldErrors, messageFor } from '../../lib/errorMessages';
import { useLogin } from './session';

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const local = fieldErrors(loginSchema, values);
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    login.mutate(loginSchema.parse(values), {
      onSuccess: () => navigate(safeNext(params.get('next')), { replace: true }),
      onError: (err) => setErrors(fieldErrors(err)),
    });
  }

  return (
    <section className="auth-card" aria-labelledby="titulo-entrar">
      <h1 id="titulo-entrar">Entrar</h1>
      <form onSubmit={onSubmit} noValidate>
        <FormField
          label="E-mail"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          error={errors.email}
        />
        <FormField
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          error={errors.password}
        />
        <p role="alert" className="form-error">
          {login.isError ? messageFor(login.error) : ''}
        </p>
        <button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p>
        Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
      </p>
    </section>
  );
}

/** Só aceita caminhos internos para evitar redirecionamento aberto. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
