import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/src/lib/supabase/client";
import { FlavourBuilderModal } from "./FlavourBuilderModal";

vi.mock("@/src/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("FlavourBuilderModal", () => {
  const onSave = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves catalogue tokens when the name field loses focus", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          flavour_id: "fl-1",
          base_token: "strawberry-pink",
          drizzle_token: "none",
          crumble_token: "none",
          source: "catalogue",
        },
      ],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue({ rpc } as never);

    render(
      <FlavourBuilderModal placeId="ChIJ123" onSave={onSave} onClose={onClose} />,
    );

    fireEvent.change(screen.getByLabelText(/flavour name/i), {
      target: { value: "Mango Sorbet" },
    });
    fireEvent.blur(screen.getByLabelText(/flavour name/i));

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith("resolve_flavour_tokens", {
        input: "Mango Sorbet",
      });
      expect(
        screen.getByText(/matched from the gelato catalogue/i),
      ).toBeInTheDocument();
    });
  });

  it("inserts a vitrine flavour and promotes tokens to the owner catalogue", async () => {
    const savedRow = {
      id: "vf-1",
      name: "Mango Sorbet",
      colour: "#E8865A",
      base_token: "mango-orange",
      drizzle_token: "none",
      crumble_token: "none",
      is_exclusive: false,
      is_brand_new: true,
      is_vegan: true,
    };

    const maybeSingle = vi.fn().mockResolvedValue({ data: savedRow, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const insert = vi.fn().mockReturnValue({ select });
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });

    vi.mocked(createClient).mockReturnValue({
      rpc,
      from: vi.fn().mockReturnValue({ insert }),
    } as never);

    render(
      <FlavourBuilderModal placeId="ChIJ123" onSave={onSave} onClose={onClose} />,
    );

    fireEvent.change(screen.getByLabelText(/flavour name/i), {
      target: { value: "Mango Sorbet" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add flavour/i }));

    await waitFor(() => {
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          salon_place_id: "ChIJ123",
          name: "Mango Sorbet",
          is_visible: true,
        }),
      );
    });

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith("upsert_owner_flavour_catalogue", {
        p_name: "Mango Sorbet",
        p_base_token: "cream",
        p_drizzle_token: "none",
        p_crumble_token: "none",
      });
      expect(onSave).toHaveBeenCalledWith(savedRow);
    });
  });

  it("updates an existing flavour instead of inserting", async () => {
    const existing = {
      id: "vf-9",
      name: "Pistachio",
      colour: "#93C572",
      base_token: "pistachio-green",
      drizzle_token: "none",
      crumble_token: "none",
      is_exclusive: false,
      is_brand_new: false,
      is_vegan: false,
    };

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { ...existing, name: "Pistachio Deluxe" },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle }) });
    const update = vi.fn().mockReturnValue({ eq });
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });

    vi.mocked(createClient).mockReturnValue({
      rpc,
      from: vi.fn().mockReturnValue({ update }),
    } as never);

    render(
      <FlavourBuilderModal
        placeId="ChIJ123"
        existingFlavour={existing}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText(/flavour name/i), {
      target: { value: "Pistachio Deluxe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update flavour/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          salon_place_id: "ChIJ123",
          name: "Pistachio Deluxe",
        }),
      );
      expect(eq).toHaveBeenCalledWith("id", "vf-9");
      expect(onSave).toHaveBeenCalled();
    });
  });
});
