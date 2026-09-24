"use client";
/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveProfile, type ProfileInput } from "@/app/actions/profile";
import { DemoBanner } from "@/components/DemoBanner";
import { RestartDemo } from "@/components/RestartDemo";
import { ChevronLeft, ImageIcon, PlusIcon, XIcon } from "@/components/icons";
import { PromptCard } from "@/components/PromptCard";
import { CUSTOM_TAG_MAX, MAX_INTERESTS, MAX_AGE, MIN_AGE, MIN_INTERESTS, PROMPT_ANSWER_MAX } from "@/lib/config";
import { placeholderUrl } from "@/lib/placeholder";
import type { Gender, ProfileTag, ResidenceStatus } from "@/lib/types";
import { uploadImage } from "@/lib/uploadImage";
import { YORK_RESIDENCES } from "@/lib/residences";
import { CAMPUSES, DEGREES, isCampus, isDegree } from "@/lib/academics";

const EMPTY: ProfileInput = {
  photos: [null, null, null, null],
  name: "",
  age: 0,
  major: "",
  mainCampus: null,
  degree: null,
  hometown: "",
  residenceStatus: null,
  residenceId: null,
  gender: null,
  genderFilterMode: "everyone",
  tagIds: [],
  customTag: "",
  prompts: [0, 1, 2].map(() => ({ promptId: null, answer: "", imageUrl: null })),
};

const STEPS = [
  { label: "About you", title: "Let’s start with you.", description: "A couple of introductions before you meet your people." },
  { label: "Campus life", title: "What’s your story?", description: "Share a little about where you’re from and your life on campus." },
  { label: "Your preferences", title: "Who would you like to meet?", description: "Make Sidekick feel right for you. You can change these choices later." },
  { label: "Interests", title: "Find your common ground.", description: "Choose 3–5 things you love. They’ll help us find people you click with." },
  { label: "Photos", title: "Put a face to your name.", description: "Let your personality show through a few favourite photos." },
  { label: "Prompt 1 of 3", title: "A little more you.", description: "Pick a question that feels like you and make it your own." },
  { label: "Prompt 2 of 3", title: "Keep the story going.", description: "Give someone another reason to say, “Wait, me too.”" },
  { label: "Prompt 3 of 3", title: "One last conversation starter.", description: "Finish your last answer, then you’re ready to meet your people." },
] as const;

export function ProfileWizard({
  tags,
  prompts,
  initial,
  isDemo,
}: {
  tags: ProfileTag[];
  prompts: { id: number; text: string }[];
  initial: ProfileInput | null;
  isDemo: boolean;
}) {
  const router = useRouter();
  const editing = !!initial;
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  const [form, setForm] = useState<ProfileInput>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const update = (patch: Partial<ProfileInput>) => setForm((f) => ({ ...f, ...patch }));

  const promptValid = (index: number) => {
    const prompt = form.prompts[index];
    return !!prompt.promptId && !!prompt.answer.trim() && prompt.answer.trim().length <= PROMPT_ANSWER_MAX
      && !form.prompts.some((other, i) => i !== index && other.promptId === prompt.promptId);
  };
  const stepValid = [
    form.name.trim().length > 0 && form.name.trim().length <= 40 && Number.isInteger(form.age) && form.age >= MIN_AGE && form.age <= MAX_AGE,
    isCampus(form.mainCampus) && isDegree(form.degree) && form.major.trim().length >= 2 && form.major.trim().length <= 60 && form.hometown.trim().length <= 80,
    !!form.gender,
    form.tagIds.length >= MIN_INTERESTS && form.tagIds.length <= MAX_INTERESTS,
    form.photos.every(Boolean),
    promptValid(0), promptValid(1), promptValid(2),
  ][step];

  const goTo = (index: number) => {
    setError(null);
    setStep(index);
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (!stepValid || saving) return;
    setError(null);
    if (step < STEPS.length - 1) {
      goTo(step + 1);
      return;
    }
    startSaving(async () => {
      try {
        const res = await saveProfile(form);
        if (res.ok) {
          router.push(editing ? "/profile" : "/setup/blocks");
          router.refresh();
        } else setError(res.error);
      } catch {
        setError("We couldn’t save your profile. Your answers are still here — please try again.");
      }
    });
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-bg/95 px-5 pt-5 pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full hover:bg-green-soft disabled:opacity-0"
            onClick={() => (step > 0 ? goTo(step - 1) : editing && router.push("/profile"))}
            disabled={saving || (step === 0 && !editing)}
            aria-label="Back"
          >
            <ChevronLeft />
          </button>
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="font-serif text-xl font-semibold">{STEPS[step].label}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5" role="progressbar" aria-label="Profile setup" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          {STEPS.map((s, i) => (
            <div key={s.label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-green" : "bg-line"}`} />
          ))}
        </div>
      </header>

      <form id="profile-setup" onSubmit={(event) => { event.preventDefault(); next(); }} className="flex-1 px-5 pt-6 pb-36">
        <div className="mb-8">
          <h1 ref={heading} tabIndex={-1} className="font-serif text-3xl leading-tight font-semibold outline-none">{STEPS[step].title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{STEPS[step].description}</p>
        </div>
        <fieldset disabled={saving} className="min-w-0">
          {step === 0 && <BasicsStep form={form} update={update} />}
          {step === 1 && <CampusStep form={form} update={update} />}
          {step === 2 && <PreferencesStep form={form} update={update} />}
          {step === 3 && <InterestsStep tags={tags} form={form} update={update} />}
          {step === 4 && <PhotosStep photos={form.photos} onChange={(photos) => update({ photos })} name={form.name} />}
          {step >= 5 && <PromptsStep bank={prompts} form={form} update={update} index={step - 5} />}
        </fieldset>
        {isDemo && <div className="mt-8"><RestartDemo disabled={saving} /></div>}
      </form>

      <footer className="fixed bottom-0 left-1/2 z-10 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-bg/95 px-5 pt-3 pb-5 backdrop-blur">
        {error && <p role="alert" className="mb-2 text-sm text-danger">{error}</p>}
        <button type="submit" form="profile-setup" className="btn-primary w-full" disabled={!stepValid || saving}>
          {step < STEPS.length - 1 ? "Next" : saving ? "Saving…" : editing ? "Save profile" : "Next: before you explore"}
        </button>
      </footer>
    </main>
  );
}

function ImagePicker({
  url,
  onChange,
  className,
  emptyLabel,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
  className: string;
  emptyLabel: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {url ? (
        <>
          <img src={url} alt="" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-surface/95 text-ink shadow-card"
            aria-label="Remove image"
          >
            <XIcon className="size-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex size-full flex-col items-center justify-center gap-1.5 border-2 border-dashed border-line bg-surface text-ink-soft transition hover:border-green hover:text-green"
        >
          {busy ? <span className="text-sm">Uploading…</span> : emptyLabel}
          {error && <span className="px-2 text-center text-xs text-danger">{error}</span>}
        </button>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

function PhotosStep({ photos, onChange, name }: { photos: (string | null)[]; onChange: (p: (string | null)[]) => void; name: string }) {
  const filled = photos.filter(Boolean).length;
  const fillPlaceholders = () => {
    const initials = name.trim() ? name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "🙂";
    const stamp = Date.now().toString(36);
    onChange(photos.map((p, i) => p ?? placeholderUrl(`me-${stamp}-${i}`, [initials, "☕", "🎧", "📚"][i])));
  };
  return (
    <div className="flex flex-col gap-5">
      <p className="text-ink-soft">Add 4 photos that show what you&apos;re like. Your first photo is the one people see first.</p>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((url, i) => (
          <div key={i} className="relative">
            <ImagePicker
              url={url}
              onChange={(u) => onChange(photos.map((p, j) => (j === i ? u : p)))}
              className="aspect-[4/5] rounded-3xl"
              emptyLabel={
                <>
                  <PlusIcon className="size-7" />
                  <span className="text-sm font-medium">{i === 0 ? "Main photo" : `Photo ${i + 1}`}</span>
                </>
              }
            />
            {i === 0 && url && <span className="pill absolute bottom-2 left-2 bg-surface/95 text-xs text-green">Main</span>}
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-medium text-ink-soft">{filled}/4 added</p>
      {filled < 4 && (
        <DemoBanner>
          No photos handy?{" "}
          <button type="button" className="font-semibold text-green underline" onClick={fillPlaceholders}>
            Fill empty slots with placeholders
          </button>
        </DemoBanner>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  allowDeselect = false,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T | null) => void;
  allowDeselect?: boolean;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active && allowDeselect ? null : o.value)}
            className={`flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-green text-white shadow-sm" : "text-ink-soft hover:bg-green-soft"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function BasicsStep({ form, update }: { form: ProfileInput; update: (p: Partial<ProfileInput>) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <label>
        <span className="label">First name</span>
        <input className="field" value={form.name} autoComplete="given-name" required maxLength={40} onChange={(e) => update({ name: e.target.value })} placeholder="Alex" />
      </label>
      <label>
        <span className="label">How old are you?</span>
        <input
          className="field"
          inputMode="numeric"
          value={form.age || ""}
          onChange={(e) => update({ age: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) })}
          placeholder="19"
          required
          aria-describedby="age-help"
        />
      </label>
      <p id="age-help" className={`text-sm ${form.age > 0 && form.age < MIN_AGE ? "text-danger" : "text-ink-soft"}`}>
        Sidekick is for students {MIN_AGE} and over. Your first name and age appear on your profile.
      </p>
    </div>
  );
}

function CampusStep({ form, update }: { form: ProfileInput; update: (p: Partial<ProfileInput>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <label>
        <span className="label">Your main campus</span>
        <select className="field" required value={form.mainCampus ?? ""} onChange={(event) => update({ mainCampus: isCampus(event.target.value) ? event.target.value : null })} aria-describedby="campus-help">
          <option value="" disabled>Choose your main campus</option>
          {CAMPUSES.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
        </select>
        <span id="campus-help" className="mt-2 block text-xs leading-relaxed text-ink-soft">Where you spend most of your time. You can still meet people from all three campuses.</span>
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
        <label>
          <span className="label">Your major</span>
          <input className="field" value={form.major} minLength={2} maxLength={60} required onChange={(e) => update({ major: e.target.value })} placeholder="e.g. Psychology" />
        </label>
        <label>
          <span className="label">Degree</span>
          <select className="field" required value={form.degree ?? ""} onChange={(event) => update({ degree: isDegree(event.target.value) ? event.target.value : null })}>
            <option value="" disabled>Select</option>
            {DEGREES.map((degree) => <option key={degree} value={degree}>{degree}</option>)}
          </select>
        </label>
      </div>
      <label>
        <span className="label">Where are you from? <span className="font-normal normal-case">(optional)</span></span>
        <input className="field" value={form.hometown} maxLength={80} onChange={(e) => update({ hometown: e.target.value })} placeholder="City or hometown" aria-describedby="hometown-help" />
        <span id="hometown-help" className="mt-2 block text-xs text-ink-soft">Shown on your profile. A city is enough — no street address needed.</span>
      </label>
      <fieldset>
        <legend className="label">Campus life <span className="font-normal normal-case">(optional)</span></legend>
        <Segmented<ResidenceStatus>
          value={form.residenceStatus}
          allowDeselect
          onChange={(residenceStatus) => update({ residenceStatus, residenceId: residenceStatus === "residence" ? form.residenceId : null })}
          options={[
            { value: "residence", label: "🏠 In residence" },
            { value: "commuter", label: "🚌 Commuter" },
          ]}
        />
      </fieldset>
      {form.residenceStatus === "residence" && (
        <label className="rounded-2xl bg-green-soft p-4">
          <span className="label">Which residence? <span className="font-normal normal-case">(optional)</span></span>
          <select className="field" value={form.residenceId ?? ""} aria-describedby="residence-help" onChange={(event) => update({ residenceId: event.target.value || null })}>
            <option value="">Leave my residence private</option>
            {["Keele", "Glendon"].map((campus) => (
              <optgroup key={campus} label={`York University · ${campus}`}>
                {YORK_RESIDENCES.filter((residence) => residence.campus === campus).map((residence) => (
                  <option key={residence.id} value={residence.id}>{residence.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <span id="residence-help" className="mt-2 block text-xs leading-relaxed text-ink-soft">
            Only people who also select “In residence” can see your residence name. Commuters won’t see it.
            We’re starting with York’s Keele and Glendon residences. If yours isn’t listed, you can leave this blank.
          </span>
        </label>
      )}
    </div>
  );
}

function PreferencesStep({ form, update }: { form: ProfileInput; update: (p: Partial<ProfileInput>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="label">Gender</span>
        <Segmented<Gender>
          value={form.gender}
          onChange={(gender) => update({ gender, genderFilterMode: gender === "rather_not_say" ? "everyone" : form.genderFilterMode })}
          options={[
            { value: "female", label: "Woman" },
            { value: "male", label: "Man" },
            { value: "rather_not_say", label: "Rather not say" },
          ]}
        />
        <p className="mt-1.5 text-xs text-ink-soft">Not shown on your profile. Only used for the filter below.</p>
      </div>

      <div className="rounded-3xl bg-green-soft p-4">
        <span className="label text-green">Who I want to see</span>
        <Segmented
          value={form.genderFilterMode}
          onChange={(v) => update({ genderFilterMode: v ?? "everyone" })}
          options={[
            { value: "everyone", label: "Everyone" },
            ...(form.gender && form.gender !== "rather_not_say" ? [{ value: "same_gender" as const, label: "Same gender as me" }] : []),
          ]}
        />
        {form.gender === "rather_not_say" && (
          <p className="mt-2 text-xs text-ink-soft">The same-gender filter needs a gender selection, so you&apos;ll see everyone.</p>
        )}
      </div>
    </div>
  );
}

function InterestsStep({ tags, form, update }: { tags: ProfileTag[]; form: ProfileInput; update: (p: Partial<ProfileInput>) => void }) {
  const selected = new Set(form.tagIds);
  const atMax = selected.size >= MAX_INTERESTS;
  const byCategory = tags.reduce<Record<string, ProfileTag[]>>((acc, t) => ((acc[t.category] ??= []).push(t), acc), {});
  const toggle = (id: number) =>
    update({ tagIds: selected.has(id) ? form.tagIds.filter((t) => t !== id) : atMax ? form.tagIds : [...form.tagIds, id] });

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-[118px] z-[5] -mx-5 flex items-center justify-between bg-bg/95 px-5 py-2 backdrop-blur">
        <p className="text-ink-soft">Pick what you&apos;re into.</p>
        <span className={`pill ${selected.size >= MIN_INTERESTS ? "bg-green text-white" : "bg-mustard-soft text-accent-ink"}`}>
          {selected.size}/{MAX_INTERESTS} selected
        </span>
      </div>
      {selected.size < MIN_INTERESTS && <p className="-mt-3 text-sm text-ink-soft">Choose at least {MIN_INTERESTS} to continue.</p>}

      {Object.entries(byCategory).map(([category, list]) => (
        <section key={category}>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-green uppercase">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {list.map((t) => {
              const on = selected.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  disabled={!on && atMax}
                  aria-pressed={on}
                  className={`pill border transition disabled:opacity-40 ${
                    on ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink hover:bg-green-soft"
                  }`}
                >
                  {t.emoji} {t.name}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <section className="card p-4">
        <label>
          <span className="label">
            Your own tag <span className="font-normal normal-case">(optional)</span>
          </span>
          <input
            className="field"
            value={form.customTag}
            maxLength={CUSTOM_TAG_MAX}
            onChange={(e) => update({ customTag: e.target.value })}
            placeholder="e.g. Frog enthusiast"
          />
        </label>
        <div className="mt-2 flex items-center justify-between">
          {form.customTag.trim() ? (
            <span className="pill border border-dashed border-mustard bg-surface text-ink">✨ {form.customTag.trim()}</span>
          ) : (
            <span />
          )}
          <span className="text-xs text-ink-soft">
            {form.customTag.length}/{CUSTOM_TAG_MAX}
          </span>
        </div>
      </section>
    </div>
  );
}

function PromptsStep({
  bank,
  form,
  update,
  index,
}: {
  bank: { id: number; text: string }[];
  index: number;
  form: ProfileInput;
  update: (p: Partial<ProfileInput>) => void;
}) {
  const setPrompt = (i: number, patch: Partial<ProfileInput["prompts"][number]>) =>
    update({ prompts: form.prompts.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-ink-soft">A written answer is required. Add a photo if you like.</p>
      {form.prompts.map((p, i) => {
        if (i !== index) return null;
        const takenElsewhere = new Set(form.prompts.filter((_, j) => j !== i).map((x) => x.promptId));
        const question = bank.find((b) => b.id === p.promptId)?.text;
        return (
          <section key={i} className="flex flex-col gap-3">
            <label htmlFor={`prompt-${i}`} className="text-xs font-semibold tracking-wide text-green uppercase">Choose prompt {i + 1}</label>
            <select
              id={`prompt-${i}`}
              className="field appearance-none"
              value={p.promptId ?? ""}
              onChange={(e) => setPrompt(i, { promptId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Choose a prompt…</option>
              {bank.map((b) => (
                <option key={b.id} value={b.id} disabled={takenElsewhere.has(b.id)}>
                  {b.text}
                </option>
              ))}
            </select>
            {p.promptId && (
              <>
                <div>
                  <label htmlFor={`answer-${i}`} className="label">Your answer</label>
                  <textarea
                    id={`answer-${i}`}
                    className="field min-h-24 resize-none font-serif text-lg"
                    maxLength={PROMPT_ANSWER_MAX}
                    value={p.answer}
                    onChange={(e) => setPrompt(i, { answer: e.target.value })}
                    placeholder="Your answer…"
                  />
                  <p className="text-right text-xs text-ink-soft">
                    {p.answer.length}/{PROMPT_ANSWER_MAX}
                  </p>
                </div>
                {!p.imageUrl && (
                  <ImagePicker
                    url={null}
                    onChange={(imageUrl) => setPrompt(i, { imageUrl })}
                    className="h-14 rounded-2xl"
                    emptyLabel={
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <ImageIcon className="size-4" /> Add a photo (optional)
                      </span>
                    }
                  />
                )}
                <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Preview</p>
                <div className="relative">
                  <PromptCard question={question!} answer={p.answer.trim() || "Your answer will appear here"} imageUrl={p.imageUrl} />
                  {p.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setPrompt(i, { imageUrl: null })}
                      className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-surface/95 shadow-card"
                      aria-label="Remove prompt photo"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
