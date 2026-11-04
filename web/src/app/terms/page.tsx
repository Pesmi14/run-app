import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Podmínky použití | Sprintuy",
  description: "Podmínky použití služby Sprintuy.",
};

export default function Page() {
  return <LegalPage type="terms" />;
}
