"use client";
/* eslint-disable @next/next/no-img-element -- user uploads + local SVG placeholders */

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveProfile, type ProfileInput } from "@/app/actions/profile";
import { DemoBanner } from "@/components/DemoBanner";
import { ChevronLeft, ImageIcon, PlusIcon, XIcon } from "@/components/icons";
import { PromptCard } from "@/components/PromptCard";
import { CUSTOM_TAG_MAX, MAX_INTERESTS, MIN_AGE, MIN_INTERESTS, PROMPT_ANSWER_MAX } from "@/lib/config";
import { placeholderUrl } from "@/lib/placeholder";
import type { Gender, ProfileTag, ResidenceStatus } from "@/lib/types";
import { uploadImage } from "@/lib/uploadImage";

const EMPTY: ProfileInput = {
  photos: [null, null, null, null],
  name: "",
  age: 0,
  major: "",
  residenceStatus: null,
  gender: null,
  genderFilterMode: "everyone",
  tagIds: [],
  customTag: "",
  prompts: [0, 1, 2].map(() => ({ promptId: null, answer: "", imageUrl: null })),
};

const STEPS = ["Photos", "About you", "Interests", "Prompts"] as const;

export function ProfileWizard({
  tags,
  prompts,
  initial,
}: {
  tags: ProfileTag[];
  prompts: { id: number; text: string }[];
  initial: ProfileInput | null;
}) {
  const router = useRouter();
  const editing = !!initial;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProfileInput>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const update = (patch: Partial<ProfileInput>) => setForm((f) => ({ ...f, ...patch }));

  const stepValid = [
    form.photos.every(Boolean),
    form.name.trim().length > 0 && form.age >= MIN_AGE && form.major.trim().length >= 2 && !!form.gender,
    form.tagIds.length >= MIN_INTERESTS && form.tagIds.length <= MAX_INTERESTS,
    form.prompts.every((p) => p.promptId && p.answer.trim()),
  ][step];

  const next = () => {
    setError(null);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    startSaving(async () => {
      const res = await saveProfile(form);
      if (res.ok) {
        router.push(editing ? "/profile" : "/discover");
        router.refresh();
      } else setError(res.error);
    });
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-bg/95 px-5 pt-5 pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full hover:bg-green-soft disabled:opacity-0"
            onClick={() => (step > 0 ? setStep(step - 1) : editing && router.push("/profile"))}
            disabled={step === 0 && !editing}
            aria-label="Back"
          >
            <ChevronLeft />
          </button>
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="font-serif text-xl font-semibold">{STEPS[step]}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-green" : "bg-line"}`} />
          ))}
        </div>
      </header>

      <div className="flex-1 px-5 pt-2 pb-32">
        {step === 0 && <PhotosStep photos={form.photos} onChange={(photos) => update({ photos })} name={form.name} />}
        {step === 1 && <BasicsStep form={form} update={update} />}
        {step === 2 && <InterestsStep tags={tags} form={form} update={update} />}
        {step === 3 && <PromptsStep bank={prompts} form={form} update={update} />}
      </div>

      <footer className="fixed bottom-0 left-1/2 z-10 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-bg/95 px-5 pt-3 pb-5 backdrop-blur">
        {error && <p className="mb-2 text-sm text-accent-ink">{error}</p>}
        <button type="button" className="btn-primary w-full" disabled={!stepValid || saving} onClick={next}>
          {step < STEPS.length - 1 ? "Continue" : saving ? "Saving…" : editing ? "Save profile" : "Start exploring"}
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
          {error && <span className="px-2 text-center text-xs text-accent-ink">{error}</span>}
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
        <input className="field" value={form.name} maxLength={40} onChange={(e) => update({ name: e.target.value })} placeholder="Alex" />
      </label>
      <div className="grid grid-cols-[96px_1fr] gap-3">
        <label>
          <span className="label">Age</span>
          <input
            className="field"
            inputMode="numeric"
            value={form.age || ""}
            onChange={(e) => update({ age: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) })}
            placeholder="19"
          />
        </label>
        <label>
          <span className="label">Major</span>
          <input className="field" value={form.major} maxLength={60} onChange={(e) => update({ major: e.target.value })} placeholder="Psychology" />
        </label>
      </div>
      {form.age > 0 && form.age < MIN_AGE && <p className="-mt-3 text-sm text-accent-ink">Sidequest is for students {MIN_AGE} and over.</p>}

      <div>
        <span className="label">
          Where do you live? <span className="font-normal normal-case">(optional)</span>
        </span>
        <Segmented<ResidenceStatus>
          value={form.residenceStatus}
          allowDeselect
          onChange={(residenceStatus) => update({ residenceStatus })}
          options={[
            { value: "residence", label: "🏠 In residence" },
            { value: "commuter", label: "🚌 Commuter" },
          ]}
        />
      </div>

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
        <span className={`pill ${selected.size >= MIN_INTERESTS ? "bg-green text-white" : "bg-mustard-soft text-ink"}`}>
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
                    on ? "border-mustard bg-mustard text-ink" : "border-line bg-surface text-ink hover:bg-mustard-soft"
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
}: {
  bank: { id: number; text: string }[];
  form: ProfileInput;
  update: (p: Partial<ProfileInput>) => void;
}) {
  const setPrompt = (i: number, patch: Partial<ProfileInput["prompts"][number]>) =>
    update({ prompts: form.prompts.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <div className="flex flex-col gap-8">
      <p className="text-ink-soft">Pick 3 prompts and answer them. You can add a photo to any prompt, but it still needs a written answer.</p>
      {form.prompts.map((p, i) => {
        const takenElsewhere = new Set(form.prompts.filter((_, j) => j !== i).map((x) => x.promptId));
        const question = bank.find((b) => b.id === p.promptId)?.text;
        return (
          <section key={i} className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-green uppercase">Prompt {i + 1}</h3>
            <select
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
                  <textarea
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
