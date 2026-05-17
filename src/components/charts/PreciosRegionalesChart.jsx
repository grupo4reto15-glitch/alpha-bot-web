/**
 * Chart "Precios por regional": bar horizontal con el precio medio (mu_h)
 * por regional (centro, noroccidente).
 *
 * Datos: GET /api/argos/precios-regionales
 */

import { useQuery } from '@tanstack/react-query';
import { fetchArgosPreciosRegionales } from '../../api/client';
import { Card, CardTitle } from '../ui/Card';
import { ErrorCard, Loading } from '../ui/EmptyState';
import { PlotChart } from './PlotChart';
import { TrendingUp } from 'lucide-react';

export function PreciosRegionalesChart() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['argos', 'precios-regionales'],
    queryFn: fetchArgosPreciosRegionales,
    staleTime: 60_000,
  });

  if (isLoading) return <Loading label="Cargando precios regionales…" />;
  if (isError) return <ErrorCard error={error} />;

  const stats = data.stats;
  const subtitle = stats.precio_promedio
    ? `${stats.n_regionales} regionales · promedio $${Math.round(stats.precio_promedio).toLocaleString('es-CO')}`
    : `${stats.n_regionales} regionales`;

  return (
    <Card>
      <CardTitle icon={<TrendingUp size={18} />} subtitle={subtitle}>
        Precio medio por regional
      </CardTitle>
      <PlotChart
        data={data.data}
        layout={data.layout}
        height={260}
        testId="argos-precios-regionales"
      />
    </Card>
  );
}
