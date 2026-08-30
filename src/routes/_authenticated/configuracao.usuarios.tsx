import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Pencil, ShieldCheck, ShieldOff, X } from "lucide-react";
import { AppShell, AppHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  FUNCOES_MUSICAIS,
  TIMBRES_VOCAIS,
  TIMBRE_NAO_SE_APLICA,
  exigeTimbreVocal,
  getProfile,
  iniciaisDe,
  listProfiles,
  setProfileRole,
  updateProfile,
  type PermissionRole,
  type Profile,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/configuracao/usuarios")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const profile = await getProfile(data.user.id);
    if (profile?.role !== "master") throw redirect({ to: "/perfil" });
  },
  head: () => ({
    meta: [{ title: "Usuários — Portal Adoração" }],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Profile | null>(null);
  const [confirmRole, setConfirmRole] = useState<{ profile: Profile; role: PermissionRole } | null>(
    null,
  );

  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: listProfiles,
  });

  const masters = perfis.filter((p) => p.role === "master");

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const salvarEdicao = useMutation({
    mutationFn: (input: { id: string; patch: Parameters<typeof updateProfile>[1] }) =>
      updateProfile(input.id, input.patch),
    onSuccess: () => {
      invalidateAll();
      setEditando(null);
      toast.success("Perfil atualizado.");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar."),
  });

  const alterarRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: PermissionRole }) => setProfileRole(id, role),
    onSuccess: (_d, vars) => {
      invalidateAll();
      setConfirmRole(null);
      toast.success(vars.role === "master" ? "Usuário promovido a Master." : "Usuário definido como Padrão.");
    },
    onError: (e: Error) => {
      // A proteção do último Master e a checagem de permissão acontecem no
      // banco (RLS + trigger); qualquer erro chega aqui já com uma mensagem.
      toast.error(e.message || "Não foi possível alterar a permissão.");
      setConfirmRole(null);
    },
  });

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <Link
          to="/configuracao"
          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          <ChevronLeft className="size-3.5" /> Configuração
        </Link>
      </div>
      <AppHeader
        title="Usuários"
        subtitle={`${perfis.length} ${perfis.length === 1 ? "integrante" : "integrantes"} no ministério`}
      />

      <main className="space-y-3 px-4">
        {isLoading && (
          <p className="py-8 text-center text-xs text-muted-foreground">Carregando…</p>
        )}

        {!isLoading && perfis.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Nenhum usuário cadastrado ainda.
          </p>
        )}

        {perfis.map((p) => (
          <div key={p.id} className="rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-serif text-sm italic text-primary-foreground">
                {iniciaisDe(p.nome_completo)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.nome_completo || "Sem nome"}</p>
                <p className="truncate text-xs text-muted-foreground">{p.email || "—"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.funcoes.length === 0 && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      Sem função definida
                    </span>
                  )}
                  {p.funcoes.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {f}
                    </span>
                  ))}
                  {p.funcao_vocal && p.funcao_vocal !== TIMBRE_NAO_SE_APLICA && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      {p.funcao_vocal}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEditando(p)}
                className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  p.role === "master"
                    ? "bg-accent/10 text-accent"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {p.role === "master" ? <ShieldCheck className="size-3" /> : <ShieldOff className="size-3" />}
                {p.role === "master" ? "Master" : "Padrão"}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  p.perfil_configurado
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {p.perfil_configurado ? "Ativo" : "Pendente"}
              </span>
            </div>
          </div>
        ))}
      </main>

      {editando && (
        <EditarUsuarioModal
          perfil={editando}
          isOnlyMaster={editando.role === "master" && masters.length <= 1}
          onClose={() => setEditando(null)}
          onSave={(patch) => salvarEdicao.mutate({ id: editando.id, patch })}
          onRequestRoleChange={(role) => setConfirmRole({ profile: editando, role })}
          pending={salvarEdicao.isPending}
        />
      )}

      {confirmRole && (
        <ConfirmDialog
          titulo="Alterar nível de acesso?"
          mensagem={`Você está prestes a ${
            confirmRole.role === "master" ? "tornar" : "remover o acesso de"
          } "${confirmRole.profile.nome_completo || confirmRole.profile.email}" ${
            confirmRole.role === "master" ? "Master" : "Padrão"
          }. Deseja continuar?`}
          pending={alterarRole.isPending}
          onCancel={() => setConfirmRole(null)}
          onConfirm={() => alterarRole.mutate({ id: confirmRole.profile.id, role: confirmRole.role })}
        />
      )}
    </AppShell>
  );
}

function EditarUsuarioModal({
  perfil,
  isOnlyMaster,
  onClose,
  onSave,
  onRequestRoleChange,
  pending,
}: {
  perfil: Profile;
  isOnlyMaster: boolean;
  onClose: () => void;
  onSave: (patch: Parameters<typeof updateProfile>[1]) => void;
  onRequestRoleChange: (role: PermissionRole) => void;
  pending: boolean;
}) {
  const [nome, setNome] = useState(perfil.nome_completo ?? "");
  const [funcoes, setFuncoes] = useState<string[]>(perfil.funcoes ?? []);
  const [timbre, setTimbre] = useState(
    perfil.funcao_vocal && perfil.funcao_vocal !== TIMBRE_NAO_SE_APLICA ? perfil.funcao_vocal : "",
  );

  const precisaTimbre = exigeTimbreVocal(funcoes);
  const valido = nome.trim().length > 0;

  function toggleFuncao(f: string) {
    setFuncoes((prev) => {
      const next = prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f];
      if (!exigeTimbreVocal(next)) setTimbre("");
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-6 shadow-elegant sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl italic">Editar usuário</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Nome
            </span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Funções musicais
            </span>
            <div className="grid grid-cols-2 gap-2">
              {FUNCOES_MUSICAIS.map((f) => {
                const checked = funcoes.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFuncao(f)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-medium ${
                      checked
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Timbre vocal {!precisaTimbre && "(não se aplica)"}
            </span>
            <select
              value={timbre}
              onChange={(e) => setTimbre(e.target.value)}
              disabled={!precisaTimbre}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-50"
            >
              <option value="">{precisaTimbre ? "Selecione…" : TIMBRE_NAO_SE_APLICA}</option>
              {TIMBRES_VOCAIS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <div className="border-t border-border pt-4">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Permissão
            </span>
            <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
              <span className="text-sm font-medium">
                {perfil.role === "master" ? "Master" : "Padrão"}
              </span>
              {perfil.role === "master" ? (
                <button
                  type="button"
                  disabled={isOnlyMaster}
                  onClick={() => onRequestRoleChange("padrao")}
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground disabled:opacity-40"
                  title={isOnlyMaster ? "É o único Master — promova outro antes de rebaixar este." : undefined}
                >
                  Tornar Padrão
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onRequestRoleChange("master")}
                  className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground"
                >
                  Tornar Master
                </button>
              )}
            </div>
            {isOnlyMaster && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Este é o único Master do sistema. Promova outro integrante antes de rebaixá-lo.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!valido || pending}
            onClick={() =>
              onSave({
                nome_completo: nome.trim(),
                funcoes,
                funcao_vocal: precisaTimbre ? timbre || null : TIMBRE_NAO_SE_APLICA,
              })
            }
            className="w-full rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40"
          >
            {pending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  titulo,
  mensagem,
  pending,
  onCancel,
  onConfirm,
}: {
  titulo: string;
  mensagem: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-background p-6 shadow-elegant">
        <h3 className="font-serif text-lg italic">{titulo}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{mensagem}</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40"
          >
            {pending ? "Aplicando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
