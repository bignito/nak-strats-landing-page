import { ArrowUpRight } from "lucide-react";
import type React from "react";

const NAKSWAP_URL = "https://nakswap.lol";

const MainContent: React.FC = () => {
  return (
    <section
      id="home"
      className="px-6 sm:px-8 lg:px-12 py-24 sm:py-32 lg:py-40"
    >
      <div className="max-w-[44rem]">
        <p className="section-label mb-6" data-ocid="hero.section_label">
          Digital Assets · Culture · Internet Computer
        </p>

        <h1 className="mb-6">
          Capital that backs the people
          <br />
          <span style={{ color: "var(--nak-text-muted)" }}>
            making the culture.
          </span>
        </h1>

        <p
          className="mb-10 text-base sm:text-lg leading-relaxed"
          style={{ color: "var(--nak-text-muted)", maxWidth: "36rem" }}
        >
          New Age Kapital operates a reserve-backed token on the Internet
          Computer and reinvests into the artists, producers, and creators
          building around it. Reserve holdings are on-ledger and independently
          verifiable.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <a
            href="#culture"
            className="btn btn-primary"
            data-ocid="hero.roster_button"
          >
            The roster
          </a>
          <a
            href="https://treasury.naktoken.lol/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            data-ocid="hero.reserve_report_button"
          >
            Reserve report
          </a>
          <a
            href={NAKSWAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            data-ocid="hero.nakswap_button"
          >
            Swap on NAKSwap{" "}
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default MainContent;
