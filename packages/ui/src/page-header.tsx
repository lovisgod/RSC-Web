interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, className = "" }: PageHeaderProps) {
  return (
    <div className={`rsc-page-header ${className}`.trim()}>
      <h1 className="rsc-page-header__title">{title}</h1>
      {subtitle && <p className="rsc-page-header__subtitle">{subtitle}</p>}
    </div>
  );
}
