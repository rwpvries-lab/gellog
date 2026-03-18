"use client";

import { FlavorColorPicker } from "@/src/components/FlavorColorPicker";
import { createClient } from "@/src/lib/supabase/client";
import { useRef, useState } from "react";

const DEFAULT_HEX = "#A8C5A0"; // Pistachio

export type Flavour = {
  id: string;
  salon_id: string;
  name: string;
  colour_hex: string;
  is_available: boolean;
  position: number;
};

export type Suggestion = {
  id: string;
  salon_id: string;
  name: string;
  status: string;
};

type Props = {
  salonId: string;
  initialFlavours: Flavour[];
  initialSuggestions: Suggestion[];
};

export function FlavourBoard({ salonId, initialFlavours, initialSuggestions }: Props) {
  const [flavours, setFlavours] = useState<Flavour[]>(
    [...initialFlavours].sort((a, b) => a.position - b.position),
  );
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

  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const supabase = createClient();

  // ── Name editing ──────────────────────────────────────────

  async function saveName(id: string) {
    const trimmed = editingNameValue.trim();
    setEditingNameId(null);
    if (!trimmed) return;
    const { error } = await supabase
      .from("salon_flavours")
      .update({ name: trimmed })
      .eq("id", id);
    if (!error) {
      setFlavours((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)),
      );
    }
  }

  // ── Colour ────────────────────────────────────────────────

  async function handleColourChange(id: string, colour_hex: string) {
    // Optimistic update — picker stays open
    setFlavours((prev) =>
      prev.map((f) => (f.id === id ? { ...f, colour_hex } : f)),
    );
    await supabase.from("salon_flavours").update({ colour_hex }).eq("id", id);
  }

  // ── Available toggle ──────────────────────────────────────

  async function toggleAvailable(id: string, current: boolean) {
    const { error } = await supabase
      .from("salon_flavours")
      .update({ is_available: !current })
      .eq("id", id);
    if (!error) {
      setFlavours((prev) =>
        prev.map((f) => (f.id === id ? { ...f, is_available: !current } : f)),
      );
    }
  }

  // ── Delete ────────────────────────────────────────────────

  async function deleteFlavour(id: string) {
    setConfirmDeleteId(null);
    const { error } = await supabase
      .from("salon_flavours")
      .delete()
      .eq("id", id);
    if (!error) {
      setFlavours((prev) => prev.filter((f) => f.id !== id));
    }
  }

  // ── Add new ───────────────────────────────────────────────

  async function addFlavour() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAddSaving(true);
    setAddError(null);
    const { data, error } = await supabase
      .from("salon_flavours")
      .insert({
        salon_id: salonId,
        name: trimmed,
        colour_hex: newColour,
        is_available: true,
        position: flavours.length,
      })
      .select()
      .maybeSingle<Flavour>();
    if (error) {
      setAddError(`Could not add flavour: ${error.message}`);
    } else if (data) {
      setFlavours((prev) => [...prev, data]);
      setNewName("");
      setNewColour(DEFAULT_HEX);
      setNewColourPickerOpen(false);
      setAddingNew(false);
    } else {
      setAddError("No data returned — check RLS policies.");
    }
    setAddSaving(false);
  }

  // ── Drag to reorder ───────────────────────────────────────

  function handleDragStart(e: React.DragEvent, id: string) {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = dragIdRef.current;
    setDragOverId(null);
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;

    const sourceIdx = flavours.findIndex((f) => f.id === sourceId);
    const targetIdx = flavours.findIndex((f) => f.id === targetId);
    const reordered = [...flavours];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const withPositions = reordered.map((f, i) => ({ ...f, position: i }));
    setFlavours(withPositions);
    await Promise.all(
      withPositions.map((f) =>
        supabase
          .from("salon_flavours")
          .update({ position: f.position })
          .eq("id", f.id),
      ),
    );
  }

  // ── Suggestions ───────────────────────────────────────────

  async function approveSuggestion(suggestion: Suggestion) {
    const [{ data: newFlavour }] = await Promise.all([
      supabase
        .from("salon_flavours")
        .insert({
          salon_id: salonId,
          name: suggestion.name,
          colour_hex: DEFAULT_HEX,
          is_available: true,
          position: flavours.length,
        })
        .select()
        .maybeSingle<Flavour>(),
      supabase
        .from("flavour_suggestions")
        .update({ status: "approved" })
        .eq("id", suggestion.id),
    ]);
    if (newFlavour) setFlavours((prev) => [...prev, newFlavour]);
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  }

  async function dismissSuggestion(id: string) {
    await supabase
      .from("flavour_suggestions")
      .update({ status: "rejected" })
      .eq("id", id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* Flavour rows */}
      {flavours.length === 0 && !addingNew && (
        <p className="py-2 text-xs text-zinc-400 dark:text-zinc-500">
          No flavours yet — add your first one below.
        </p>
      )}

      {flavours.map((f, idx) => (
        <div key={f.id}>
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, f.id)}
            onDragOver={(e) => handleDragOver(e, f.id)}
            onDrop={(e) => void handleDrop(e, f.id)}
            onDragLeave={() => setDragOverId(null)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
              dragOverId === f.id
                ? "bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800"
                : "bg-zinc-50 dark:bg-zinc-800/50"
            } ${!f.is_available ? "opacity-50" : ""}`}
          >
            {/* Drag handle */}
            <span className="cursor-grab touch-none select-none text-zinc-300 dark:text-zinc-600">
              ⠿
            </span>

            {/* Colour swatch — toggles inline picker */}
            <button
              type="button"
              onClick={() =>
                setColourPickerOpenId(colourPickerOpenId === f.id ? null : f.id)
              }
              className="h-6 w-6 flex-shrink-0 rounded-full ring-1 ring-black/10 transition hover:scale-110"
              style={{ backgroundColor: f.colour_hex }}
              title="Change colour"
            />

            {/* Name */}
            <div className="flex-1 min-w-0">
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
                  className="truncate text-sm text-zinc-800 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-50"
                >
                  {f.name}
                </button>
              )}
            </div>

            {/* Available toggle */}
            <button
              type="button"
              onClick={() => void toggleAvailable(f.id, f.is_available)}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition ${
                f.is_available
                  ? "bg-teal-50 text-teal-700 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800/60"
                  : "bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-zinc-700"
              }`}
            >
              {f.is_available ? "Available" : "Sold out"}
            </button>

            {/* Delete */}
            {confirmDeleteId === f.id ? (
              <div className="flex items-center gap-1">
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
                className="text-zinc-300 transition hover:text-red-400 dark:text-zinc-600 dark:hover:text-red-500"
              >
                ✕
              </button>
            )}
          </div>

          {/* Inline colour picker */}
          {colourPickerOpenId === f.id && (
            <div className="mt-1">
              <FlavorColorPicker
                value={f.colour_hex}
                onChange={(hex) => void handleColourChange(f.id, hex)}
                onClose={() => setColourPickerOpenId(null)}
                flavorName={f.name}
                allFlavours={flavours.map((fl) => ({ hex: fl.colour_hex, label: fl.name }))}
                activeIndex={idx}
              />
            </div>
          )}
        </div>
      ))}

      {/* Inline add row */}
      {addingNew && (
        <div>
          <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-2.5 ring-1 ring-teal-200 dark:bg-zinc-800/50 dark:ring-teal-800">
            {/* Colour swatch for new */}
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

          {/* Inline colour picker for new flavour */}
          {newColourPickerOpen && (
            <div className="mt-1">
              <FlavorColorPicker
                value={newColour}
                onChange={setNewColour}
                onClose={() => setNewColourPickerOpen(false)}
                flavorName={newName || "New flavour"}
                allFlavours={[
                  ...flavours.map((fl) => ({ hex: fl.colour_hex, label: fl.name })),
                  { hex: newColour, label: newName || "New flavour" },
                ]}
                activeIndex={flavours.length}
              />
            </div>
          )}
        </div>
      )}

      {addError && (
        <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
      )}

      {/* Add flavour button */}
      {!addingNew && (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="mt-1 flex items-center gap-2 rounded-full border border-dashed border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-500 transition hover:border-teal-400 hover:text-teal-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-teal-600 dark:hover:text-teal-400"
        >
          <span className="text-base leading-none">+</span> Add flavour
        </button>
      )}

      {/* Suggested by visitors */}
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
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {s.name}
                </span>
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
