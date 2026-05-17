/**
 * Chart "Intervalos HDI": forest plot con precios_mu y barras de error
 * asimétricas (hdi_lower, hdi_upper) por municipio.
 *
 * Props:
 *   - codMunicipio: si se pasa, filtra el endpoint a ese municipio. Sin
 *     filtro, el backend devuelve top 30 por precio (cap para legibilidad).
 *
 * Datos: GET /api/argos/intervalos-hdi?cod_municipio=<...>
 */

import { useQuery } from '@tanstack/react-query';
import { fetchArgosIntervalosHdi } from '../../api/client';
import { Card, CardTitle } from '../ui/Card';
import { ErrorCard, Loading } from '../ui/EmptyState';
import { PlotChart } from './PlotChart';
import { Sparkles } from 'lucide-react';

export function IntervalosHdiChart({ codMunicipio = null }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['argos', 'intervalos-hdi', codMunicipio || 'all'],
    queryFn: () => fetchArgosIntervalosHdi(codMunicipio),
    staleTime: 60_000,
    // Mantener los datos previos visibles mientras se cambia de municipio
    placeholderData: (prev) => prev,
  });

  const titleSuffix = codMunicipio
    ? `municipio ${codMunicipio} · ${data?.stats?.n_municipios ?? 0} productos`
    : `top ${data?.stats?.n_municipios ?? 30} por precio medio`;

  return (
    <Card>
      <CardTitle icon={<Sparkles size={18} />} subtitle={titleSuffix}>
        Intervalos HDI 94%
      </CardTitle>

      {isLoading && <Loading label="Cargando intervalos…" />}
      {isError && <ErrorCard error={error} />}
      {data && !isLoading && (
        <PlotChart
          data={data.data}
          layout={data.layout}
          height={400}
          testId="argos-hdi"
        />
      )}
    </Card>
  );
}
