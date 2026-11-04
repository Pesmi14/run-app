import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Zásady ochrany osobních údajů | Sprintuy",
  description: "Zásady ochrany osobních údajů služby Sprintuy.",
};

export default function Page() {
  return <LegalPage type="privacy" />;
}
