
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update players" ON public.players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete players" ON public.players FOR DELETE USING (true);

CREATE TABLE public.game_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_types TO anon, authenticated;
GRANT ALL ON public.game_types TO service_role;
ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read game_types" ON public.game_types FOR SELECT USING (true);
CREATE POLICY "Public insert game_types" ON public.game_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update game_types" ON public.game_types FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete game_types" ON public.game_types FOR DELETE USING (true);

CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO anon, authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Public insert groups" ON public.groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update groups" ON public.groups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete groups" ON public.groups FOR DELETE USING (true);

CREATE TABLE public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO anon, authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read group_members" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Public insert group_members" ON public.group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update group_members" ON public.group_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete group_members" ON public.group_members FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_game_types_updated_at BEFORE UPDATE ON public.game_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
