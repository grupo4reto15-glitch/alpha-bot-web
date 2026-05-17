/**
 * Página Logs: ring buffer in-memory del backend.
 *
 * Patrón:
 *   - useQuery con refetchInterval (auto-refresh togglable, default 5s).
 *   - Selector de level (all/INFO/WARNING/ERROR).
 *   - Selector de límite (50/200/500/1000).
 *   - Auto-scroll al final si está en modo "follow".
 *
 * IMPORTANTE: el ring buffer se reinicia cuando el web service reinicia.
 * Para historial persistente, Render captura stdout y los expone en su panel.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Terminal, Pause, Play, RefreshCcw } from 'lucide-react';
import { fetchLogs } from '../api/client';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ErrorCard, EmptyState, Loading } from '../components/ui/EmptyState';

const LEVEL_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'DEBUG', label: 'DEBUG' },
  { value: 'INFO', label: 'INFO' },
  { value: 'WARNING', label: 'WARNING' },
  { value: 'ERROR', label: 'ERROR' },
];

const LIMIT_OPTIONS = [50, 200, 500, 1000];

function levelColor(level) {
  switch (level) {
    case 'ERROR':
      return 'text-red-300';
    case 'WARNING':
      return 'text-amber-300';
    case 'DEBUG':
      return 'text-slate-500';
    default:
      return 'text-slate-300';
  }
}

function levelBadgeBg(level) {
  switch (level) {
    case 'ERROR':
      return 'bg-red-500/15 border-red-500/30 text-red-200';
    case 'WARNING':
      return 'bg-amber-500/15 border-amber-500/30 text-amber-200';
    case 'DEBUG':
      return 'bg-white/[0.04] border-white/10 text-slate-400';
    default:
      return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200';
  }
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    });
  } catch {
    return ts;
  }
}

export function LogsPage() {
  const [level, setLevel] = useState('');
  const [limit, setLimit] = useState(200);
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['logs', level, limit],
    queryFn: () => fetchLogs({ level: level || undefined, limit }),
    refetchInterval: follow ? 5_000 : false,
    staleTime: 4_000,
  });

  // Auto-scroll al final cuando llegan logs nuevos en modo follow
  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data, follow]);

  return (
    <div className="anim-fadein">
      <Card>
        <CardTitle icon={<Terminal size={18} />}>
          Logs en vivo
        </CardTitle>

        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Nivel
            </label>
            <select
              className="ds-select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Límite
            </label>
            <select
              className="ds-select"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              icon={<RefreshCcw size={14} className={isFetching ? 'animate-spin' : ''} />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Refrescar
            </Button>
            <Button
              variant={follow ? 'primary' : 'ghost'}
              icon={
                follow ? <Pause size={14} /> : <Play size={14} />
              }
              onClick={() => setFollow(!follow)}
            >
              {follow ? 'Pausar follow' : 'Reanudar follow'}
            </Button>
          </div>
        </div>

        {isLoading && <Loading label="Cargando logs…" />}
        {isError && <ErrorCard error={error} />}

        {data && (
          <>
            {data.records.length === 0 ? (
              <EmptyState icon="🪵" title="No hay logs">
                {level ? `Sin entradas de nivel ${level}` : 'El ring buffer está vacío'}
              </EmptyState>
            ) : (
              <div
                ref={scrollRef}
                className="scrollbar-thin font-mono text-xs space-y-px rounded-xl"
                style={{
                  maxHeight: 'calc(100vh - 320px)',
                  minHeight: 320,
                  overflowY: 'auto',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {data.records.map((rec, i) => (
                  <div
                    key={i}
                    className="grid items-baseline gap-3 py-0.5 hover:bg-white/[0.02]"
                    style={{ gridTemplateColumns: '95px 78px 1fr' }}
                  >
                    <span className="text-slate-500 text-[0.7rem]">
                      {formatTime(rec.timestamp)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[0.65rem] font-semibold border text-center ${levelBadgeBg(
                        rec.level
                      )}`}
                    >
                      {rec.level}
                    </span>
                    <span className={`${levelColor(rec.level)} break-all`}>
                      {rec.logger && (
                        <span className="text-slate-600">{rec.logger} </span>
                      )}
                      {rec.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-slate-500 mt-3 flex items-center gap-3">
              <span>
                {data.records.length} entradas
                {data.level_filter ? ` (${data.level_filter})` : ''}
              </span>
              {follow && (
                <span className="flex items-center gap-1">
                  <span className="anim-ping-slow inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  refresh cada 5s
                </span>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
