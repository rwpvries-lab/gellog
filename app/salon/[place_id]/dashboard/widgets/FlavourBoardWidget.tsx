import { FlavourBoard } from "../FlavourBoard";
import type { DashboardData } from "./types";

export function FlavourBoardWidget({ data }: { data: DashboardData }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <FlavourBoard
        placeId={data.placeId}
        initialFlavours={data.initialVitrineFlavours}
        initialSuggestions={data.initialSuggestions}
        onVisibilityLogAppend={data.onVisibilityLogAppend}
        onFlavoursSnapshot={data.onFlavoursSnapshot}
      />
    </div>
  );
}
