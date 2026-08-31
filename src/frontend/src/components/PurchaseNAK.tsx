import { ArrowUpRight } from "lucide-react";
import type React from "react";

const ICPSWAP_SWAP_URL =
  "https://app.icpswap.com/swap/pro?input=ryjl3-tyaaa-aaaaa-aaaba-cai&output=eig2s-waaaa-aaaam-qbg5a-cai";

const specRows: { label: string; value: string }[] = [
  { label: "Pair", value: "NAK / ICP" },
  { label: "Venue", value: "ICPSwap" },
  { label: "Bridge", value: "Houdiniswap" },
  { label: "Settlement", value: "ckUSDC" },
];

const PurchaseNAK: React.FC = () => {
  return (
    <section id="trade" className="px-6 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left column — copy and actions */}
          <div className="max-w-xl">
            <p className="section-label mb-4">Acquire</p>
            <h2 className="mb-5">Cross-chain entry via Houdiniswap</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-8">
              Houdiniswap routes swaps across chains without requiring an
              account, so entry into N.A.K. is not gated behind a centralised
              exchange listing. Bridge from most major assets directly.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://houdiniswap.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                data-ocid="trade.swap_houdiniswap_button"
              >
                Swap on Houdiniswap
                <ArrowUpRight className="w-4 h-4" />
              </a>
              <a
                href={ICPSWAP_SWAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                data-ocid="trade.swap_icpswap_button"
              >
                ICPSwap
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right column — spec table */}
          <div className="surface hairline">
            <table className="spec-table">
              <tbody>
                {specRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PurchaseNAK;
