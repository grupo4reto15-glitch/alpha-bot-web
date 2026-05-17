/**
 * Chart "Mapa Colombia": scattergeo con un marcador por municipio coloreado
 * según el nivel de alerta (🔴 rojo, 🟡 ámbar, 🟢 verde).
 *
 * Datos: GET /api/argos/mapa
 */

import { useQuery } from '@tanstack/react-query';
import { fetchArgosMapa } from '../../api/client';
import { Card, CardTitle } from '../ui/Card';
import { ErrorCard, Loading } from '../ui/EmptyState';
import { PlotChart } from './PlotChart';
import { Map } from 'lucide-react';

export function MapaColombiaChart() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['argos', 'mapa'],
    queryFn: fetchArgosMapa,
    staleTime: 60_000,
  });

  if (isLoading) return <Loading label="Cargando mapa de Colombia…" />;
  if (isError) return <ErrorCard error={error} />;

  const sub = data.stats.n_sin_geocod
    ? `${data.stats.n_puntos} municipios · ⚠ ${data.stats.n_sin_geocod} sin coordenadas`
    : `${data.stats.n_puntos} municipios geolocalizados`;

  return (
    <Card>
      <CardTitle icon={<Map size={18} />} subtitle={sub}>
        Mapa de cobertura
      </CardTitle>
      <PlotChart
        data={data.data}
        layout={data.layout}
        height={480}
        testId="argos-mapa"
      />
    </Card>
  );
}
