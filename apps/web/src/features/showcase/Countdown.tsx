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
  const firedForTarget = useRef<string | null>(null);

  useEffect(() => {
    if (remaining === 0 && firedForTarget.current !== target) {
      firedForTarget.current = target;
      onElapsed?.();
    }
  }, [remaining, onElapsed, target]);

  return (
    <p className="countdown">
      {label} <time dateTime={target}>{formatCountdown(remaining)}</time>
    </p>
  );
}
