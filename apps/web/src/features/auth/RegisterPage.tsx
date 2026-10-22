import { registerSchema, type Role } from '@leilao/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormField } from '../../components/FormField';
import { fieldErrors, messageFor } from '../../lib/errorMessages';
import { useRegister } from './session';

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: 'BIDDER', label: 'Licitante', hint: 'Deposita saldo, dá lances e arremata.' },
  { value: 'AUCTIONEER', label: 'Leiloeiro', hint: 'Cria e gerencia lotes. Não dá lances.' },
];

export function RegisterPage() {
  const register = useRegister();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    role: 'BIDDER' as Role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const local = fieldErrors(registerSchema, values);
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    register.mutate(registerSchema.parse(values), {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (err) => setErrors(fieldErrors(err)),
    });
  }

  return (
    <section className="auth-card" aria-labelledby="titulo-cadastro">
      <h1 id="titulo-cadastro">Criar conta</h1>
      <form onSubmit={onSubmit} noValidate>
        <FormField
          label="Nome"
          autoComplete="name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          error={errors.name}
        />
        <FormField
          label="E-mail"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          error={errors.email}
        />
        <FormField
          label="Senha (mínimo de 8 caracteres)"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          error={errors.password}
        />
        <fieldset className="field">
          <legend>Como você vai usar a plataforma?</legend>
          {ROLE_OPTIONS.map((option) => (
            <label key={option.value} className="radio">
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={values.role === option.value}
                onChange={() => setValues({ ...values, role: option.value })}
              />
              <span>
                <strong>{option.label}</strong> — {option.hint}
              </span>
            </label>
          ))}
          {errors.role && <p className="field-error">{errors.role}</p>}
        </fieldset>
        <p role="alert" className="form-error">
          {register.isError && !Object.keys(fieldErrors(register.error)).length
            ? messageFor(register.error)
            : ''}
        </p>
        <button type="submit" disabled={register.isPending}>
          {register.isPending ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
      <p>
        Já tem conta? <Link to="/entrar">Entrar</Link>
      </p>
    </section>
  );
}
