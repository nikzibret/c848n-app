import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EditGameView } from "./EditGameView";

const LAST_GROUP_KEY = "c848n:lastGroupId";

export function HistoryTab() {
  const [groupId, setGroupId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: groups = [] } = useQuery({
    queryKey: ["groups", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id,name")
        .eq("is_archived", false)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (groupId || groups.length === 0) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(LAST_GROUP_KEY) : null;
    const initial = stored && groups.some((g) => g.id === stored) ? stored : groups[0].id;
    setGroupId(initial);
  }, [groups, groupId]);

  const onGroupChange = (v: string) => {
    setGroupId(v);
    if (typeof window !== "undefined") localStorage.setItem(LAST_GROUP_KEY, v);
    setEditingId(null);
  };

  const { data: members = [] } = useQuery({
    queryKey: ["group-members-full", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("player_id, players(id,name)")
        .eq("group_id", groupId);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({ id: m.players.id as string, name: m.players.name as string }));
    },
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, played_on, notes, game_type_id, created_at, game_types(name), game_players(player_id,vp,is_winner,players(name))")
        .eq("group_id", groupId)
        .order("played_on", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalGames = games.length;
  const winCounts = new Map<string, number>();
  members.forEach((m) => winCounts.set(m.id, 0));
  games.forEach((g: any) => {
    g.game_players?.forEach((gp: any) => {
      if (gp.is_winner && winCounts.has(gp.player_id)) {
        winCounts.set(gp.player_id, (winCounts.get(gp.player_id) ?? 0) + 1);
      }
    });
  });
  const leaderboard = members
    .map((m) => ({ ...m, wins: winCounts.get(m.id) ?? 0 }))
    .sort((a, b) => b.wins - a.wins);

  if (editingId && groupId) {
    return (
      <EditGameView
        gameId={editingId}
        groupId={groupId}
        onDone={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Group</CardDescription>
          <Select value={groupId} onValueChange={onGroupChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
      </Card>

      {groupId && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stats</CardTitle>
              <CardDescription>
                {totalGames} game{totalGames === 1 ? "" : "s"} logged
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members in this group.</p>
              ) : (
                <ul className="space-y-1.5">
                  {leaderboard.map((p, i) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground w-5">{i + 1}.</span>
                        <span>{p.name}</span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {p.wins} win{p.wins === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Game History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {games.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No games played in this group yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24 whitespace-nowrap">Date</TableHead>
                      {members.map((m) => (
                        <TableHead key={m.id} className="min-w-[4.5rem] whitespace-nowrap text-center">
                          {m.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.map((g: any) => (
                      <TableRow
                        key={g.id}
                        className="cursor-pointer"
                        onClick={() => setEditingId(g.id)}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm font-medium">{format(new Date(g.played_on), "MMM d")}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(g.played_on), "yyyy")}</div>
                        </TableCell>
                        {members.map((m) => {
                          const gp = g.game_players?.find((p: any) => p.player_id === m.id);
                          return (
                            <TableCell key={m.id} className="text-center">
                              {gp ? (
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  {gp.is_winner && (
                                    <Trophy className="h-3 w-3 text-accent fill-accent" />
                                  )}
                                  <span className={cn(gp.is_winner && "font-medium text-accent-foreground")}>
                                    {gp.vp}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">Total VP</TableCell>
                      {members.map((m) => {
                        const total = games.reduce((sum: number, g: any) => {
                          const gp = g.game_players?.find((p: any) => p.player_id === m.id);
                          return sum + (gp ? gp.vp : 0);
                        }, 0);
                        return (
                          <TableCell key={m.id} className="text-center tabular-nums font-medium">
                            {total}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Wins</TableCell>
                      {members.map((m) => {
                        const wins = games.reduce((count: number, g: any) => {
                          const gp = g.game_players?.find((p: any) => p.player_id === m.id);
                          return count + (gp?.is_winner ? 1 : 0);
                        }, 0);
                        return (
                          <TableCell key={m.id} className="text-center tabular-nums font-medium">
                            {wins}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
