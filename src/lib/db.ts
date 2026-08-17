import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Culto = Database["public"]["Tables"]["cultos"]["Row"];
export type CultoInsert = Database["public"]["Tables"]["cultos"]["Insert"];
export type CultoUpdate = Database["public"]["Tables"]["cultos"]["Update"];

export type Cantor = Database["public"]["Tables"]["cantores"]["Row"];
export type CantorInsert = Database["public"]["Tables"]["cantores"]["Insert"];

export type Instrumentista = Database["public"]["Tables"]["instrumentistas"]["Row"];
export type InstrumentistaInsert = Database["public"]["Tables"]["instrumentistas"]["Insert"];

export type Musica = Database["public"]["Tables"]["musicas"]["Row"];
export type MusicaInsert = Database["public"]["Tables"]["musicas"]["Insert"];
export type MusicaUpdate = Database["public"]["Tables"]["musicas"]["Update"];

export type IntegranteRow = Database["public"]["Tables"]["integrantes_culto"]["Row"];
export type IntegranteInsert = Database["public"]["Tables"]["integrantes_culto"]["Insert"];

export type RepertorioRow = Database["public"]["Tables"]["repertorio_culto"]["Row"];
export type RepertorioInsert = Database["public"]["Tables"]["repertorio_culto"]["Insert"];
export type CantorTom = Database["public"]["Tables"]["cantor_tons"]["Row"];

export type CultoLive = Database["public"]["Tables"]["culto_live"]["Row"];
export type Aviso = Database["public"]["Tables"]["avisos"]["Row"];

export type IntegranteFull = IntegranteRow & {
  cantor: Pick<Cantor, "id" | "nome" | "voz"> | null;
  instrumentista: Pick<Instrumentista, "id" | "nome" | "instrumento"> | null;
};

export type CultoWithIntegrantes = Culto & {
  integrantes_culto: IntegranteFull[];
};

export type RepertorioFull = RepertorioRow & {
  musica: Musica | null;
  cantor: Pick<Cantor, "id" | "nome"> | null;
};

export type ProximoCultoFull = CultoWithIntegrantes & {
  repertorio: RepertorioFull[];
};

export type AvisoFull = Aviso & {
  autor: Pick<Database["public"]["Tables"]["profiles"]["Row"], "nome_completo" | "avatar_url"> | null;
};

function toIniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function iniciaisDe(nome?: string | null) {
  if (!nome) return "?";
  return toIniciais(nome) || "?";
}

// ----- Cultos
export async function listCultos() {
  const { data, error } = await supabase
    .from("cultos")
    .select("*")
    .order("data", { ascending: true })
    .order("hora", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCultoFull(id: string): Promise<CultoWithIntegrantes | null> {
  const { data, error } = await supabase
    .from("cultos")
    .select(
      `*, integrantes_culto(*, cantor:cantores(id,nome,voz), instrumentista:instrumentistas(id,nome,instrumento))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CultoWithIntegrantes | null;
}

export async function getProximoCultoFull(): Promise<ProximoCultoFull | null> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: culto, error } = await supabase
    .from("cultos")
    .select("*")
    .gte("data", hoje)
    .order("data", { ascending: true })
    .order("hora", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!culto) return null;

  const [integrantes, repertorio] = await Promise.all([
    supabase
      .from("integrantes_culto")
      .select("*, cantor:cantores(id,nome,voz), instrumentista:instrumentistas(id,nome,instrumento)")
      .eq("culto_id", culto.id),
    supabase
      .from("repertorio_culto")
      .select("*, musica:musicas(*), cantor:cantores(id,nome)")
      .eq("culto_id", culto.id)
      .order("ordem", { ascending: true }),
  ]);
  if (integrantes.error) throw integrantes.error;
  if (repertorio.error) throw repertorio.error;

  return {
    ...culto,
    integrantes_culto: (integrantes.data ?? []) as IntegranteFull[],
    repertorio: (repertorio.data ?? []) as RepertorioFull[],
  };
}

export async function getCultosSemana(): Promise<Culto[]> {
  const hoje = new Date();
  const fim = new Date(hoje);
  fim.setDate(fim.getDate() + 7);
  const { data, error } = await supabase
    .from("cultos")
    .select("*")
    .gte("data", hoje.toISOString().slice(0, 10))
    .lte("data", fim.toISOString().slice(0, 10))
    .order("data", { ascending: true })
    .order("hora", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCulto(input: CultoInsert) {
  const { data, error } = await supabase.from("cultos").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateCulto(id: string, patch: CultoUpdate) {
  const { data, error } = await supabase
    .from("cultos")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCulto(id: string) {
  const { error } = await supabase.from("cultos").delete().eq("id", id);
  if (error) throw error;
}

// ----- Integrantes do culto
export async function addIntegrante(input: IntegranteInsert) {
  const { data, error } = await supabase
    .from("integrantes_culto")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateIntegrante(
  id: string,
  patch: Database["public"]["Tables"]["integrantes_culto"]["Update"],
) {
  const { error } = await supabase.from("integrantes_culto").update(patch).eq("id", id);
  if (error) throw error;
}

export async function removeIntegrante(id: string) {
  const { error } = await supabase.from("integrantes_culto").delete().eq("id", id);
  if (error) throw error;
}

// ----- Cantores / instrumentistas
export async function listCantores() {
  const { data, error } = await supabase.from("cantores").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function createCantor(input: CantorInsert) {
  const { data, error } = await supabase.from("cantores").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateCantor(id: string, patch: Partial<CantorInsert>) {
  const { error } = await supabase.from("cantores").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCantor(id: string) {
  const { error } = await supabase.from("cantores").delete().eq("id", id);
  if (error) throw error;
}

export async function listInstrumentistas() {
  const { data, error } = await supabase.from("instrumentistas").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function createInstrumentista(input: InstrumentistaInsert) {
  const { data, error } = await supabase
    .from("instrumentistas")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateInstrumentista(id: string, patch: Partial<InstrumentistaInsert>) {
  const { error } = await supabase.from("instrumentistas").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteInstrumentista(id: string) {
  const { error } = await supabase.from("instrumentistas").delete().eq("id", id);
  if (error) throw error;
}

// ----- Músicas (biblioteca)
export async function listMusicas() {
  const { data, error } = await supabase.from("musicas").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

/** Releitura de confirmação: garante que o registro existe mesmo no banco. */
export async function getMusica(id: string) {
  const { data, error } = await supabase
    .from("musicas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}



export async function createMusica(input: MusicaInsert) {
  const { data, error } = await supabase.from("musicas").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateMusica(id: string, patch: MusicaUpdate) {
  const { error } = await supabase.from("musicas").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteMusica(id: string) {
  const { error } = await supabase.from("musicas").delete().eq("id", id);
  if (error) throw error;
}

// ----- Repertório do culto
export async function listRepertorio(cultoId: string): Promise<RepertorioFull[]> {
  const { data, error } = await supabase
    .from("repertorio_culto")
    .select("*, musica:musicas(*), cantor:cantores(id,nome)")
    .eq("culto_id", cultoId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RepertorioFull[];
}

export async function addToRepertorio(input: RepertorioInsert) {
  const { data, error } = await supabase
    .from("repertorio_culto")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateRepertorioItem(
  id: string,
  patch: Database["public"]["Tables"]["repertorio_culto"]["Update"],
) {
  const { error } = await supabase.from("repertorio_culto").update(patch).eq("id", id);
  if (error) throw error;
}

export async function removeRepertorioItem(id: string) {
  const { error } = await supabase.from("repertorio_culto").delete().eq("id", id);
  if (error) throw error;
}

// ----- Modo Culto ao vivo
export type LiveSessionFull = CultoLive & {
  culto: Pick<Culto, "id" | "nome"> | null;
  repertorio: (RepertorioRow & { musica: Musica | null; cantor: Pick<Cantor, "id" | "nome"> | null }) | null;
};

export async function getLiveSession(): Promise<LiveSessionFull | null> {
  const { data, error } = await supabase
    .from("culto_live")
    .select("*, culto:cultos(id,nome), repertorio:repertorio_culto(*, musica:musicas(*), cantor:cantores(id,nome))")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as LiveSessionFull | null;
}

export async function startLive(cultoId: string, repertorioId: string | null) {
  const { data, error } = await supabase
    .from("culto_live")
    .upsert(
      {
        culto_id: cultoId,
        repertorio_id: repertorioId,
        playing: true,
        started_at: new Date().toISOString(),
        ended_at: null,
      },
      { onConflict: "culto_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateLive(
  id: string,
  patch: Database["public"]["Tables"]["culto_live"]["Update"],
) {
  const { error } = await supabase.from("culto_live").update(patch).eq("id", id);
  if (error) throw error;
}

export async function endLive(session: CultoLive, totalMusicas: number) {
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("culto_live")
    .update({ ended_at: agora, playing: false })
    .eq("id", session.id);
  if (error) throw error;
  const { error: hErr } = await supabase.from("culto_historico").insert({
    culto_id: session.culto_id,
    iniciado_em: session.started_at,
    encerrado_em: agora,
    total_musicas: totalMusicas,
  });
  if (hErr) throw hErr;
}

// ----- Avisos
export async function listAvisos(): Promise<AvisoFull[]> {
  const { data, error } = await supabase
    .from("avisos")
    .select("*, autor:profiles(nome_completo, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as AvisoFull[];
}

export async function createAviso(mensagem: string) {
  const { data: userData, error: uErr } = await supabase.auth.getUser();
  if (uErr || !userData.user) throw new Error("Você precisa estar logado para publicar.");
  const { data, error } = await supabase
    .from("avisos")
    .insert({ autor_id: userData.user.id, mensagem })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAviso(id: string) {
  const { error } = await supabase.from("avisos").delete().eq("id", id);
  if (error) throw error;
}

// ----- Favoritos
export async function listFavoritos(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("musica_favoritos")
    .select("musica_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.musica_id);
}

export async function addFavorito(userId: string, musicaId: string) {
  const { error } = await supabase
    .from("musica_favoritos")
    .insert({ user_id: userId, musica_id: musicaId });
  if (error) throw error;
}

export async function removeFavorito(userId: string, musicaId: string) {
  const { error } = await supabase
    .from("musica_favoritos")
    .delete()
    .eq("user_id", userId)
    .eq("musica_id", musicaId);
  if (error) throw error;
}

// ----- Perfil, cantor vinculado e tons
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  patch: Database["public"]["Tables"]["profiles"]["Update"],
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function getMeuCantor(userId: string): Promise<Cantor | null> {
  const { data, error } = await supabase
    .from("cantores")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMeuInstrumentista(userId: string): Promise<Instrumentista | null> {
  const { data, error } = await supabase
    .from("instrumentistas")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type CantorTomFull = CantorTom & {
  musica: Pick<Musica, "id" | "nome"> | null;
};

export async function listTonsCantor(cantorId: string): Promise<CantorTomFull[]> {
  const { data, error } = await supabase
    .from("cantor_tons")
    .select("*, musica:musicas(id,nome)")
    .eq("cantor_id", cantorId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CantorTomFull[];
}

export async function upsertCantorTom(cantorId: string, musicaId: string, tom: string) {
  const { error } = await supabase.from("cantor_tons").upsert(
    { cantor_id: cantorId, musica_id: musicaId, tom },
    { onConflict: "cantor_id,musica_id" },
  );
  if (error) throw error;
}

export async function updateCantorTom(id: string, tom: string) {
  const { error } = await supabase.from("cantor_tons").update({ tom }).eq("id", id);
  if (error) throw error;
}

export async function deleteCantorTom(id: string) {
  const { error } = await supabase.from("cantor_tons").delete().eq("id", id);
  if (error) throw error;
}

// ----- Histórico de participação
export type Participacao = {
  id: string;
  tipo: string;
  funcao: string;
  status: string;
  culto: Pick<Culto, "id" | "nome" | "data" | "hora"> | null;
};

export async function listMinhasParticipacoes(opts: {
  cantorId?: string;
  instrumentistaId?: string;
}): Promise<Participacao[]> {
  const col = opts.cantorId ? "cantor_id" : "instrumentista_id";
  const val = opts.cantorId ?? opts.instrumentistaId;
  if (!val) return [];
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("integrantes_culto")
    .select("id, tipo, funcao, status, culto:cultos!inner(id,nome,data,hora)")
    .eq(col, val)
    .lt("culto.data", hoje)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Participacao[];
  return rows
    .filter((r) => r.culto)
    .sort((a, b) => (b.culto!.data + b.culto!.hora).localeCompare(a.culto!.data + a.culto!.hora));
}

// ----- Avatar (storage)
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function getAvatarSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

// ----- Formatação
export function formatCultoData(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function formatCultoDataCurta(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export function formatHora(hora: string): string {
  return hora.slice(0, 5);
}

export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function duracaoParaSegundos(d?: string | null): number {
  if (!d) return 0;
  const parts = d.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function segundosParaMinutos(total: number): string {
  const min = Math.round(total / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h${String(min % 60).padStart(2, "0")}`;
}
