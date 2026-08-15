import { CssBrandLogo } from "@rsc/ui";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return <CssBrandLogo className={className} />;
}
