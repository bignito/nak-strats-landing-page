import { ArrowUpRight } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useCkUSDCCheckoutEnabled } from "../hooks/useQueries";

const ICPSWAP_SWAP_URL =
  "https://app.icpswap.com/swap/pro?input=ryjl3-tyaaa-aaaaa-aaaba-cai&output=eig2s-waaaa-aaaam-qbg5a-cai";

const PurchaseNAK: React.FC = () => {
  const ckUSDCEnabled = useCkUSDCCheckoutEnabled();
  const [swapHeight, setSwapHeight] = useState(760);
  const specRows: { label: string; value: string }[] = [
    { label: "Pair", value: "NAK / ICP" },
    { label: "Venue", value: "NAKSwap" },
    { label: "Bridge", value: "Houdiniswap" },
    ...(ckUSDCEnabled ? [{ label: "Settlement", value: "ckUSDC" }] : []),
  ];

  // Content-driven height: the embedded NAK Swap service posts its rendered
  // height back to us. Only accept messages from the swap origin, and clamp
  // the value so a malformed message cannot collapse or balloon the section.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://swap.naktoken.lol") return;
      const data = event.data as { type?: string; height?: unknown };
      if (data.type === "nakswap:height" && typeof data.height === "number") {
        setSwapHeight(Math.min(Math.max(data.height, 400), 2000));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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

          {/* Right column — embedded NAK Swap service */}
          <div className="surface hairline p-6">
            <iframe
              src="https://swap.naktoken.lol/?embed=1"
              title="NAK Swap"
              allow="clipboard-write"
              className="block w-full max-w-full border-0"
              style={{
                width: "100%",
                height: swapHeight,
                border: 0,
                display: "block",
              }}
            />
            <p className="text-xs text-muted-foreground mt-4">
              Swaps are routed through Houdini&apos;s infrastructure. N.A.K.
              does not custody funds.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PurchaseNAK;
