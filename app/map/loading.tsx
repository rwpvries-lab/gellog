export default function MapLoading() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex flex-none items-center border-b border-zinc-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-zinc-800">
        <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Discover</h1>
      </header>
      <div className="relative flex-1" style={{ background: "#FBF5E8" }}>
        <div className="absolute inset-0 animate-pulse" style={{ background: "#F3E7D0" }} />

        {/* Locate FAB placeholder, same slot as the real button */}
        <div
          className="absolute right-3 flex h-11 w-11 animate-pulse items-center justify-center rounded-full bg-white shadow-md dark:bg-zinc-800"
          style={{ zIndex: 30, marginTop: "env(safe-area-inset-top, 0px)", top: "0.75rem" }}
        />
      </div>
    </div>
  );
}
