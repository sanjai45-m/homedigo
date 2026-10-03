import Image from "next/image";
import Link from "next/link";
import styles from "./landing.module.css";

export default function LandingBrand() {
  return (
    <Link href="/" className={styles.brand} aria-label="HomeDigo home">
      <Image src="/logo.png" width={47} height={47} alt="" />
      <span>
        home<span>digo</span>
        <span className={styles.brandDot}>.</span>
      </span>
    </Link>
  );
}
