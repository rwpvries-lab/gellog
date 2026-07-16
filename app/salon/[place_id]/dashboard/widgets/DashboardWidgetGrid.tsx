"use client";

import { createClient } from "@/src/lib/supabase/client";
import { useState } from "react";
import { CustomizeBar } from "./CustomizeBar";
import { LockedPlaceholder } from "./LockedPlaceholder";
import { WIDGET_COMPONENTS } from "./registry";
import {
  DEFAULT_WIDGET_ORDER,
  WIDGET_MIN_TIER,
  WIDGET_PLACEHOLDER_VARIANT,
  WIDGET_TITLES,
  resolveDashboardLayout,
  tierMeets,
  type DashboardData,
  type DashboardLayoutConfig,
  type Tier,
  type WidgetId,
} from "./types";
import { WidgetFrame } from "./WidgetFrame";

type Props = {
  data: DashboardData;
  placeId: string;
  initialDashboardLayout: unknown;
};

export function DashboardWidgetGrid({ data, placeId, initialDashboardLayout }: Props) {
  const [layout, setLayout] = useState<DashboardLayoutConfig>(() =>
    resolveDashboardLayout(initialDashboardLayout),
  );
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function persist(next: DashboardLayoutConfig) {
    setLayout(next);
    setSaving(true);
    const supabase = createClient();
    await supabase.from("salon_profiles").update({ dashboard_layout: next }).eq("place_id", placeId);
    setSaving(false);
  }

  function moveWidget(id: WidgetId, direction: -1 | 1) {
    const idx = layout.order.indexOf(id);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= layout.order.length) return;
    const nextOrder = [...layout.order];
    [nextOrder[idx], nextOrder[swapWith]] = [nextOrder[swapWith], nextOrder[idx]];
    void persist({ ...layout, order: nextOrder });
  }

  function toggleHidden(id: WidgetId) {
    const hidden = layout.hidden.includes(id)
      ? layout.hidden.filter((h) => h !== id)
      : [...layout.hidden, id];
    void persist({ ...layout, hidden });
  }

  function resetToDefault() {
    void persist({ order: [...DEFAULT_WIDGET_ORDER], hidden: [] });
  }

  const visibleIds = isCustomizing
    ? layout.order
    : layout.order.filter((id) => !layout.hidden.includes(id));

  return (
    <div>
      <CustomizeBar
        isCustomizing={isCustomizing}
        saving={saving}
        onToggle={() => setIsCustomizing((v) => !v)}
        onReset={resetToDefault}
      />
      <div className="flex flex-col gap-5">
        {visibleIds.map((id, i) => {
          const Widget = WIDGET_COMPONENTS[id];
          const minTier = WIDGET_MIN_TIER[id];
          const hasAccess = tierMeets(data.tier, minTier);
          const hidden = layout.hidden.includes(id);

          const content = hasAccess ? (
            <Widget data={data} />
          ) : (
            <LockedPlaceholder
              title={WIDGET_TITLES[id]}
              requiredTier={minTier as Exclude<Tier, "free">}
              variant={WIDGET_PLACEHOLDER_VARIANT[id]}
              placeId={placeId}
            />
          );

          if (!isCustomizing) return <div key={id}>{content}</div>;

          return (
            <WidgetFrame
              key={id}
              title={WIDGET_TITLES[id]}
              hidden={hidden}
              isFirst={i === 0}
              isLast={i === visibleIds.length - 1}
              onMoveUp={() => moveWidget(id, -1)}
              onMoveDown={() => moveWidget(id, 1)}
              onToggleHidden={() => toggleHidden(id)}
            >
              {content}
            </WidgetFrame>
          );
        })}
      </div>
    </div>
  );
}
