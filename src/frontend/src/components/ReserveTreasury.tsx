import { Check, Copy, ExternalLink } from "lucide-react";
import type React from "react";
import { useState } from "react";

const CANISTER_ID = "eig2s-waaaa-aaaam-qbg5a-cai";
const RESERVE_DASHBOARD_URL = "https://nakreserve-p6m.caffeine.xyz/";

const ReserveTreasury: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CANISTER_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy canister id:", err);
    }
  };

  return (
    <section id="treasury" className="px-6 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left column — narrative + action */}
          <div className="flex flex-col items-start gap-6">
            <span className="section-label">Reserve</span>
            <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.02em] max-w-xl">
              Holdings are on-ledger and publicly verifiable
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground max-w-lg">
              The reserve composition is queryable directly from the ledger and
              independently verifiable at any time. Every holding is settled
              on-chain, with no off-ledger balances.
            </p>
            <a
              href={RESERVE_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center gap-2"
              data-ocid="treasury.open_dashboard_button"
            >
              <ExternalLink className="w-4 h-4" />
              Open reserve dashboard
            </a>
          </div>

          {/* Right column — spec table */}
          <div className="surface rounded-[0.25rem]">
            <table className="spec-table">
              <tbody>
                <tr>
                  <th scope="row">Network</th>
                  <td>Internet Computer</td>
                </tr>
                <tr>
                  <th scope="row">Standard</th>
                  <td>ICRC-1</td>
                </tr>
                <tr>
                  <th scope="row">Settlement</th>
                  <td>ckUSDC</td>
                </tr>
                <tr>
                  <th scope="row">Canister</th>
                  <td>
                    <div className="flex items-center justify-between gap-3">
                      <code className="num text-sm break-all">
                        {CANISTER_ID}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="btn-secondary shrink-0 px-2.5 py-1.5 text-xs"
                        aria-label="Copy canister id to clipboard"
                        data-ocid="treasury.copy_canister_button"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReserveTreasury;
