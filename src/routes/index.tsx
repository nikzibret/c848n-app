import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupTab } from "@/components/setup/SetupTab";
import { NewGameTab } from "@/components/new-game/NewGameTab";
import { HistoryTab } from "@/components/history/HistoryTab";
import { C848NWordmark } from "@/components/C848NWordmark";
import { AuthGate } from "@/components/auth/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import {
  DieIcon,
  ScrollIcon,
  BrickIcon,
  HexTilesIcon,
} from "@/components/icons/NavIcons";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGate>
      <App />
    </AuthGate>
  ),
});

type Tab = "new" | "history" | "setup" | "dashboard";

function App() {
  const [tab, setTab] = useState<Tab>("new");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center justify-between">
          <C848NWordmark className="text-2xl font-bold text-primary" />
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            aria-label="Sign out"
            className="text-primary/80 hover:text-primary transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-24">
        {tab === "new" && <NewGameTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "setup" && <SetupTab />}
        {tab === "dashboard" && <DashboardTab />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-border bg-background">
        <div className="mx-auto max-w-md grid grid-cols-4">
          <TabButton active={tab === "new"} onClick={() => setTab("new")} icon={<DieIcon className="h-5 w-5" />} label="New Game" />
          <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={<ScrollIcon className="h-5 w-5" />} label="History" />
          <TabButton active={tab === "setup"} onClick={() => setTab("setup")} icon={<BrickIcon className="h-5 w-5" />} label="Setup" />
          <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={<HexTilesIcon className="h-5 w-5" />} label="Dashboard" />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
        active ? "text-primary" : "text-foreground/70 hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}








function DashboardTab() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="rounded-full bg-background/80 p-6">
        <LayoutDashboard className="h-10 w-10 text-foreground/70" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Cross-Group Stats</h2>
        <p className="text-sm text-foreground/70 max-w-xs">
          Coming soon — compare player performance across all your groups.
        </p>
      </div>
    </div>
  );
}
