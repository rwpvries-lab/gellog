import { describe, expect, it } from "vitest";
import {
  applyResolvedFlavoursToLogRow,
  mapLegacyEmbedRowsToLogFlavours,
  mapResolvedRowsToLogFlavours,
} from "./log-flavours-resolved";

describe("mapResolvedRowsToLogFlavours", () => {
  it("maps resolved view rows and prefers modern column names", () => {
    const rows = mapResolvedRowsToLogFlavours([
      {
        log_flavour_id: "lf-1",
        log_id: "log-1",
        input_name: "  Strawberry ",
        rating_stars: 5,
        tags: ["fruity"],
        texture: 4,
        originality: 3,
        intensity: 2,
        presentation: 5,
        flavour_id: "fl-1",
        flavour_slug: "strawberry",
        canonical_name_en: "Strawberry",
        canonical_name_nl: "Aardbei",
        canonical_name_it: "Fragola",
        base_token: "strawberry-pink",
        drizzle_token: "none",
        crumble_token: "fruit-chunks-red",
      },
    ]);

    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: "lf-1",
        flavour_name: "Strawberry",
        rating: 5,
        rating_texture: 4,
        rating_originality: 3,
        rating_intensity: 2,
        rating_presentation: 5,
      }),
    );
  });

  it("falls back to deprecated rating column names", () => {
    const rows = mapResolvedRowsToLogFlavours([
      {
        log_flavour_id: "lf-2",
        log_id: "log-1",
        input_name: "Chocolate",
        rating: 4,
        rating_texture: 3,
        rating_originality: 2,
        rating_intensity: 1,
        rating_presentation: 5,
        tags: null,
        flavour_id: null,
        flavour_slug: null,
        canonical_name_en: null,
        canonical_name_nl: null,
        canonical_name_it: null,
        base_token: "chocolate-brown",
        drizzle_token: null,
        crumble_token: null,
      },
    ]);

    expect(rows[0]?.rating).toBe(4);
    expect(rows[0]?.rating_texture).toBe(3);
  });
});

describe("mapLegacyEmbedRowsToLogFlavours", () => {
  it("maps legacy embed rows and coerces numeric fields", () => {
    const rows = mapLegacyEmbedRowsToLogFlavours([
      {
        id: 42,
        flavour_name: "Pistachio",
        rating_stars: "4",
        tags: ["nutty"],
        texture: "5",
        is_vegan: true,
      },
    ]);

    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: "42",
        flavour_name: "Pistachio",
        rating: 4,
        rating_texture: 5,
        tags: ["nutty"],
        is_vegan: true,
      }),
    );
  });

  it("uses a placeholder id when legacy rows are missing one", () => {
    const rows = mapLegacyEmbedRowsToLogFlavours([{ flavour_name: "Mystery" }]);
    expect(rows[0]?.id).toBe("missing-0");
  });
});

describe("applyResolvedFlavoursToLogRow", () => {
  it("prefers log_flavours_resolved over legacy log_flavours", () => {
    const row = applyResolvedFlavoursToLogRow({
      id: "log-1",
      salon_name: "Test",
      log_flavours_resolved: [
        {
          log_flavour_id: "resolved-1",
          log_id: "log-1",
          input_name: "Resolved",
          rating_stars: 5,
          tags: null,
          flavour_id: "fl-1",
          flavour_slug: "resolved",
          canonical_name_en: "Resolved",
          canonical_name_nl: null,
          canonical_name_it: null,
          base_token: "strawberry-pink",
          drizzle_token: "none",
          crumble_token: "none",
        },
      ],
      log_flavours: [{ id: 1, flavour_name: "Legacy", rating_stars: 1 }],
    });

    expect(row.log_flavours[0]?.flavour_name).toBe("Resolved");
    expect(row).not.toHaveProperty("log_flavours_resolved");
  });

  it("falls back to legacy log_flavours when the resolved view is absent", () => {
    const row = applyResolvedFlavoursToLogRow({
      id: "log-2",
      log_flavours: [{ id: 9, flavour_name: "Legacy Only", rating_stars: 3 }],
    });

    expect(row.log_flavours[0]?.flavour_name).toBe("Legacy Only");
  });
});
