import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Cookies | Sprintuy",
  description: "Cookies služby Sprintuy.",
};

export default function Page() {
  return <LegalPage type="cookies" />;
}
