
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  game_type_id UUID NOT NULL REFERENCES public.game_types(id) ON DELETE RESTRICT,
  played_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Public insert games" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update games" ON public.games FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete games" ON public.games FOR DELETE USING (true);

CREATE TABLE public.game_players (
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  vp INTEGER NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_players TO anon, authenticated;
GRANT ALL ON public.game_players TO service_role;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read game_players" ON public.game_players FOR SELECT USING (true);
CREATE POLICY "Public insert game_players" ON public.game_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update game_players" ON public.game_players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete game_players" ON public.game_players FOR DELETE USING (true);

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
