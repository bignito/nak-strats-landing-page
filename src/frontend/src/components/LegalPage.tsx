import type { ReactNode } from "react";

interface LegalPageProps {
  onNavigateToMain: () => void;
}

interface LegalSection {
  id: string;
  number: number;
  title: string;
  /** Paragraphs, in order. A paragraph may be a plain string or a block. */
  blocks: LegalBlock[];
}

interface LegalLink {
  label: string;
  href: string;
}

type LegalBlock =
  | { kind: "paragraph"; text: string; links?: LegalLink[] }
  | { kind: "bullets"; items: string[] };

const SECTIONS: LegalSection[] = [
  {
    id: "general-information",
    number: 1,
    title: "General information",
    blocks: [
      {
        kind: "paragraph",
        text: "New Age Kapital (“NAK”, “we”, “us”) is a nonprofit organization that holds the intellectual property behind its projects. NAK is a digital-asset and blockchain project on the Internet Computer (ICP): an experimental token initiative with cultural, creative and community objectives.",
      },
      {
        kind: "paragraph",
        text: "NAK does not hold itself out as licensed or registered to provide regulated financial services, and nothing on our websites is an offer of such services.",
      },
      {
        kind: "paragraph",
        text: "Information on NAK websites, applications and communications is general information. Please verify anything that matters to you before you rely on it or take part.",
      },
    ],
  },
  {
    id: "the-nak-token",
    number: 2,
    title: "The NAK token: nature and risks",
    blocks: [
      {
        kind: "paragraph",
        text: "The NAK token is a digital asset of the New Age Kapital project. It can be used or exchanged through compatible blockchain infrastructure, as far as that infrastructure and the services built on it support it.",
      },
      {
        kind: "paragraph",
        text: "**The NAK token is not an investment.** It is not designed or intended to appreciate in value, and NAK makes no promise of profit, return or yield of any kind. Holding NAK does not, by itself, give you:",
      },
      {
        kind: "bullets",
        items: [
          "equity or ownership in New Age Kapital;",
          "a right to dividends or to NAK's revenue or surplus;",
          "a contractual right to repayment or redemption;",
          "a claim on NAK's assets or reserves;",
          "voting or governance rights; or",
          "an entitlement to future services, benefits or distributions.",
        ],
      },
      {
        kind: "paragraph",
        text: "Any right attached to the token exists only if a governing document, a contract or the law creates it.",
      },
      {
        kind: "paragraph",
        text: "NAK has no guaranteed market value. Its price can be volatile, liquidity can be thin, markets can be manipulated, and it can lose all its value. That NAK can be traded, or used in an application, says nothing about whether it is lawful, economically viable or suitable for you.",
      },
      {
        kind: "paragraph",
        text: "Nothing on this page decides whether NAK is a security, commodity, financial instrument or other regulated asset under any law.",
      },
    ],
  },
  {
    id: "reserves-and-economic-statements",
    number: 3,
    title: "Reserves and economic statements",
    blocks: [
      {
        kind: "paragraph",
        text: "NAK communications may mention reserves, treasury assets, token backing, or putting resources back into cultural and community work. None of these is a promise of collateral, redemption, price stability, solvency, or assets being available to token holders.",
      },
      {
        kind: "paragraph",
        text: "Unless a binding document and verifiable financial or on-chain evidence say so, NAK tokens are not redeemable against any reserve, currency or asset. Describing how we intend to spend or manage funds, or to support artists and cultural projects, does not by itself give anyone a claim to NAK's funds or revenue.",
      },
    ],
  },
  {
    id: "swaps-and-third-party-services",
    number: 4,
    title: "Swaps and third-party services",
    blocks: [
      {
        kind: "paragraph",
        text: "NAK interfaces, including NAKSwap, may give you information about, access to, or links to third-party exchanges, liquidity pools, wallets and other digital-asset services. Some of the work in a transaction may be done by infrastructure that independent providers build and run (for NAKSwap: Houdiniswap and ICPSwap).",
      },
      { kind: "paragraph", text: "Risks include:" },
      {
        kind: "bullets",
        items: [
          "exchange-rate volatility;",
          "slippage and thin liquidity;",
          "network and protocol fees;",
          "failed, delayed or incorrectly executed transactions;",
          "smart-contract or protocol vulnerabilities;",
          "routing errors; and",
          "losses from wallet approvals or compromised credentials.",
        ],
      },
      {
        kind: "paragraph",
        text: "A quote shown to you is not a guarantee that a transaction will execute at that rate. Using a third-party service through a NAK interface does not mean NAK endorses, guarantees, controls or is responsible for everything that provider does. Please read each provider's own terms, fees and security arrangements.",
      },
      {
        kind: "paragraph",
        text: "What NAK itself is responsible for depends on how the service actually works and on its terms. For NAKSwap, that's the NAKSwap Terms of Use (https://nakswap.lol/terms).",
      },
    ],
  },
  {
    id: "blockchain-and-cybersecurity-risks",
    number: 5,
    title: "Blockchain and cybersecurity risks",
    blocks: [
      {
        kind: "paragraph",
        text: "Blockchain technology carries operational and security risks: software bugs, smart-contract exploits, compromised signing keys, malicious wallet apps, network outages, governance failures, bridge vulnerabilities and unauthorized transactions.",
      },
      {
        kind: "paragraph",
        text: "Transactions can be irreversible. Assets sent to a wrong address or a compromised contract may be lost for good. Networks and applications can be changed, upgraded, interrupted or shut down.",
      },
      {
        kind: "paragraph",
        text: "We don't claim that any wallet, blockchain, smart contract, application or transaction method is free of vulnerabilities. You are responsible for taking care with your assets, the permissions you grant wallets, and the transactions you approve, without affecting any legal right or duty that can't lawfully be excluded.",
      },
    ],
  },
  {
    id: "no-financial-investment-legal-or-tax-advice",
    number: 6,
    title: "No financial, investment, legal or tax advice",
    blocks: [
      {
        kind: "paragraph",
        text: "Everything on NAK websites and in NAK communications is general information. Nothing in them is individual investment, financial, legal, accounting or tax advice, and describing a token, technology, plan, market or community initiative is not a recommendation to buy, sell or hold anything.",
      },
      {
        kind: "paragraph",
        text: "Taking part in digital assets can mean losing money, possibly all of it. Consider your own circumstances, risk tolerance and legal obligations, and get qualified professional advice where appropriate.",
      },
    ],
  },
  {
    id: "regulation-and-where-you-are",
    number: 7,
    title: "Regulation and where you are",
    blocks: [
      {
        kind: "paragraph",
        text: "Digital-asset rules differ from country to country and keep changing. How NAK tokens and NAK services are classified depends on the law, the arrangements and facts involved, and how regulators read them.",
      },
      {
        kind: "paragraph",
        text: "NAK's nonprofit, experimental and community purpose does not exempt its activities from laws that apply to them. That you can reach a website or an application doesn't mean using it is lawful or authorized where you are. Nothing here represents that any regulator has approved, registered or licensed NAK or its services.",
      },
    ],
  },
  {
    id: "forward-looking-statements",
    number: 8,
    title: "Forward-looking statements",
    blocks: [
      {
        kind: "paragraph",
        text: "Statements about future developments, token features, partnerships, community programs, treasury plans, reserve arrangements or planned services are forward-looking. They are uncertain and actual outcomes may differ materially. Plans can change, be delayed or be dropped. No future feature, financial result, rise in value or milestone is guaranteed.",
      },
    ],
  },
  {
    id: "third-party-content-and-links",
    number: 9,
    title: "Third-party content and links",
    blocks: [
      {
        kind: "paragraph",
        text: "NAK websites may link to other websites, blockchain explorers, exchanges, wallets and community platforms. Unless we say otherwise, they are independent and have their own policies and terms. A link is not a promise that the resource is accurate, reliable, secure, lawful or available. Please check outside information before relying on it.",
      },
    ],
  },
  {
    id: "no-warranties",
    number: 10,
    title: "No warranties",
    blocks: [
      {
        kind: "paragraph",
        text: "As far as the law allows, information and services are provided “as is” and “as available”. We don't guarantee that our websites will always be available, error-free, complete, secure, current or fit for any particular purpose. This doesn't exclude any warranty, duty or statutory protection that can't lawfully be excluded.",
      },
    ],
  },
  {
    id: "limitation-of-liability",
    number: 11,
    title: "Limitation of liability",
    blocks: [
      {
        kind: "paragraph",
        text: "As far as the law allows, liability arising from your use of NAK websites, information or services is limited as set out in the terms that apply to the service you use, such as the NAKSwap Terms of Use (https://nakswap.lol/terms). This page does not itself create a limitation of liability or replace those terms.",
      },
      {
        kind: "paragraph",
        text: "Nothing here excludes or limits liability for fraud or fraudulent misrepresentation, or anything else that can't lawfully be excluded or limited, and nothing here waives your statutory consumer protections or legal remedies.",
      },
    ],
  },
  {
    id: "intellectual-property",
    number: 12,
    title: "Intellectual property",
    blocks: [
      {
        kind: "paragraph",
        text: "The New Age Kapital and NAK names, logos, creative works, written content and other materials are owned by or licensed to New Age Kapital, and are protected by copyright, trademark and other intellectual-property rights. All rights reserved. Unless we give permission, you may not reproduce, redistribute or commercially use them. Third-party names and logos belong to their owners.",
      },
    ],
  },
  {
    id: "security-and-official-channels",
    number: 13,
    title: "Security and official channels",
    blocks: [
      {
        kind: "paragraph",
        text: "Be careful with anyone claiming to represent New Age Kapital. Our only official websites are naktoken.lol, nakapital.lol and nakswap.lol, and our official support channel is Telegram @NAKSTOKEN.",
        links: [
          { label: "naktoken.lol", href: "https://www.naktoken.lol" },
          { label: "nakapital.lol", href: "https://www.nakapital.lol" },
          { label: "nakswap.lol", href: "https://nakswap.lol" },
          { label: "@NAKSTOKEN", href: "https://t.me/NAKSTOKEN" },
        ],
      },
      {
        kind: "paragraph",
        text: "**We never message first, and we will never ask for your private keys, recovery phrase or seed phrase.** No genuine support process needs them. Check website addresses, token and canister identifiers, transaction requests and messages yourself before you connect a wallet or send anything. Impersonating accounts, fake token listings, malicious links and unofficial “support” channels are a real risk.",
      },
    ],
  },
  {
    id: "changes-to-these-disclosures",
    number: 14,
    title: "Changes to these disclosures",
    blocks: [
      {
        kind: "paragraph",
        text: "We may update these disclosures to reflect changes in NAK's activities, technology, the law or other information. The current version is always on this page with its effective date, and we announce material changes on our official channels. Changes don't retroactively remove legal rights or obligations that arose before them.",
      },
    ],
  },
  {
    id: "scope",
    number: 15,
    title: "Scope",
    blocks: [
      {
        kind: "paragraph",
        text: "This page gives general disclosures about New Age Kapital, the NAK token and digital-asset risks. Where the terms of a specific service, such as the NAKSwap Terms of Use (https://nakswap.lol/terms), or the law impose additional duties, those apply and take precedence over anything here that conflicts with them.",
      },
    ],
  },
];

/**
 * Renders a paragraph string with three inline conventions:
 *   **bold**            -> <strong>
 *   Words (https://u)   -> "Words" linked to the URL
 * Plain text passes through untouched.
 */
function renderInline(text: string, keyPrefix: string) {
  // Split on bold markers first, then linkify each non-bold chunk.
  const boldParts = text.split(/\*\*(.+?)\*\*/g);
  return boldParts.map((part, index) => {
    const key = `${keyPrefix}-b${index}`;
    if (index % 2 === 1) {
      return <strong key={key}>{part}</strong>;
    }
    return <span key={key}>{linkify(part, key)}</span>;
  });
}

function linkify(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  // Link text is the proper-noun phrase immediately before the paren:
  // a capitalized word followed by capitalized words or lowercase
  // connectors ("of", "the", ...). This never spans the whole sentence.
  const pattern =
    /([A-Z][A-Za-z0-9'’&.\-]*(?:\s+(?:[A-Z][A-Za-z0-9'’&.\-]*|of|the|and|for|to|in|on|at|by|with|a|an))*)\s*\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(text);
  let i = 0;
  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <a
        key={`${keyPrefix}-l${i}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-colors hover:text-foreground"
        style={{ color: "var(--nak-purple-light)" }}
      >
        {match[1]}
      </a>,
    );
    lastIndex = match.index + match[0].length;
    i += 1;
    match = pattern.exec(text);
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

/**
 * Renders a paragraph that carries explicit links. Each link's visible
 * label is matched literally in the text and wrapped in an anchor; the
 * remaining text still passes through the inline conventions.
 */
function renderLinkedParagraph(
  text: string,
  links: LegalLink[],
  keyPrefix: string,
) {
  const escaped = links.map((link) =>
    link.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  return text.split(pattern).map((part, index) => {
    const key = `${keyPrefix}-x${index}`;
    const link = links.find((candidate) => candidate.label === part);
    if (link) {
      return (
        <a
          key={key}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
          style={{ color: "var(--nak-purple-light)" }}
        >
          {part}
        </a>
      );
    }
    return <span key={key}>{renderInline(part, key)}</span>;
  });
}

export default function LegalPage({ onNavigateToMain }: LegalPageProps) {
  return (
    <div className="relative z-10 mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <button
        type="button"
        onClick={onNavigateToMain}
        className="back-link mb-10"
        data-ocid="legal.back_button"
      >
        ← Back to Home
      </button>

      <p className="section-label">
        New Age Kapital · Digital asset disclosures
      </p>

      <h1 className="mt-4">Legal Disclaimer &amp; Risk Disclosure</h1>

      <p className="mt-3 text-sm text-muted-foreground">
        Effective October 12, 2026
      </p>

      <p className="mt-6 leading-relaxed text-secondary">
        Important information about New Age Kapital (NAK), the NAK token, NAK
        services such as NAKSwap, and the risks of taking part in digital-asset
        ecosystems. The same disclosures apply on naktoken.lol, nakapital.lol
        and nakswap.lol.
      </p>

      <div
        className="surface mt-8 p-5"
        style={{ borderColor: "var(--border-strong)" }}
      >
        <p className="font-semibold text-foreground">Please read carefully.</p>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          These are general disclosures. They don&apos;t create rights for token
          holders, and they don&apos;t replace the terms of a specific service
          or professional advice.
        </p>
      </div>

      <nav aria-labelledby="legal-toc-heading" className="mt-12">
        <h2
          id="legal-toc-heading"
          className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground"
        >
          On this page
        </h2>
        <ol className="mt-4 space-y-2">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-sm text-secondary transition-colors hover:text-foreground"
                data-ocid={`legal.toc_link.${section.number}`}
              >
                {section.number}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-14 space-y-12">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-heading`}
            className="scroll-mt-24"
          >
            <h2 id={`${section.id}-heading`} className="text-xl">
              {section.number}. {section.title}
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-secondary">
              {section.blocks.map((block, blockIndex) =>
                block.kind === "paragraph" ? (
                  <p key={`${section.id}-p${blockIndex}`}>
                    {block.links && block.links.length > 0
                      ? renderLinkedParagraph(
                          block.text,
                          block.links,
                          `${section.id}-p${blockIndex}`,
                        )
                      : renderInline(
                          block.text,
                          `${section.id}-p${blockIndex}`,
                        )}
                  </p>
                ) : (
                  <ul
                    key={`${section.id}-ul${blockIndex}`}
                    className="list-disc space-y-2 pl-6"
                  >
                    {block.items.map((item, itemIndex) => (
                      <li key={`${section.id}-li${blockIndex}-${itemIndex}`}>
                        {renderInline(
                          item,
                          `${section.id}-li${blockIndex}-${itemIndex}`,
                        )}
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-16 border-t border-border pt-8 text-xs text-muted-foreground">
        © 2026 NAK New Age Kapital. All rights reserved. · Last revised October
        12, 2026
      </p>
    </div>
  );
}
