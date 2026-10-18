function LegalDisclaimer() {
  return (
    <section
      aria-labelledby="nak-legal-heading"
      className="mx-auto max-w-7xl px-6 pt-8 text-xs leading-relaxed text-muted-foreground"
    >
      <h2
        id="nak-legal-heading"
        className="font-mono text-xs uppercase tracking-[0.14em]"
      >
        Legal Disclaimer
      </h2>
      <p className="mb-2 mt-3">
        NAK (New Age Kapital) is a nonprofit organization that holds the
        intellectual property behind its projects. Our mission is to advance the
        world by every lawful means available to us.
      </p>
      <p className="mb-2">
        The NAK token is not an investment. It is not designed or intended to
        appreciate in value, and NAK makes no promise of profit, return, or
        yield of any kind. Holding NAK gives no ownership, dividend, redemption
        or governance rights. Digital assets carry real risks, including total
        loss. Nothing on this site is financial, investment, legal, or tax
        advice. All products and services are provided &quot;as is,&quot;
        without warranties of any kind, and you use them at your own risk.
      </p>
      <p>
        Read the full{" "}
        <a
          href="#/legal"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
          data-ocid="footer.legal_link"
        >
          Legal Disclaimer &amp; Risk Disclosure
        </a>
        . © 2026 NAK New Age Kapital. All rights reserved.
      </p>
    </section>
  );
}

export default LegalDisclaimer;
