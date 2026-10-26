import { Link } from 'react-router-dom';

export interface BidErrorNoticeValue {
  message: string;
  deposit: boolean;
}

export function BidErrorNotice({ error }: { error: BidErrorNoticeValue }) {
  return (
    <p className="form-error" role="alert" aria-live="assertive">
      {error.message} {error.deposit && <Link to="/carteira">Depositar</Link>}
    </p>
  );
}
