import { CssBrandLogo } from "@rsc/ui";

interface BrandLogoProps {
  className?: string;
  mode?: "auto" | "dark" | "light";
  priority?: boolean;
}

export function BrandLogo({ className = "", mode = "auto" }: BrandLogoProps) {
  return <CssBrandLogo className={className} mode={mode} />;
}
