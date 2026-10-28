import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Archive, Users, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Player = { id: string; name: string; is_archived: boolean };
type GameType = { id: string; name: string; is_archived: boolean };
type Group = { id: string; name: string; is_archived: boolean };
type GroupMember = { group_id: string; player_id: string };

export function SetupTab() {
  return (
    <div className="space-y-4">
      <PlayersSection />
      <GroupsSection />
      <GameTypesSection />
    </div>
  );
}

// ---------------- Swipeable row ----------------

function SwipeRow({
  children,
  onArchive,
  onClick,
}: {
  children: React.ReactNode;
  onArchive: () => void;
  onClick?: () => void;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const THRESHOLD = 96;

  const onStart = (x: number) => {
    startX.current = x;
    moved.current = false;
  };
  const onMove = (x: number) => {
    if (startX.current === null) return;
    const delta = Math.min(0, x - startX.current);
    if (Math.abs(delta) > 5) moved.current = true;
    setDx(Math.max(-160, delta));
  };
  const onEnd = () => {
    if (startX.current === null) return;
    if (dx <= -THRESHOLD) {
      onArchive();
      setDx(0);
    } else {
      setDx(0);
    }
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-md border bg-card">
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 bg-destructive px-4 text-destructive-foreground">
        <Archive className="h-4 w-4" />
        <span className="text-sm font-medium">Archive</span>
      </div>
      <div
        className="relative bg-card transition-transform touch-pan-y"
        style={{ transform: `translateX(${dx}px)` }}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => e.buttons === 1 && onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onClick={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onClick?.();
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------- Players ----------------

function PlayersSection() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id,name,is_archived")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Player[];
    },
  });

  const add = useMutation({
    mutationFn: async (n: string) => {
      const { error } = await supabase.from("players").insert({ name: n });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("players")
        .update({ is_archived: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["group_members"] });
      toast.success("Player archived");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    add.mutate(n);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Players</CardTitle>
        <CardDescription>Swipe a row left to archive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add player name"
          />
          <Button type="submit" size="icon" disabled={!name.trim() || add.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">No players yet.</p>
        ) : (
          <div className="space-y-2">
            {players.map((p) => (
              <SwipeRow key={p.id} onArchive={() => archive.mutate(p.id)}>
                <div className="px-4 py-3 text-sm font-medium">{p.name}</div>
              </SwipeRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Game Types ----------------

function GameTypesSection() {
  const qc = useQueryClient();

  const { data: types = [] } = useQuery({
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

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("game_types")
        .update({ is_archived: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["game_types"] });
      toast.success("Game type archived");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Types</CardTitle>
        <CardDescription>e.g. Base Game, Seafarers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {types.length === 0 ? (
          <p className="text-sm text-muted-foreground">No game types yet.</p>
        ) : (
          <div className="space-y-2">
            {types.map((t) => (
              <SwipeRow key={t.id} onArchive={() => archive.mutate(t.id)}>
                <div className="px-4 py-3 text-sm font-medium">{t.name}</div>
              </SwipeRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Groups ----------------

function GroupsSection() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);

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

  const { data: members = [] } = useQuery({
    queryKey: ["group_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id,player_id");
      if (error) throw error;
      return data as GroupMember[];
    },
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("groups")
        .update({ is_archived: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group archived");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const countFor = (gid: string) =>
    members.filter((m) => m.group_id === gid).length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Groups</CardTitle>
            <CardDescription>Tap to edit. Swipe left to archive.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Group
          </Button>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups yet.</p>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <SwipeRow
                  key={g.id}
                  onArchive={() => archive.mutate(g.id)}
                  onClick={() => setEditing(g)}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {countFor(g.id)}
                    </span>
                  </div>
                </SwipeRow>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddGroupDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditGroupDialog
        group={editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </>
  );
}

function usePlayersList() {
  return useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id,name,is_archived")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Player[];
    },
  });
}

function AddGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: players = [] } = usePlayersList();

  useEffect(() => {
    if (!open) {
      setName("");
      setSelected(new Set());
    }
  }, [open]);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .insert({ name: name.trim() })
        .select("id")
        .single();
      if (error) throw error;
      const ids = Array.from(selected);
      if (ids.length > 0) {
        const { error: mErr } = await supabase
          .from("group_members")
          .insert(ids.map((pid) => ({ group_id: data.id, player_id: pid })));
        if (mErr) throw mErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group_members"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            autoFocus
          />
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Members
            </div>
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add players first.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {players.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggle(p.id)}
                    />
                    <span className="text-sm">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditGroupDialog({
  group,
  onOpenChange,
}: {
  group: Group | null;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: players = [] } = usePlayersList();

  const { data: currentMembers = [] } = useQuery({
    queryKey: ["group_members", group?.id],
    enabled: !!group,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("player_id")
        .eq("group_id", group!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.player_id as string);
    },
  });

  useEffect(() => {
    if (group) {
      setName(group.name);
      setSelected(new Set(currentMembers));
    }
  }, [group, currentMembers]);

  const save = useMutation({
    mutationFn: async () => {
      if (!group) return;
      const trimmed = name.trim();
      if (trimmed !== group.name) {
        const { error } = await supabase
          .from("groups")
          .update({ name: trimmed })
          .eq("id", group.id);
        if (error) throw error;
      }
      const current = new Set(currentMembers);
      const toAdd = [...selected].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !selected.has(id));
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("group_members")
          .insert(toAdd.map((pid) => ({ group_id: group.id, player_id: pid })));
        if (error) throw error;
      }
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", group.id)
          .in("player_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group_members"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={!!group} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
          />
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Members
            </div>
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active players available.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {players.map((p) => {
                  const on = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-accent",
                        on && "bg-accent",
                      )}
                    >
                      <span>{p.name}</span>
                      {on ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
