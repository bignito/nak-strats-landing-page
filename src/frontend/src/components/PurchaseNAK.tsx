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
        <div className="grid grid-cols-1 min-[860px]:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left column — copy, spec table and ICPSwap link */}
          <div className="max-w-xl">
            <p className="section-label mb-4">Acquire</p>
            <h2 className="mb-5">Cross-chain entry via Houdiniswap</h2>
            <p className="text-base leading-relaxed text-muted-foreground mb-8">
              Houdiniswap routes swaps across chains without requiring an
              account, so entry into N.A.K. is not gated behind a centralised
              exchange listing. Bridge from most major assets directly.
            </p>

            <div className="surface hairline mb-8">
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

          {/* Right column — embedded Houdiniswap widget */}
          <div className="surface hairline p-6">
            <p className="section-label mb-4">Powered by Houdiniswap</p>
            <iframe
              src="https://app.houdiniswap.com/widget?tokenOut=ICP&hideMultiswap=true&hideSend=true"
              width="480"
              height="640"
              title="Houdini Exchange Widget"
              allow="clipboard-write"
              className="block w-full max-w-full mx-auto"
            />
            <p className="text-xs text-muted-foreground mt-4">
              Swaps are executed by Houdiniswap, a third-party service. N.A.K.
              does not custody funds or control the swap.
            </p>
            <a
              href="https://app.houdiniswap.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              data-ocid="trade.houdiniswap_full_site_link"
            >
              Open the full Houdiniswap site
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PurchaseNAK;
