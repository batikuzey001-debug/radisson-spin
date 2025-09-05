// web/src/pages/PromoCodes.tsx
import PromoCodeGrid from "@/components/PromoCodeGrid";
import { mapBackendToPromoView } from "@/utils/promoAdapter";

export default function PromoCodes({ data }: { data: any[] }) {
  const items = data
    .map(mapBackendToPromoView)
    .filter((x): x is NonNullable<typeof x> => !!x);

  return <PromoCodeGrid items={items} />;
}
