/**
 * <Card> y <CardTitle>: wrappers sobre las clases .ds-card del HTML adjunto.
 *
 * Uso:
 *   <Card>
 *     <CardTitle icon={<TrendingUp />}>Precios regionales</CardTitle>
 *     {...contenido}
 *   </Card>
 */

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`ds-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, icon, subtitle }) {
  return (
    <>
      <div className="ds-card-title">
        {icon}
        <span>{children}</span>
      </div>
      {subtitle ? <div className="ds-card-subtitle">{subtitle}</div> : null}
    </>
  );
}
