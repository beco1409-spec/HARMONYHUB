import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Music2,
  Settings,
  LogOut,
  ChevronRight,
  Star,
  Shield,
  Camera,
  Pencil,
  Trash2,
  History,
  X,
  Plus,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, AppHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useMyRoles } from "@/hooks/use-auth";
import {
  createCantor,
  deleteCantorTom,
  formatCultoDataCurta,
  formatHora,
  getAvatarSignedUrl,
  getMeuCantor,
  getMeuInstrumentista,
  getProfile,
  iniciaisDe,
  listCantores,
  listFavoritos,
  listMinhasParticipacoes,
  listMusicas,
  listTonsCantor,
  removeFavorito,
  updateCantor,
  updateCantorTom,
  updateProfile,
  uploadAvatar,
  upsertCantorTom,
} from "@/lib/db";
import { transposeTom } from "@/lib/transpose";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Portal Adoração" },
      { name: "description", content: "Seu perfil, tom preferido por música e configurações do ministério." },
    ],
  }),
  component: PerfilPage,
});

const roleLabels: Record<string, string> = {
  lider: "Líder",
  cantor: "Cantor",
  instrumentista: "Instrumentista",
  membro: "Membro",
};

const FUNCOES_VOCAIS = ["Soprano", "Contralto", "Tenor", "Barítono", "Baixo"];

function PerfilPage() {
  const { user } = useAuth();
  const roles = useMyRoles(user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState("");
  const [telefone, setTelefone] = useState("");
  const [vincularOpen, setVincularOpen] = useState(false);
  const [favoritosOpen, setFavoritosOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [novoTom, setNovoTom] = useState({ musicaId: "", tom: "G" });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
  });

  const { data: meuCantor } = useQuery({
    queryKey: ["meu-cantor", user?.id],
    queryFn: () => getMeuCantor(user!.id),
    enabled: !!user,
  });

  const { data: meuInstrumentista } = useQuery({
    queryKey: ["meu-instrumentista", user?.id],
    queryFn: () => getMeuInstrumentista(user!.id),
    enabled: !!user,
  });

  const { data: tons = [] } = useQuery({
    queryKey: ["meus-tons", meuCantor?.id],
    queryFn: () => listTonsCantor(meuCantor!.id),
    enabled: !!meuCantor?.id,
  });

  const { data: participacoes = [] } = useQuery({
    queryKey: ["participacoes", meuCantor?.id, meuInstrumentista?.id],
    queryFn: () =>
      listMinhasParticipacoes({
        cantorId: meuCantor?.id,
        instrumentistaId: meuInstrumentista?.id,
      }),
    enabled: !!(meuCantor?.id || meuInstrumentista?.id),
  });

  const { data: favoritos = [] } = useQuery({
    queryKey: ["favoritos", user?.id],
    queryFn: () => listFavoritos(user!.id),
    enabled: !!user,
  });

  const { data: musicas = [] } = useQuery({
    queryKey: ["musicas"],
    queryFn: listMusicas,
    enabled: !!meuCantor?.id,
  });

  const { data: avatarUrl } = useQuery({
    queryKey: ["avatar-url", profile?.avatar_url],
    queryFn: () => getAvatarSignedUrl(profile?.avatar_url ?? null),
    enabled: !!profile,
  });

  const iniciarEdicao = () => {
    setNome(profile?.nome_completo ?? "");
    setFuncao(profile?.funcao_vocal ?? "");
    setTelefone(profile?.telefone ?? "");
    setEditando(true);
  };

  const salvarPerfil = useMutation({
    mutationFn: () =>
      updateProfile(user!.id, {
        nome_completo: nome.trim(),
        funcao_vocal: funcao || null,
        telefone: telefone.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      setEditando(false);
      toast.success("Perfil atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enviarFoto = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadAvatar(user!.id, file);
      await updateProfile(user!.id, { avatar_url: path });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Foto atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleNotif = useMutation({
    mutationFn: (ativa: boolean) =>
      updateProfile(user!.id, { notificacoes_ativas: ativa }),
    onSuccess: (_d, ativa) => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success(ativa ? "Notificações ativadas" : "Notificações desativadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mudarTom = useMutation({
    mutationFn: ({ id, tom, delta }: { id: string; tom: string; delta: 1 | -1 }) =>
      updateCantorTom(id, transposeTom(tom, delta)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meus-tons", meuCantor?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removerTom = useMutation({
    mutationFn: (id: string) => deleteCantorTom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meus-tons", meuCantor?.id] });
      toast.success("Tom removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adicionarTom = useMutation({
    mutationFn: () => upsertCantorTom(meuCantor!.id, novoTom.musicaId, novoTom.tom),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meus-tons", meuCantor?.id] });
      setNovoTom({ musicaId: "", tom: "G" });
      toast.success("Tom registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vincular = useMutation({
    mutationFn: (cantorId: string) => updateCantor(cantorId, { user_id: user!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meu-cantor", user?.id] });
      setVincularOpen(false);
      toast.success("Perfil de cantor vinculado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarEVincular = useMutation({
    mutationFn: () =>
      createCantor({
        nome: profile?.nome_completo || "Meu perfil",
        voz: profile?.funcao_vocal || null,
        user_id: user!.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meu-cantor", user?.id] });
      qc.invalidateQueries({ queryKey: ["cantores"] });
      setVincularOpen(false);
      toast.success("Perfil de cantor criado e vinculado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removerFav = useMutation({
    mutationFn: (musicaId: string) => removeFavorito(user!.id, musicaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favoritos", user?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const trocarSenha = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovaSenha("");
      toast.success("Senha atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta");
    navigate({ to: "/auth", replace: true });
  }

  const nomeExibido = profile?.nome_completo || "";
  const iniciais = iniciaisDe(nomeExibido || user?.email);
  const rolesLabel = roles.length
    ? roles.map((r) => roleLabels[r] ?? r).join(" • ")
    : "Membro do ministério";
  const notifAtiva = profile?.notificacoes_ativas ?? true;

  const musicasFavoritas = musicas.filter((m) => favoritos.includes(m.id));

  return (
    <AppShell>
      <AppHeader eyebrow="Perfil" title={nomeExibido || "Seu perfil"} subtitle={rolesLabel} />

      <main className="space-y-4 px-4">
        {/* Cartão do perfil */}
        <section className="rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid size-16 place-items-center overflow-hidden rounded-full bg-primary font-serif text-2xl italic text-primary-foreground">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" className="size-full object-cover" />
                ) : (
                  iniciais
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={enviarFoto.isPending}
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-accent text-accent-foreground shadow-glow"
              >
                <Camera className="size-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) enviarFoto.mutate(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Classificação vocal
              </p>
              <p className="font-serif text-lg italic">
                {profile?.funcao_vocal || "Não definida"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <button
              onClick={iniciarEdicao}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
          </div>

          {editando && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Nome completo
                </span>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Classificação vocal
                  </span>
                  <select
                    value={funcao}
                    onChange={(e) => setFuncao(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-2 py-2.5 text-sm outline-none focus:border-accent"
                  >
                    <option value="">—</option>
                    {FUNCOES_VOCAIS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Telefone
                  </span>
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditando(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => salvarPerfil.mutate()}
                  disabled={!nome.trim() || salvarPerfil.isPending}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
                >
                  {salvarPerfil.isPending ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
          )}

          {roles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent"
                >
                  <Shield className="size-3" />
                  {roleLabels[r] ?? r}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Meus tons preferidos */}
        <section className="rounded-3xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Meus tons preferidos
          </h3>
          {!meuCantor ? (
            <div className="py-2 text-center">
              <p className="text-xs text-muted-foreground">
                Vincule seu perfil de cantor para registrar os tons em que você canta cada música.
              </p>
              <button
                onClick={() => setVincularOpen(true)}
                className="mt-3 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground"
              >
                Vincular perfil de cantor
              </button>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {tons.length === 0 && (
                  <li className="py-2 text-center text-xs text-muted-foreground">
                    Nenhum tom registrado ainda.
                  </li>
                )}
                {tons.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
                    <Music2 className="size-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.musica?.nome ?? "—"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => mudarTom.mutate({ id: t.id, tom: t.tom, delta: -1 })}
                        className="grid size-6 place-items-center rounded-md bg-secondary text-xs font-bold"
                      >
                        −
                      </button>
                      <span className="w-8 rounded-md bg-accent/10 py-0.5 text-center font-mono text-xs font-bold text-accent">
                        {t.tom}
                      </span>
                      <button
                        onClick={() => mudarTom.mutate({ id: t.id, tom: t.tom, delta: 1 })}
                        className="grid size-6 place-items-center rounded-md bg-secondary text-xs font-bold"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removerTom.mutate(t.id)}
                        className="ml-1 grid size-6 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (novoTom.musicaId) adicionarTom.mutate();
                }}
                className="mt-3 flex items-center gap-2"
              >
                <select
                  value={novoTom.musicaId}
                  onChange={(e) => setNovoTom({ ...novoTom, musicaId: e.target.value })}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-2 py-2 text-xs outline-none focus:border-accent"
                >
                  <option value="">Adicionar música…</option>
                  {musicas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
                <input
                  value={novoTom.tom}
                  onChange={(e) => setNovoTom({ ...novoTom, tom: e.target.value })}
                  className="w-14 rounded-xl border border-border bg-background px-2 py-2 text-center font-mono text-xs outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={!novoTom.musicaId || adicionarTom.isPending}
                  className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </form>
            </>
          )}
        </section>

        {/* Histórico de participação */}
        <section className="rounded-3xl border border-border bg-surface p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <History className="size-3.5" /> Histórico de participação
          </h3>
          {!meuCantor && !meuInstrumentista ? (
            <p className="text-xs text-muted-foreground">
              Vincule seu perfil de cantor para ver seu histórico.
            </p>
          ) : participacoes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma participação registrada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {participacoes.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.culto?.nome ?? "—"}</p>
                    <p className="text-[10px] capitalize text-muted-foreground">
                      {p.culto ? `${formatCultoDataCurta(p.culto.data)} • ${formatHora(p.culto.hora)}` : ""}
                      {` • ${p.funcao}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      p.status === "confirmado"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : p.status === "recusado"
                          ? "bg-rose-500/10 text-rose-600"
                          : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Menu */}
        <section className="rounded-3xl border border-border bg-surface p-2">
          <div className="flex w-full items-center gap-3 rounded-2xl p-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
              <Bell className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium">Notificações</span>
            <button
              onClick={() => toggleNotif.mutate(!notifAtiva)}
              className={`relative h-6 w-11 rounded-full transition ${notifAtiva ? "bg-accent" : "bg-secondary"}`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                  notifAtiva ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <button
            onClick={() => setFavoritosOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-secondary/50"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
              <Star className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium">Favoritos</span>
            <span className="text-xs text-muted-foreground">
              {favoritos.length} {favoritos.length === 1 ? "música" : "músicas"}
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setConfigOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-secondary/50"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
              <Settings className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium">Configurações</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-secondary/50"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
              <LogOut className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium">Sair</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </section>
      </main>

      {/* Sheet: vincular cantor */}
      {vincularOpen && (
        <VincularSheet
          onClose={() => setVincularOpen(false)}
          onPick={(id) => vincular.mutate(id)}
          onCreate={() => criarEVincular.mutate()}
          pending={vincular.isPending || criarEVincular.isPending}
        />
      )}

      {/* Sheet: favoritos */}
      {favoritosOpen && (
        <Sheet title="Músicas favoritas" onClose={() => setFavoritosOpen(false)}>
          {musicasFavoritas.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Marque músicas com a estrela na biblioteca.
            </p>
          ) : (
            <ul className="space-y-2 px-5 pb-4">
              {musicasFavoritas.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
                  <Music2 className="size-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{m.autor || "—"}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-accent">
                    {m.tom_original ?? "—"}
                  </span>
                  <button
                    onClick={() => removerFav.mutate(m.id)}
                    className="grid size-7 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      )}

      {/* Sheet: configurações */}
      {configOpen && (
        <Sheet title="Configurações" onClose={() => setConfigOpen(false)}>
          <div className="space-y-4 px-5 pb-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (novaSenha.length >= 6) trocarSenha.mutate();
              }}
              className="space-y-2"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Alterar senha
              </p>
              <input
                type="password"
                minLength={6}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Nova senha (mín. 6 caracteres)"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={novaSenha.length < 6 || trocarSenha.isPending}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40"
              >
                {trocarSenha.isPending ? "Atualizando…" : "Atualizar senha"}
              </button>
            </form>
            <div className="border-t border-border pt-3 text-center text-[10px] text-muted-foreground">
              Portal Adoração • Ministério de Louvor
            </div>
          </div>
        </Sheet>
      )}
    </AppShell>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background pb-8 pt-4 shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="font-serif text-lg italic">{title}</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function VincularSheet({
  onClose,
  onPick,
  onCreate,
  pending,
}: {
  onClose: () => void;
  onPick: (cantorId: string) => void;
  onCreate: () => void;
  pending: boolean;
}) {
  const { data: cantores = [] } = useQuery({ queryKey: ["cantores"], queryFn: listCantores });
  const livres = cantores.filter((c) => !c.user_id);

  return (
    <Sheet title="Vincular perfil de cantor" onClose={onClose}>
      <ul className="max-h-[40vh] space-y-1 overflow-y-auto px-3 pb-3">
        {livres.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onPick(c.id)}
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-secondary disabled:opacity-50"
            >
              <div className="grid size-9 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {iniciaisDe(c.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.nome}</p>
                <p className="text-[11px] text-muted-foreground">{c.voz || "—"}</p>
              </div>
            </button>
          </li>
        ))}
        {livres.length === 0 && (
          <li className="p-4 text-center text-xs text-muted-foreground">
            Nenhum cantor disponível para vincular.
          </li>
        )}
      </ul>
      <div className="px-5 pt-2">
        <button
          onClick={onCreate}
          disabled={pending}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground disabled:opacity-50"
        >
          <Plus className="size-3.5" /> Criar meu perfil de cantor
        </button>
      </div>
    </Sheet>
  );
}
