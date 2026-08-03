import { RouteNotFound } from "@rsc/ui";

export default function NotFound() {
  return (
    <RouteNotFound
      eyebrow="404 · DineOut NG"
      title="We could not find that page"
      description="That link does not match any customer page. You can continue browsing kitchens or return to your cart."
      primaryAction={{ label: "Browse kitchens", href: "/outlets" }}
      secondaryAction={{ label: "View cart", href: "/cart" }}
    />
  );
}
