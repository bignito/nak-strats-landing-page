import { ArrowUpRight } from "lucide-react";
import type React from "react";

interface NAKFeaturedArtistProps {
  onNavigateToArtist?: () => void;
}

const rows: Array<{ stage: string; value: string; note: string }> = [
  { stage: "Stage", value: "Genesis", note: "Building the roster from zero." },
  {
    stage: "Approach",
    value: "Organic",
    note: "Talent found along the way, not bought in.",
  },
  {
    stage: "Standard",
    value: "Execution",
    note: "No over-promises. Work over announcements.",
  },
];

// Featured video (was read from the storefront backend; the site is static now).
const FEATURED_EMBED_URL = "https://www.youtube.com/embed/1XfKHtu_hrE";
const FEATURED_WATCH_URL = "https://youtu.be/1XfKHtu_hrE";
// Artist submissions go through the NAK Telegram channel.
const SUBMISSIONS_URL = "https://t.me/NAKSTOKEN";

const NAKFeaturedArtist: React.FC<NAKFeaturedArtistProps> = () => {
  const embedUrl = FEATURED_EMBED_URL;
  const watchUrl = FEATURED_WATCH_URL;

  return (
    <section id="culture" className="px-6 py-16 sm:py-20">
      <div className="max-w-5xl mx-auto">
        <p className="section-label mb-6" data-ocid="culture.section_label">
          Culture · Now
        </p>

        <div className="flex items-center gap-3 mb-3">
          <h2
            className="text-[1.75rem] font-medium tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            NAK culture is hustle, heart, and grit.
          </h2>
          <span
            className="hairline inline-flex items-center px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.14em] font-semibold text-muted-foreground"
            data-ocid="culture.ai_artist_badge"
          >
            AI Artist
          </span>
        </div>

        <p
          className="font-mono text-[0.8125rem] text-muted-foreground mb-8"
          data-ocid="culture.debut_line"
        >
          Making something out of nothing. And when it hits, we don&apos;t
          flaunt it — we keep doing what we do. Got to feed the family at the
          end of the day. That&apos;s the mission.
        </p>

        <div className="hairline surface overflow-hidden">
          <div className="relative w-full aspect-video">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={embedUrl}
              title="NAK Culture — featured video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              data-ocid="culture.video_embed"
            />
          </div>
          <div className="hairline-strong border-t-0 flex items-center justify-between px-4 py-3">
            <span
              className="font-mono text-[0.8125rem] text-muted-foreground"
              data-ocid="culture.video_title"
            >
              NAK Culture
            </span>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.8125rem] font-medium text-foreground hover:text-primary transition-colors"
              data-ocid="culture.watch_link"
            >
              Watch on YouTube
            </a>
          </div>
        </div>

        <div className="hairline mt-10 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {rows.map((row) => (
            <div
              key={row.stage}
              className="px-4 py-5"
              data-ocid={`culture.row.${row.stage.toLowerCase()}`}
            >
              <p className="section-label mb-2">{row.stage}</p>
              <p className="text-[1.0625rem] font-medium text-foreground mb-1">
                {row.value}
              </p>
              <p className="text-[0.8125rem] text-muted-foreground">
                {row.note}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <a
            href={SUBMISSIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary inline-flex items-center gap-2"
            data-ocid="culture.submit_button"
          >
            Submit your work on Telegram
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>

    </section>
  );
};

export default NAKFeaturedArtist;
