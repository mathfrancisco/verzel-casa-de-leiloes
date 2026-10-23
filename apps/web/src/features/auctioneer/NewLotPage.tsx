import { LOT_CATEGORIES, type CatalogItem, type LotDetail } from '@leilao/shared';
import { useMutation } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../components/FormField';
import { ApiError, apiFetch } from '../../lib/api';
import { fieldErrors, messageFor } from '../../lib/errorMessages';
import { CatalogSearch } from './CatalogSearch';
import {
  buildCreateLotPayload,
  formFromItem,
  toFormErrors,
  type CreateLotRequest,
  type FormErrors,
  type LotForm,
} from './newLot';

export function NewLotPage() {
  const navigate = useNavigate();
  const ids = { category: useId(), description: useId() };
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<LotForm | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const create = useMutation({
    mutationFn: (payload: CreateLotRequest) =>
      apiFetch<LotDetail>('/api/lots', { method: 'POST', body: payload }),
    onSuccess: (lot) => navigate(`/lotes/${lot.id}`),
    onError: (err) => setErrors(toFormErrors(fieldErrors(err))),
  });

  function select(selected: CatalogItem) {
    setItem(selected);
    setForm(formFromItem(selected, new Date()));
    setErrors({});
  }

  const set = (field: keyof LotForm) => (value: string) =>
    setForm((current) => (current ? { ...current, [field]: value } : current));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const result = buildCreateLotPayload(form, item?.externalId ?? null, new Date());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    create.mutate(result.payload);
  }

  const generalError =
    create.isError &&
    !(create.error instanceof ApiError && create.error.code === 'VALIDATION_ERROR')
      ? messageFor(create.error)
      : '';

  return (
    <section aria-labelledby="titulo-novo-lote">
      <h1 id="titulo-novo-lote">Novo lote</h1>
      <CatalogSearch selectedId={item?.externalId ?? null} onSelect={select} />

      {item && form && (
        <form
          onSubmit={onSubmit}
          noValidate
          className="new-lot-form"
          aria-labelledby="titulo-dados"
        >
          <h2 id="titulo-dados">2. Dados do lote</h2>
          <div className="selected-item">
            <img src={item.imageUrl} alt={`Obra selecionada: ${item.title}`} />
            <dl>
              <dt>Artista</dt>
              <dd>{item.artist ?? '—'}</dd>
              <dt>Data</dt>
              <dd>{item.date ?? '—'}</dd>
              <dt>Técnica</dt>
              <dd>{item.medium ?? '—'}</dd>
              <dt>Dimensões</dt>
              <dd>{item.dimensions ?? '—'}</dd>
              <dt>Origem</dt>
              <dd>{item.origin ?? '—'}</dd>
            </dl>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              Ver no site do museu
            </a>
          </div>

          <FormField
            label="Título"
            value={form.title}
            onChange={(e) => set('title')(e.target.value)}
            error={errors.title}
          />
          <div className="field">
            <label htmlFor={ids.category}>Categoria</label>
            <select
              id={ids.category}
              value={form.category}
              onChange={(e) => set('category')(e.target.value)}
            >
              {Object.entries(LOT_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.category && <p className="field-error">{errors.category}</p>}
          </div>
          <div className="field">
            <label htmlFor={ids.description}>Descrição (opcional)</label>
            <textarea
              id={ids.description}
              rows={3}
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
            />
            {errors.description && <p className="field-error">{errors.description}</p>}
          </div>
          <FormField
            label="Lance inicial (R$)"
            inputMode="decimal"
            placeholder="1.500,00"
            value={form.startingPrice}
            onChange={(e) => set('startingPrice')(e.target.value)}
            error={errors.startingPrice}
          />
          <FormField
            label="Incremento mínimo (R$)"
            inputMode="decimal"
            placeholder="100,00"
            value={form.minIncrement}
            onChange={(e) => set('minIncrement')(e.target.value)}
            error={errors.minIncrement}
          />
          <FormField
            label="Início"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => set('startsAt')(e.target.value)}
            error={errors.startsAt}
          />
          <FormField
            label="Fim"
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => set('endsAt')(e.target.value)}
            error={errors.endsAt}
          />

          <p role="alert" className="form-error">
            {errors.externalId ?? generalError}
          </p>
          <button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Publicando…' : 'Publicar lote'}
          </button>
        </form>
      )}
    </section>
  );
}
