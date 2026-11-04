import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Smazání účtu a dat | Sprintuy",
  description: "Smazání účtu a dat služby Sprintuy.",
};

export default function Page() {
  return <LegalPage type="deletion" />;
}
