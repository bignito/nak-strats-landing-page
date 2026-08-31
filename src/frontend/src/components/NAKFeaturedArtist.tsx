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

const NAKFeaturedArtist: React.FC<NAKFeaturedArtistProps> = () => {
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
            July Jax$on
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
          Ruby Galaxy — debut project, out now
        </p>

        <div className="hairline surface overflow-hidden">
          <div className="relative w-full aspect-video">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/HkIOBvsSyOQ"
              title="Ruby Galaxy — July Jax$on"
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
              Ruby Galaxy · July Jax$on
            </span>
            <a
              href="https://youtu.be/HkIOBvsSyOQ"
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
            href="mailto:culture@newagekapital.com"
            className="btn btn-secondary"
            data-ocid="culture.submit_button"
          >
            Submit your work
          </a>
        </div>
      </div>
    </section>
  );
};

export default NAKFeaturedArtist;
