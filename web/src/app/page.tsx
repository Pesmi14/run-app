import Image from "next/image";
import WaitlistForm from "@/components/WaitlistForm";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.landing}>
      <section className={styles.content} aria-label="Čekací listina Sprintuy">
        <Image
          src="/images/sprintuy-logo.png"
          alt="Sprintuy"
          width={400}
          height={160}
          className={styles.logo}
          priority
        />
        <WaitlistForm />
      </section>
    </main>
  );
}
