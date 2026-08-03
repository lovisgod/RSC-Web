import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ className = "", priority = false }: BrandLogoProps) {
  return (
    <span role="img" aria-label="DineOut NG" className={`rsc-brand-logo ${className}`.trim()}>
      <Image
        src="/assets/logo.png"
        alt=""
        fill
        priority={priority}
        sizes="160px"
        className="rsc-brand-logo__image rsc-brand-logo__image--light"
      />
      <Image
        src="/assets/logo2.png"
        alt=""
        fill
        priority={priority}
        sizes="160px"
        className="rsc-brand-logo__image rsc-brand-logo__image--dark"
      />
    </span>
  );
}
