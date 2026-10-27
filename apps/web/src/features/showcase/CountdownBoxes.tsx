import { useEffect, useRef } from 'react';
import { formatCountdown, useRemainingMs } from '../../lib/serverClock';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const two = (n: number) => String(n).padStart(2, '0');

/** Grupos de dígitos (dias só aparecem quando há pelo menos um dia). */
export function digitGroups(ms: number): { unit: string; digits: string }[] {
  const days = Math.floor(ms / DAY);
  const groups = [
    { unit: 'horas', digits: two(Math.floor((ms % DAY) / HOUR)) },
    { unit: 'min', digits: two(Math.floor((ms % HOUR) / MINUTE)) },
    { unit: 's', digits: two(Math.floor((ms % MINUTE) / SECOND)) },
  ];
  return days > 0 ? [{ unit: 'dias', digits: two(days) }, ...groups] : groups;
}

interface CountdownBoxesProps {
  /** Legenda curta sob os dígitos: "para encerrar" / "para começar". */
  caption: string;
  target: string;
  onElapsed?: () => void;
}

/** Contagem regressiva em caixas de dígito (zeros à esquerda em cinza, dígitos ativos em destaque). */
export function CountdownBoxes({ caption, target, onElapsed }: CountdownBoxesProps) {
  const remaining = useRemainingMs(target);
  const firedForTarget = useRef<string | null>(null);

  useEffect(() => {
    if (remaining === 0 && firedForTarget.current !== target) {
      firedForTarget.current = target;
      onElapsed?.();
    }
  }, [remaining, onElapsed, target]);

  const groups = digitGroups(remaining);
  const all = groups.map((g) => g.digits).join('');
  const firstActive = all.search(/[1-9]/u);
  let index = 0;

  return (
    <div className="digit-clock">
      <div role="timer" aria-label={`${formatCountdown(remaining)} ${caption}`} className="digits">
        {groups.map((group, g) => (
          <span key={group.unit} className="digit-group" aria-hidden="true">
            {g > 0 && <span className="digit-colon">:</span>}
            <span className="digit-boxes">
              {[...group.digits].map((digit) => {
                const active = firstActive !== -1 && index++ >= firstActive;
                return (
                  <span key={`${group.unit}-${index}`} className={active ? 'digit on' : 'digit'}>
                    {digit}
                  </span>
                );
              })}
            </span>
          </span>
        ))}
      </div>
      <p className="digit-caption">{caption}</p>
    </div>
  );
}
