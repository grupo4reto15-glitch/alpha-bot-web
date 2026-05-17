/**
 * Chart "Perfiles & Alertas":
 *   - Donut con distribución de perfiles (Argos Dominante, Competencia, Paridad).
 *   - Tabla con (cod_municipio, nombre, perfil, alerta) ordenada por
 *     prioridad de alerta (🔴 > 🟡 > 🟢).
 *
 * Datos vienen de GET /api/argos/perfiles-alertas con shape:
 *   { donut: { data, layout }, tabla: [{cod_municipio, nombre_municipio, perfil, alerta}], stats }
 */

import { useQuery } from '@tanstack/react-query';
import { fetchArgosPerfilesAlertas } from '../../api/client';
import { Card, CardTitle } from '../ui/Card';
import { ErrorCard, Loading } from '../ui/EmptyState';
import { PlotChart } from './PlotChart';
import { PieChart } from 'lucide-react';

function alertaVariant(alerta) {
  if (alerta?.includes('🔴')) return 'crit';
  if (alerta?.includes('🟡')) return 'warn';
  if (alerta?.includes('🟢')) return 'ok';
  return 'neutral';
}

function AlertaBadge({ alerta }) {
  const cls = {
    crit: 'ds-badge-crit',
    warn: 'ds-badge-warn',
    ok: 'ds-badge-ok',
    neutral: 'ds-badge-neutral',
  }[alertaVariant(alerta)];
  // Mostramos el texto sin el emoji al principio para mejor lectura;
  // el color del badge ya transmite la criticidad.
  const text = alerta?.replace(/^[🔴🟡🟢]\s*/, '').trim() || alerta;
  return <span className={cls}>{text}</span>;
}

export function PerfilesAlertasChart() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['argos', 'perfiles-alertas'],
    queryFn: fetchArgosPerfilesAlertas,
    staleTime: 60_000,
  });

  if (isLoading) return <Loading label="Cargando perfiles y alertas…" />;
  if (isError) return <ErrorCard error={error} />;

  return (
    <Card>
      <CardTitle
        icon={<PieChart size={18} />}
        subtitle={`${data.stats.n_municipios} combinaciones · ${data.stats.rojas}🔴 · ${data.stats.amarillas}🟡 · ${data.stats.verdes}🟢`}
      >
        Perfiles & alertas por municipio
      </CardTitle>

      <div className="ds-grid2" style={{ marginBottom: 0 }}>
        {/* Donut */}
        <div>
          <PlotChart
            data={data.donut.data}
            layout={data.donut.layout}
            height={320}
            testId="argos-donut"
          />
        </div>

        {/* Tabla */}
        <div className="scrollbar-thin" style={{ maxHeight: 360, overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-400 uppercase tracking-wider">
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-2 font-semibold">Municipio</th>
                <th className="text-left py-2 pr-2 font-semibold">Perfil</th>
                <th className="text-right py-2 font-semibold">Alerta</th>
              </tr>
            </thead>
            <tbody>
              {data.tabla.map((row, i) => (
                <tr
                  key={`${row.cod_municipio}-${row.perfil}-${i}`}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="py-2 pr-2 text-slate-200">
                    <div>{row.nombre_municipio}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {row.cod_municipio}
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-slate-300">{row.perfil}</td>
                  <td className="py-2 text-right">
                    <AlertaBadge alerta={row.alerta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
