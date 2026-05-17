/**
 * Página Argos: 4 charts + selector de municipio + refresh.
 *
 * Layout:
 *   - Toolbar superior con selector de municipio + botón "Refrescar desde Drive"
 *   - 4 charts en grid responsivo:
 *     ┌────────────────────────┬───────────────────────┐
 *     │ Precios por regional   │ Intervalos HDI        │
 *     ├────────────────────────┴───────────────────────┤
 *     │ Perfiles & alertas (donut + tabla)             │
 *     ├─────────────────────────────────────────────────┤
 *     │ Mapa Colombia                                   │
 *     └─────────────────────────────────────────────────┘
 *
 * Estados especiales:
 *   - 503: Drive no configurado → pantalla guía con instrucciones.
 *   - 404: archivo no en carpeta → ErrorCard con mensaje del backend.
 *   - 502: Drive timeout → ErrorCard con sugerencia de retry.
 *
 * El selector se popula con cod_municipio que aparezcan en /api/argos/perfiles-alertas
 * (sin hacer una query extra a /api/geografias).
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Cloud, RefreshCcw } from 'lucide-react';
import {
  fetchArgosPerfilesAlertas,
  fetchArgosFiles,
  refreshArgosCache,
} from '../api/client';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorCard, Loading } from '../components/ui/EmptyState';
import { PerfilesAlertasChart } from '../components/charts/PerfilesAlertasChart';
import { IntervalosHdiChart } from '../components/charts/IntervalosHdiChart';
import { PreciosRegionalesChart } from '../components/charts/PreciosRegionalesChart';
import { MapaColombiaChart } from '../components/charts/MapaColombiaChart';

/**
 * Detecta el caso especial "Drive no configurado" (503) para mostrar guía
 * en lugar de un error card genérico. Lo otros errores se muestran normales.
 */
function isDriveNotConfigured(error) {
  return (
    error?.response?.status === 503 &&
    typeof error.response.data?.detail === 'string' &&
    error.response.data.detail.includes('Google Drive no configurado')
  );
}

function DriveNotConfiguredCard() {
  return (
    <Card>
      <CardTitle icon={<Cloud size={18} />}>Google Drive no configurado</CardTitle>
      <div className="text-sm text-slate-300 space-y-3">
        <p>
          Los CSVs Argos viven en una carpeta de Google Drive y son leídos por
          el backend con una Service Account. Mientras no estén configuradas las
          variables de entorno, los charts no pueden generarse.
        </p>
        <div className="font-mono text-xs bg-white/[0.03] border border-white/10 rounded-xl p-3 leading-relaxed">
          <div className="text-slate-400">Variables requeridas:</div>
          <div className="text-slate-200">GOOGLE_SERVICE_ACCOUNT_JSON</div>
          <div className="text-slate-200">GDRIVE_FOLDER_ID</div>
        </div>
        <p className="text-xs text-slate-400">
          Ver instrucciones detalladas en el README del repo → sección{' '}
          <span className="text-slate-200">"Configurar Google Drive"</span>.
          Sin esto, el resto del bot funciona normal (webhook, IA, dispatcher).
        </p>
      </div>
    </Card>
  );
}

export function ArgosPage() {
  const [codMunicipio, setCodMunicipio] = useState('');
  const qc = useQueryClient();

  // Query "centinela": detecta el caso 503 para todos los charts a la vez
  // (todos consultan el mismo Drive, si uno falla con 503, todos fallarán).
  // Usamos perfiles-alertas como sonda porque es el más simple.
  const sentinel = useQuery({
    queryKey: ['argos', 'perfiles-alertas'],
    queryFn: fetchArgosPerfilesAlertas,
    staleTime: 60_000,
    retry: false,
  });

  // Lista de municipios para el selector
  const municipios = sentinel.data?.tabla
    ? Array.from(
        new Map(
          sentinel.data.tabla.map((row) => [
            row.cod_municipio,
            { cod: row.cod_municipio, nombre: row.nombre_municipio },
          ])
        ).values()
      ).sort((a, b) => a.nombre.localeCompare(b.nombre))
    : [];

  // Mutation: refrescar cache backend + invalidar todas las queries argos
  const refreshMutation = useMutation({
    mutationFn: () => refreshArgosCache(),
    onSuccess: () => {
      // Invalidar todas las queries del namespace 'argos' → re-fetch fresh
      qc.invalidateQueries({ queryKey: ['argos'] });
    },
  });

  // Loading inicial del sentinel
  if (sentinel.isLoading) {
    return <Loading label="Conectando con Google Drive…" />;
  }

  // 503: Drive no configurado → render guía
  if (sentinel.isError && isDriveNotConfigured(sentinel.error)) {
    return <DriveNotConfiguredCard />;
  }

  // Otros errores
  if (sentinel.isError) {
    return (
      <Card>
        <CardTitle icon={<AlertCircle size={18} />}>
          No se pudo cargar Argos
        </CardTitle>
        <ErrorCard error={sentinel.error} />
        <hr className="ds-hr" />
        <Button
          variant="ghost"
          icon={<RefreshCcw size={16} />}
          onClick={() => refreshMutation.mutate()}
        >
          Reintentar
        </Button>
      </Card>
    );
  }

  // Caso normal: render completo
  return (
    <div className="anim-fadein">
      {/* ── Toolbar ──────────────────────────────────── */}
      <div
        className="flex items-center gap-3 flex-wrap mb-6"
        style={{ marginTop: '-0.5rem' }}
      >
        <label className="text-sm text-slate-400">Municipio:</label>
        <select
          className="ds-select"
          value={codMunicipio}
          onChange={(e) => setCodMunicipio(e.target.value)}
        >
          <option value="">— Todos (top 30 HDI) —</option>
          {municipios.map((m) => (
            <option key={m.cod} value={m.cod}>
              {m.nombre} ({m.cod})
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {refreshMutation.isPending && (
            <span className="text-xs text-slate-400">Refrescando…</span>
          )}
          {refreshMutation.isSuccess && !refreshMutation.isPending && (
            <span className="text-xs text-slate-400">✓ cache invalidado</span>
          )}
          <Button
            variant="ghost"
            icon={
              <RefreshCcw
                size={16}
                className={refreshMutation.isPending ? 'animate-spin' : ''}
              />
            }
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            Refrescar desde Drive
          </Button>
        </div>
      </div>

      {/* ── Charts grid ─────────────────────────────── */}
      <div className="ds-grid2">
        <PreciosRegionalesChart />
        <IntervalosHdiChart codMunicipio={codMunicipio || null} />
      </div>

      <PerfilesAlertasChart />

      <MapaColombiaChart />
    </div>
  );
}
