import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LAST_GROUP_KEY = "c848n:lastGroupId";

type Group = { id: string; name: string };
type GameType = { id: string; name: string };
type Player = { id: string; name: string };

export function NewGameTab() {
  const qc = useQueryClient();

  const [groupId, setGroupId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(LAST_GROUP_KEY) ?? "";
  });
  const [gameTypeId, setGameTypeId] = useState<string>("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [vps, setVps] = useState<Record<string, string>>({});
  const [winnerOverride, setWinnerOverride] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [playedOn, setPlayedOn] = useState<Date>(new Date());

  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id,name,is_archived")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Group[];
    },
  });

  const { data: gameTypes = [] } = useQuery({
    queryKey: ["game_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_types")
        .select("id,name,is_archived")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as GameType[];
    },
  });

  // Persist / validate last-selected group
  useEffect(() => {
    if (groupId && !groups.some((g) => g.id === groupId)) {
      setGroupId("");
    }
  }, [groups, groupId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (groupId) window.localStorage.setItem(LAST_GROUP_KEY, groupId);
  }, [groupId]);

  const { data: members = [] } = useQuery({
    queryKey: ["group_members_full", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("player_id, players!inner(id, name, is_archived)")
        .eq("group_id", groupId);
      if (error) throw error;
      return (data ?? [])
        .map((r: { players: { id: string; name: string; is_archived: boolean } | null }) => r.players)
        .filter((p): p is Player & { is_archived: boolean } => !!p && !p.is_archived)
        .map((p) => ({ id: p.id, name: p.name })) as Player[];
    },
  });

  // When group / members change, pre-check all members and reset VPs.
  useEffect(() => {
    setChecked(new Set(members.map((m) => m.id)));
    setVps({});
    setWinnerOverride(null);
  }, [groupId, members]);

  const activePlayers = useMemo(
    () => members.filter((m) => checked.has(m.id)),
    [members, checked],
  );

  const toggleChecked = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 2) {
          toast.error("At least 2 players must play.");
          return prev;
        }
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (winnerOverride === id) setWinnerOverride(null);
  };

  // Winner logic
  const { topScore, tiedIds, winnerId } = useMemo(() => {
    if (activePlayers.length === 0) {
      return { topScore: null as number | null, tiedIds: [] as string[], winnerId: null as string | null };
    }
    const scored = activePlayers.map((p) => ({
      id: p.id,
      vp: Number(vps[p.id] ?? "0") || 0,
    }));
    const top = Math.max(...scored.map((s) => s.vp));
    const tied = scored.filter((s) => s.vp === top).map((s) => s.id);
    // A manual override always wins; otherwise auto-select only when one player is strictly ahead.
    const winner =
      winnerOverride && activePlayers.some((p) => p.id === winnerOverride)
        ? winnerOverride
        : tied.length === 1
          ? tied[0]
          : null;
    return { topScore: top, tiedIds: tied, winnerId: winner };
  }, [activePlayers, vps, winnerOverride]);

  const canSave =
    !!groupId &&
    !!gameTypeId &&
    activePlayers.length >= 2 &&
    activePlayers.every((p) => vps[p.id] !== undefined && vps[p.id] !== "");

  const save = useMutation({
    mutationFn: async () => {
      const { data: game, error: gErr } = await supabase
        .from("games")
        .insert({
          group_id: groupId,
          game_type_id: gameTypeId,
          played_on: format(playedOn, "yyyy-MM-dd"),
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (gErr) throw gErr;

      const rows = activePlayers.map((p) => ({
        game_id: game.id,
        player_id: p.id,
        vp: Number(vps[p.id] ?? "0") || 0,
        is_winner: p.id === winnerId,
      }));
      const { error: pErr } = await supabase.from("game_players").insert(rows);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      toast.success("Game saved");
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game_players"] });
      // Reset form, keep group
      setGameTypeId("");
      setChecked(new Set(members.map((m) => m.id)));
      setVps({});
      setWinnerOverride(null);
      setNotes("");
      setPlayedOn(new Date());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Step 1 & 2 */}
      <Card>
        <CardHeader>
          <CardTitle>New Game</CardTitle>
          <CardDescription>Pick a group and game type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No groups yet
                  </div>
                ) : (
                  groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Game Type</Label>
            <Select value={gameTypeId} onValueChange={setGameTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select game type" />
              </SelectTrigger>
              <SelectContent>
                {gameTypes.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No game types yet
                  </div>
                ) : (
                  gameTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: players */}
      {groupId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Players</CardTitle>
            <CardDescription>
              Tap to remove anyone who didn't play (min 2).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This group has no active members.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = checked.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleChecked(m.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-input",
                      )}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: VPs */}
      {activePlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Victory Points</CardTitle>
            <CardDescription>
              {winnerOverride
                ? "Winner manually selected. Tap another player to change."
                : tiedIds.length > 1
                  ? "Tie — tap a player to set the winner."
                  : "Highest VP is the winner."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activePlayers.map((p) => {
              const isWinner = p.id === winnerId;
              return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-3 py-2",
                      isWinner && "border-accent bg-accent/5",
                    )}
                  >
                  <button
                    type="button"
                    onClick={() => setWinnerOverride(p.id)}
                    className={cn(
                      "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
                      isWinner
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground",
                    )}
                    aria-label={isWinner ? "Winner" : "Set winner"}
                  >
                    <Trophy className="h-4 w-4" />
                  </button>
                  <span className="flex-1 truncate text-sm font-medium">
                    {p.name}
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    className="w-20 text-right"
                    value={vps[p.id] ?? ""}
                    onChange={(e) =>
                      setVps((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    placeholder="VP"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Notes + date */}
      {groupId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(playedOn, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={playedOn}
                    onSelect={(d) => d && setPlayedOn(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything memorable?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={!canSave || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? "Saving..." : "Save Game"}
      </Button>
    </div>
  );
}
