import type { Metadata } from "next";
import { BecomeSellerView } from "@/features/sellers/components/become-seller-view";

export const metadata: Metadata = { title: "Become a seller" };

export default function BecomeSellerPage() {
  return <BecomeSellerView />;
}