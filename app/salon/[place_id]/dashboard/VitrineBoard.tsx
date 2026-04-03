"use client";

import { FlavorColorPicker } from "@/src/components/FlavorColorPicker";
import { createClient } from "@/src/lib/supabase/client";
import { useState } from "react";

const DEFAULT_HEX = "#F9A8D4";

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

type Props = {
  placeId: string;
  initialFlavours: VitrineFlavour[];
  initialLog: VitrineVisibilityLogRow[];
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

export function VitrineBoard({ placeId, initialFlavours, initialLog }: Props) {
  const [flavours, setFlavours] = useState<VitrineFlavour[]>(initialFlavours);
  const [logRows, setLogRows] = useState<VitrineVisibilityLogRow[]>(initialLog);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColour, setNewColour] = useState(DEFAULT_HEX);
  const [colourPickerOpen, setColourPickerOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [logExpanded, setLogExpanded] = useState(false);

  const supabase = createClient();

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
      setLogRows((prev) => [data, ...prev].slice(0, 50));
    }
  }

  async function toggleVisible(row: VitrineFlavour) {
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
      setAddError(error.message);
    } else if (data) {
      setFlavours((list) => [...list, data]);
      setNewName("");
      setNewColour(DEFAULT_HEX);
      setColourPickerOpen(false);
      setAdding(false);
      await appendLog(data.id, true);
    } else {
      setAddError("No row returned — check RLS policies.");
    }
    setAddSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {flavours.length === 0 && !adding && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Nothing on the vitrine yet — add flavours customers should see on your public page.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {flavours.map((f) => (
          <div
            key={f.id}
            className={`relative flex min-h-[3.25rem] flex-col justify-center rounded-2xl px-3 py-2 shadow-sm ring-1 ring-black/10 transition dark:ring-white/10 ${
              f.is_visible ? "" : "opacity-45 line-through"
            }`}
            style={{ backgroundColor: f.colour || DEFAULT_HEX }}
          >
            <span className="pr-8 text-center text-xs font-semibold text-white drop-shadow-sm">
              {f.name}
            </span>
            <button
              type="button"
              onClick={() => void toggleVisible(f)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/90 transition hover:bg-white/20 hover:text-white"
              title={f.is_visible ? "Hide from public page" : "Show on public page"}
              aria-pressed={f.is_visible}
            >
              {f.is_visible ? (
                <EyeOpenIcon className="opacity-95" />
              ) : (
                <EyeClosedIcon className="opacity-90" />
              )}
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2.5 ring-1 ring-teal-200 dark:bg-zinc-800/50 dark:ring-teal-800">
            <button
              type="button"
              onClick={() => setColourPickerOpen(!colourPickerOpen)}
              className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: newColour }}
              title="Colour"
            />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addFlavour();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewName("");
                  setColourPickerOpen(false);
                }
              }}
              placeholder="Flavour name…"
              className="min-w-[8rem] flex-1 rounded-lg border border-teal-300 bg-white px-2 py-1 text-sm dark:border-teal-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <button
              type="button"
              onClick={() => void addFlavour()}
              disabled={addSaving || !newName.trim()}
              className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              {addSaving ? "…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewName("");
                setColourPickerOpen(false);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500"
            >
              Cancel
            </button>
          </div>
          {colourPickerOpen && (
            <div className="mt-1">
              <FlavorColorPicker
                value={newColour}
                onChange={setNewColour}
                onClose={() => setColourPickerOpen(false)}
                flavorName={newName || "New flavour"}
                allFlavours={[
                  ...flavours.map((fl) => ({ hex: fl.colour, label: fl.name })),
                  { hex: newColour, label: newName || "New flavour" },
                ]}
                activeIndex={flavours.length}
              />
            </div>
          )}
        </div>
      )}

      {addError && <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>}

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-500 hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-teal-600 dark:hover:text-teal-400"
        >
          <span className="text-base leading-none">+</span> Add vitrine flavour
        </button>
      )}

      <div className="rounded-2xl ring-1 ring-zinc-200 dark:ring-zinc-700">
        <button
          type="button"
          onClick={() => setLogExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
        >
          Visibility history
          <span className="text-zinc-400">{logExpanded ? "▼" : "▶"}</span>
        </button>
        {logExpanded && (
          <ul className="max-h-48 space-y-1 overflow-y-auto border-t border-zinc-100 px-3 py-2 text-xs dark:border-zinc-800">
            {logRows.length === 0 ? (
              <li className="text-zinc-400 dark:text-zinc-500">No changes yet.</li>
            ) : (
              logRows.map((r) => {
                const name = flavours.find((f) => f.id === r.flavour_id)?.name ?? "Flavour";
                return (
                  <li key={r.id} className="text-zinc-600 dark:text-zinc-300">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{name}</span>
                    {" — "}
                    {r.set_visible ? (
                      <span className="text-teal-600 dark:text-teal-400">shown</span>
                    ) : (
                      <span className="text-zinc-500">hidden</span>
                    )}
                    <span className="text-zinc-400 dark:text-zinc-500">
                      {" · "}
                      {new Date(r.changed_at).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
