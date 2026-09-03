import { Discipline } from "@/backend";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFeaturedVideo, useSubmitSubmission } from "@/hooks/useQueries";
import type React from "react";
import { useState } from "react";

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

const DISCIPLINES: Array<{ value: Discipline; label: string }> = [
  { value: Discipline.music, label: "Music" },
  { value: Discipline.visualArt, label: "Visual Art" },
  { value: Discipline.video, label: "Video" },
  { value: Discipline.writing, label: "Writing" },
  { value: Discipline.other, label: "Other" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  name: string;
  email: string;
  discipline: Discipline | "";
  link: string;
  message: string;
  marketingConsent: boolean;
  honeypot: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  discipline: "",
  link: "",
  message: "",
  marketingConsent: false,
  honeypot: "",
};

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.discipline) {
    errors.discipline = "Select a discipline.";
  }

  if (!form.link.trim()) {
    errors.link = "Link to work is required.";
  } else {
    try {
      const url = new URL(form.link.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.link = "Link must start with http:// or https://.";
      }
    } catch {
      errors.link = "Enter a valid URL.";
    }
  }

  if (form.message.length > 1000) {
    errors.message = "Message must be 1000 characters or fewer.";
  }

  return errors;
}

const NAKFeaturedArtist: React.FC<NAKFeaturedArtistProps> = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const submit = useSubmitSubmission();
  const { data: featuredVideo } = useFeaturedVideo();

  // Normalized embed URL from the backend; fall back to the current hardcoded
  // video when none is set so the box is never empty.
  const embedUrl =
    featuredVideo?.embedUrl || "https://www.youtube.com/embed/HkIOBvsSyOQ";
  const watchUrl = featuredVideo?.rawUrl || "https://youtu.be/HkIOBvsSyOQ";

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot — silently reject submissions from bots that filled it.
    if (form.honeypot.trim() !== "") {
      setSubmitted(true);
      return;
    }

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const marketingConsentAt = form.marketingConsent
      ? BigInt(Date.now()) * 1_000_000n
      : undefined;

    submit.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        discipline: form.discipline as Discipline,
        link: form.link.trim(),
        message: form.message.trim() === "" ? undefined : form.message.trim(),
        marketingConsent: form.marketingConsent,
        marketingConsentAt,
        honeypot: form.honeypot,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
      },
    );
  };

  const handleClose = () => {
    setOpen(false);
    // Reset after the dialog closes so the next open starts fresh.
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitted(false);
  };

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
          <button
            type="button"
            className="btn btn-secondary"
            data-ocid="culture.submit_button"
            onClick={() => setOpen(true)}
          >
            Submit your work
          </button>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : handleClose())}
      >
        <DialogContent
          className="sm:max-w-lg border-border bg-card"
          data-ocid="culture.submit_modal"
        >
          <DialogHeader>
            <DialogTitle className="section-heading text-lg">
              Submit your work
            </DialogTitle>
            <DialogDescription className="text-[0.8125rem] text-muted-foreground">
              Share a piece for the roster. Reviewed on a rolling basis.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="confirm-step" data-ocid="culture.submit_success">
              <p className="confirm-step-message">
                Submission received. We&apos;ll be in touch if there&apos;s a
                fit.
              </p>
              <div className="confirm-step-actions">
                <button
                  type="button"
                  className="btn"
                  data-ocid="culture.submit_done_button"
                  onClick={handleClose}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Honeypot — hidden from humans, filled by bots. */}
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="culture-honeypot">Leave this field empty</label>
                <input
                  id="culture-honeypot"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.honeypot}
                  onChange={(e) => setField("honeypot", e.target.value)}
                />
              </div>

              <div className="grid gap-4">
                <div>
                  <label
                    htmlFor="culture-name"
                    className="field-label mb-1.5 block"
                  >
                    Name / artist name
                  </label>
                  <input
                    id="culture-name"
                    type="text"
                    className="field-input"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    data-ocid="culture.name_input"
                  />
                  {errors.name && (
                    <p
                      className="mt-1 text-[0.75rem] text-destructive"
                      data-ocid="culture.name_error"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="culture-email"
                    className="field-label mb-1.5 block"
                  >
                    Email
                  </label>
                  <input
                    id="culture-email"
                    type="email"
                    className="field-input"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    data-ocid="culture.email_input"
                  />
                  {errors.email && (
                    <p
                      className="mt-1 text-[0.75rem] text-destructive"
                      data-ocid="culture.email_error"
                    >
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="culture-discipline"
                    className="field-label mb-1.5 block"
                  >
                    Discipline
                  </label>
                  <select
                    id="culture-discipline"
                    className="field-input"
                    value={form.discipline}
                    onChange={(e) =>
                      setField("discipline", e.target.value as Discipline | "")
                    }
                    data-ocid="culture.discipline_select"
                  >
                    <option value="" disabled>
                      Select a discipline
                    </option>
                    {DISCIPLINES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {errors.discipline && (
                    <p
                      className="mt-1 text-[0.75rem] text-destructive"
                      data-ocid="culture.discipline_error"
                    >
                      {errors.discipline}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="culture-link"
                    className="field-label mb-1.5 block"
                  >
                    Link to work
                  </label>
                  <input
                    id="culture-link"
                    type="url"
                    className="field-input"
                    placeholder="https://"
                    value={form.link}
                    onChange={(e) => setField("link", e.target.value)}
                    data-ocid="culture.link_input"
                  />
                  {errors.link && (
                    <p
                      className="mt-1 text-[0.75rem] text-destructive"
                      data-ocid="culture.link_error"
                    >
                      {errors.link}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="culture-message"
                    className="field-label mb-1.5 block"
                  >
                    Message{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    id="culture-message"
                    className="field-input min-h-24 resize-y"
                    maxLength={1000}
                    value={form.message}
                    onChange={(e) => setField("message", e.target.value)}
                    data-ocid="culture.message_textarea"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    {errors.message ? (
                      <p
                        className="text-[0.75rem] text-destructive"
                        data-ocid="culture.message_error"
                      >
                        {errors.message}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="mono-num text-[0.6875rem] text-muted-foreground">
                      {form.message.length}/1000
                    </span>
                  </div>
                </div>

                <label
                  htmlFor="culture-consent"
                  className="flex cursor-pointer items-start gap-3 border border-border bg-card p-4"
                >
                  <input
                    id="culture-consent"
                    type="checkbox"
                    checked={form.marketingConsent}
                    onChange={(e) =>
                      setField("marketingConsent", e.target.checked)
                    }
                    className="consent-checkbox mt-0.5"
                    data-ocid="culture.consent_checkbox"
                  />
                  <span className="text-sm text-secondary-foreground">
                    Keep me posted on future calls for work
                    <span className="text-muted-foreground"> (optional)</span>
                  </span>
                </label>

                {submit.isError && (
                  <p
                    className="text-[0.8125rem] text-destructive"
                    data-ocid="culture.submit_error"
                  >
                    Submission failed. Please try again.
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-ocid="culture.submit_cancel_button"
                    onClick={handleClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={submit.isPending}
                    data-ocid="culture.submit_send_button"
                  >
                    {submit.isPending ? "Sending…" : "Submit"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default NAKFeaturedArtist;
