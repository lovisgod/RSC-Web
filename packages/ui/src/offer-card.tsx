// packages/ui/src/OutletCard.tsx
import type { Promos } from "@rsc/contracts";

interface OfferCardProp {
  Offers: Promos;
  onOrder?: (id: string) => void;
}

export function OfferCard({ Offers }: OfferCardProp) {
  const { offerMessage, description, imageUrl, backgroundColor } = Offers;

  return (
    <div
      className="w-full sm:w-3/4 md:w-1/2 mt-8 mx-auto rounded-rsc shadow-md overflow-hidden border border-rsc-line transition-all duration-200 hover:shadow-lg"
      style={{ backgroundColor: backgroundColor ?? "var(--color-rsc-panel)" }}
    >
      {/* Banner Back-plate */}
      <div className="h-24 flex items-center justify-center relative overflow-hidden">
        {/* Card Body */}
        <div className="p-4">
          <h2 className="font-bold text-lg text-rsc-ink tracking-tight">{offerMessage}</h2>
          <p className="text-sm text-rsc-muted line-clamp-1">{description}</p>
        </div>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={offerMessage}
            width={80}
            height={80}
            className="object-contain drop-shadow-md z-10"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-rsc-line/40 z-10" />
        )}
        <div className="absolute inset-0 opacity-10 bg-black/10 mix-blend-overlay" />
      </div>
    </div>
  );
}
