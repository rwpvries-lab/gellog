"use client";

import { FlavorColorPicker } from "@/src/components/FlavorColorPicker";
import { createClient } from "@/src/lib/supabase/client";
import { userFacingSaveError } from "@/src/lib/userFacingError";
import { useEffect, useState } from "react";

const DEFAULT_HEX = "#A8C5A0";

export type VitrineFlavour = {
  id: string;
  salon_place_id: string;
  name: string;
  colour: string;
  is_visible: boolean;
  display_started_at: string | null;
  total_display_seconds: number | null;
  created_at?: string;
};

export type VitrineVisibilityLogRow = {
  id: string;
  salon_place_id: string;
  flavour_id: string;
  set_visible: boolean;
  changed_at: string;
};

export type Suggestion = {
  id: string;
  salon_id: string;
  name: string;
  status: string;
};

type Props = {
  placeId: string;
  initialFlavours: VitrineFlavour[];
  initialSuggestions: Suggestion[];
  onVisibilityLogAppend?: (row: VitrineVisibilityLogRow) => void;
  onFlavoursSnapshot?: (rows: { id: string; name: string }[]) => void;
};

function EyeOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M12 5c-5 0-9 5-9 7s4 7 9 7 9-5 9-7-4-7-9-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function EyeClosedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M3 4.5 5.5 7.1C3.9 8.4 3 10.1 3 12c0 2 4 7 9 7 1.4 0 2.7-.4 3.9-1l2.1 2.1 1.1-1.1-18-18L3 4.5zm4.3 4.3 2 2A3.8 3.8 0 0 0 12 14.2c.5 0 1-.1 1.4-.3l1.6 1.6A8.9 8.9 0 0 1 12 16c-3.4 0-6.4-2.7-7.7-4.2.3-.5.8-1.1 1.3-1.6l1.7 1.6zm13.6 3.2C18.1 9.4 15.1 7 12 7c-.8 0-1.6.1-2.3.4l8.3 8.3c.6-.7 1-1.4 1.3-2.3z"
      />
    </svg>
  );
}

export function FlavourBoard({
  placeId,
  initialFlavours,
  initialSuggestions,
  onVisibilityLogAppend,
  onFlavoursSnapshot,
}: Props) {
  const [flavours, setFlavours] = useState<VitrineFlavour[]>(initialFlavours);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(
    initialSuggestions.filter((s) => s.status === "pending"),
  );

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [colourPickerOpenId, setColourPickerOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColour, setNewColour] = useState(DEFAULT_HEX);
  const [newColourPickerOpen, setNewColourPickerOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    onFlavoursSnapshot?.(flavours.map((f) => ({ id: f.id, name: f.name })));
  }, [flavours, onFlavoursSnapshot]);

  async function appendLog(flavourId: string, setVisible: boolean) {
    const { data, error } = await supabase
      .from("vitrine_visibility_log")
      .insert({
        salon_place_id: placeId,
        flavour_id: flavourId,
        set_visible: setVisible,
      })
      .select()
      .maybeSingle<VitrineVisibilityLogRow>();
    if (!error && data) {
      onVisibilityLogAppend?.(data);
    }
  }

  async function saveName(id: string) {
    const trimmed = editingNameValue.trim();
    setEditingNameId(null);
    if (!trimmed) return;
    const { error } = await supabase.from("vitrine_flavours").update({ name: trimmed }).eq("id", id);
    if (!error) {
      setFlavours((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
    }
  }

  async function handleColourChange(id: string, colour: string) {
    setFlavours((prev) => prev.map((f) => (f.id === id ? { ...f, colour } : f)));
    await supabase.from("vitrine_flavours").update({ colour }).eq("id", id);
  }

  async function toggleVitrine(row: VitrineFlavour) {
    const next = !row.is_visible;
    const prevSnap = { ...row };

    if (next) {
      setFlavours((list) =>
        list.map((f) =>
          f.id === row.id
            ? {
                ...f,
                is_visible: true,
                display_started_at: new Date().toISOString(),
              }
            : f,
        ),
      );
      const { error } = await supabase
        .from("vitrine_flavours")
        .update({
          is_visible: true,
          display_started_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) {
        setFlavours((list) => list.map((f) => (f.id === row.id ? prevSnap : f)));
        return;
      }
      await appendLog(row.id, true);
    } else {
      const started = row.display_started_at;
      const addSeconds = started
        ? Math.max(0, Math.floor((Date.now() - new Date(started).getTime()) / 1000))
        : 0;
      const baseTotal = Number(row.total_display_seconds ?? 0);
      const newTotal = baseTotal + addSeconds;

      setFlavours((list) =>
        list.map((f) =>
          f.id === row.id
            ? {
                ...f,
                is_visible: false,
                display_started_at: null,
                total_display_seconds: newTotal,
              }
            : f,
        ),
      );

      const { error } = await supabase
        .from("vitrine_flavours")
        .update({
          is_visible: false,
          display_started_at: null,
          total_display_seconds: newTotal,
        })
        .eq("id", row.id);
      if (error) {
        setFlavours((list) => list.map((f) => (f.id === row.id ? prevSnap : f)));
        return;
      }
      await appendLog(row.id, false);
    }
  }

  async function deleteFlavour(id: string) {
    setConfirmDeleteId(null);
    const { error } = await supabase.from("vitrine_flavours").delete().eq("id", id);
    if (!error) {
      setFlavours((prev) => prev.filter((f) => f.id !== id));
    }
  }

  async function addFlavour() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAddSaving(true);
    setAddError(null);
    const displayStartedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("vitrine_flavours")
      .insert({
        salon_place_id: placeId,
        name: trimmed,
        colour: newColour,
        is_visible: true,
        display_started_at: displayStartedAt,
      })
      .select()
      .maybeSingle<VitrineFlavour>();
    if (error) {
      setAddError(
        userFacingSaveError(error, "Could not add that flavour. Please try again."),
      );
    } else if (data) {
      setFlavours((prev) => [...prev, data]);
      setNewName("");
      setNewColour(DEFAULT_HEX);
      setNewColourPickerOpen(false);
      setAddingNew(false);
      await appendLog(data.id, true);
    } else {
      setAddError("Could not add that flavour. Please refresh and try again.");
    }
    setAddSaving(false);
  }

  async function approveSuggestion(suggestion: Suggestion) {
    const displayStartedAt = new Date().toISOString();
    const [{ data: newFlavour }] = await Promise.all([
      supabase
        .from("vitrine_flavours")
        .insert({
          salon_place_id: placeId,
          name: suggestion.name,
          colour: DEFAULT_HEX,
          is_visible: true,
          display_started_at: displayStartedAt,
        })
        .select()
        .maybeSingle<VitrineFlavour>(),
      supabase.from("flavour_suggestions").update({ status: "approved" }).eq("id", suggestion.id),
    ]);
    if (newFlavour) {
      setFlavours((prev) => [...prev, newFlavour]);
      await appendLog(newFlavour.id, true);
    }
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  }

  async function dismissSuggestion(id: string) {
    await supabase.from("flavour_suggestions").update({ status: "rejected" }).eq("id", id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Flavour Board</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            The eye toggle controls what visitors see on your public salon page. Hiding a flavour does
            not delete it.
          </p>
        </div>
        {!addingNew ? (
          <button
            type="button"
            onClick={() => setAddingNew(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0D9488] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950"
          >
            <span className="text-base leading-none">+</span> Add flavour
          </button>
        ) : null}
      </div>

      {flavours.length === 0 && !addingNew && (
        <p className="py-2 text-xs text-zinc-400 dark:text-zinc-500">
          No flavours yet — use + Add flavour to create one.
        </p>
      )}

      {flavours.map((f, idx) => (
        <div key={f.id}>
          <div
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
              !f.is_visible ? "opacity-50" : ""
            } bg-zinc-50 dark:bg-zinc-800/50`}
          >
            <button
              type="button"
              onClick={() => setColourPickerOpenId(colourPickerOpenId === f.id ? null : f.id)}
              className="h-6 w-6 flex-shrink-0 rounded-full ring-1 ring-black/10 transition hover:scale-110"
              style={{ backgroundColor: f.colour || DEFAULT_HEX }}
              title="Change colour"
            />

            <div className="min-w-0 flex-1">
              {editingNameId === f.id ? (
                <input
                  autoFocus
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onBlur={() => void saveName(f.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveName(f.id);
                    if (e.key === "Escape") setEditingNameId(null);
                  }}
                  className="w-full rounded-lg border border-teal-300 bg-white px-2 py-0.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-teal-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNameId(f.id);
                    setEditingNameValue(f.name);
                  }}
                  className="truncate text-left text-sm text-zinc-800 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-50"
                >
                  {f.name}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => void toggleVitrine(f)}
              className={`flex shrink-0 items-center justify-center rounded-full p-1.5 transition ${
                f.is_visible
                  ? "text-teal-600 ring-1 ring-teal-200 dark:text-teal-400 dark:ring-teal-800/60"
                  : "text-zinc-400 ring-1 ring-zinc-200 dark:text-zinc-500 dark:ring-zinc-700"
              }`}
              title={f.is_visible ? "On vitrine — tap to hide from public page" : "Off vitrine — tap to show on public page"}
              aria-label={f.is_visible ? "On vitrine" : "Off vitrine"}
              aria-pressed={f.is_visible}
            >
              {f.is_visible ? <EyeOpenIcon className="h-5 w-5" /> : <EyeClosedIcon className="h-5 w-5" />}
            </button>

            {confirmDeleteId === f.id ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void deleteFlavour(f.id)}
                  className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(f.id)}
                className="shrink-0 text-zinc-300 transition hover:text-red-400 dark:text-zinc-600 dark:hover:text-red-500"
                aria-label="Delete flavour"
              >
                ✕
              </button>
            )}
          </div>

          {colourPickerOpenId === f.id && (
            <div className="mt-1">
              <FlavorColorPicker
                value={f.colour || DEFAULT_HEX}
                onChange={(hex) => void handleColourChange(f.id, hex)}
                onClose={() => setColourPickerOpenId(null)}
                flavorName={f.name}
                allFlavours={flavours.map((fl) => ({ hex: fl.colour || DEFAULT_HEX, label: fl.name }))}
                activeIndex={idx}
              />
            </div>
          )}
        </div>
      ))}

      {addingNew && (
        <div>
          <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-2.5 ring-1 ring-teal-200 dark:bg-zinc-800/50 dark:ring-teal-800">
            <button
              type="button"
              onClick={() => setNewColourPickerOpen(!newColourPickerOpen)}
              className="h-6 w-6 flex-shrink-0 rounded-full ring-1 ring-black/10 transition hover:scale-110"
              style={{ backgroundColor: newColour }}
              title="Change colour"
            />

            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addFlavour();
                if (e.key === "Escape") {
                  setAddingNew(false);
                  setNewName("");
                  setNewColourPickerOpen(false);
                }
              }}
              placeholder="Flavour name…"
              className="flex-1 rounded-lg border border-teal-300 bg-white px-2 py-0.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-teal-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />

            <button
              type="button"
              onClick={() => void addFlavour()}
              disabled={addSaving || !newName.trim()}
              className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {addSaving ? "…" : "Add"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAddingNew(false);
                setNewName("");
                setNewColourPickerOpen(false);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500"
            >
              Cancel
            </button>
          </div>

          {newColourPickerOpen && (
            <div className="mt-1">
              <FlavorColorPicker
                value={newColour}
                onChange={setNewColour}
                onClose={() => setNewColourPickerOpen(false)}
                flavorName={newName || "New flavour"}
                allFlavours={[
                  ...flavours.map((fl) => ({ hex: fl.colour || DEFAULT_HEX, label: fl.name })),
                  { hex: newColour, label: newName || "New flavour" },
                ]}
                activeIndex={flavours.length}
              />
            </div>
          )}
        </div>
      )}

      {addError && <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>}

      {suggestions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Suggested by visitors
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/50"
              >
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{s.name}</span>
                <button
                  type="button"
                  onClick={() => void approveSuggestion(s)}
                  className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800/60"
                >
                  Add ✓
                </button>
                <button
                  type="button"
                  onClick={() => void dismissSuggestion(s.id)}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 ring-1 ring-zinc-200 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700"
                >
                  Dismiss ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
