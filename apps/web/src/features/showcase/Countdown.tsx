import { useEffect, useRef } from 'react';
import { formatCountdown, useRemainingMs } from '../../lib/serverClock';

interface CountdownProps {
  label: string;
  target: string;
  /** Chamado uma vez quando a contagem chega a zero (ex.: recarregar a vitrine). */
  onElapsed?: () => void;
}

export function Countdown({ label, target, onElapsed }: CountdownProps) {
  const remaining = useRemainingMs(target);
  const fired = useRef(false);

  useEffect(() => {
    if (remaining === 0 && !fired.current) {
      fired.current = true;
      onElapsed?.();
    }
  }, [remaining, onElapsed]);

  return (
    <p className="countdown">
      {label} <time dateTime={target}>{formatCountdown(remaining)}</time>
    </p>
  );
}
