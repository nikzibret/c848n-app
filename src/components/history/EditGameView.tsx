import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Trash2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Player = { id: string; name: string };
type GameType = { id: string; name: string };

type Props = {
  gameId: string;
  groupId: string;
  onDone: () => void;
};

export function EditGameView({ gameId, groupId, onDone }: Props) {
  const qc = useQueryClient();

  const [gameTypeId, setGameTypeId] = useState("");
  const [playedOn, setPlayedOn] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [vps, setVps] = useState<Record<string, string>>({});
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Player[]>([]);

  const { data: game, isLoading } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select(
          "id, played_on, notes, game_type_id, game_players(player_id, vp, is_winner, players(id,name))",
        )
        .eq("id", gameId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: gameTypes = [] } = useQuery({
    queryKey: ["game_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_types")
        .select("id,name")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as GameType[];
    },
  });

  // Prime local state from fetched game
  useEffect(() => {
    if (!game) return;
    setGameTypeId(game.game_type_id);
    setPlayedOn(new Date(`${game.played_on}T00:00:00`));
    setNotes(game.notes ?? "");
    const parts: Player[] = (game.game_players ?? [])
      .map((gp: any) => gp.players && { id: gp.players.id, name: gp.players.name })
      .filter(Boolean);
    setParticipants(parts);
    const nextVps: Record<string, string> = {};
    let winner: string | null = null;
    (game.game_players ?? []).forEach((gp: any) => {
      nextVps[gp.player_id] = String(gp.vp);
      if (gp.is_winner) winner = gp.player_id;
    });
    setVps(nextVps);
    setWinnerId(winner);
  }, [game]);

  const canSave = useMemo(
    () =>
      !!gameTypeId &&
      participants.length >= 2 &&
      participants.every((p) => vps[p.id] !== undefined && vps[p.id] !== ""),
    [gameTypeId, participants, vps],
  );

  const save = useMutation({
    mutationFn: async () => {
      const { error: gErr } = await supabase
        .from("games")
        .update({
          game_type_id: gameTypeId,
          played_on: format(playedOn, "yyyy-MM-dd"),
          notes: notes.trim() || null,
        })
        .eq("id", gameId);
      if (gErr) throw gErr;

      // Update each game_player row (participants are fixed from original game)
      for (const p of participants) {
        const { error } = await supabase
          .from("game_players")
          .update({
            vp: Number(vps[p.id] ?? "0") || 0,
            is_winner: p.id === winnerId,
          })
          .eq("game_id", gameId)
          .eq("player_id", p.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Game updated");
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game", gameId] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("games").delete().eq("id", gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Game deleted");
      qc.invalidateQueries({ queryKey: ["games"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !game) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading game…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onDone} className="-ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to history
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Game</CardTitle>
          <CardDescription>Update the saved details below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Game Type</Label>
            <Select value={gameTypeId} onValueChange={setGameTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select game type" />
              </SelectTrigger>
              <SelectContent>
                {gameTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
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
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Victory Points</CardTitle>
          <CardDescription>Tap the trophy to change the winner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {participants.map((p) => {
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
                  onClick={() => setWinnerId(p.id)}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything memorable?"
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          disabled={!canSave || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              disabled={del.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete game
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this game?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the game and every player's score for
                it. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => del.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {/* groupId reserved for future participant edits */}
      <input type="hidden" value={groupId} readOnly />
    </div>
  );
}
