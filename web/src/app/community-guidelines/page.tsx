import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Pravidla komunity | Sprintuy",
  description: "Pravidla komunity služby Sprintuy.",
};

export default function Page() {
  return <LegalPage type="community" />;
}
