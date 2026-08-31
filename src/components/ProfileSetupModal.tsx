import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import {
  FUNCOES_MUSICAIS,
  TIMBRES_VOCAIS,
  TIMBRE_NAO_SE_APLICA,
  exigeTimbreVocal,
  updateProfile,
} from "@/lib/db";

export function ProfileSetupModal({
  userId,
  nomeSugerido,
}: {
  userId: string;
  nomeSugerido?: string | null;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(nomeSugerido ?? "");
  const [funcoes, setFuncoes] = useState<string[]>([]);
  const [timbre, setTimbre] = useState("");

  const precisaTimbre = exigeTimbreVocal(funcoes);
  const valido = nome.trim().length > 0 && funcoes.length > 0 && (!precisaTimbre || !!timbre);

  const salvar = useMutation({
    mutationFn: () =>
      updateProfile(userId, {
        nome_completo: nome.trim(),
        funcoes,
        funcao_vocal: precisaTimbre ? timbre : TIMBRE_NAO_SE_APLICA,
        perfil_configurado: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Perfil configurado! Bem-vindo ao ministério.");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar seu perfil."),
  });

  function toggleFuncao(f: string) {
    setFuncoes((prev) => {
      const next = prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f];
      // Se a nova seleção não exige mais timbre, limpa a escolha anterior.
      if (!exigeTimbreVocal(next)) setTimbre("");
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-background p-6 shadow-elegant">
        <h1 className="font-sans font-bold text-2xl text-foreground">Configure seu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Antes de continuar, conte pra gente quem você é e como participa do ministério.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valido) salvar.mutate();
          }}
          className="mt-6 space-y-5"
        >
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Nome
            </span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
              autoFocus
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Função (selecione uma ou mais)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {FUNCOES_MUSICAIS.map((f) => {
                const checked = funcoes.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFuncao(f)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                      checked
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-foreground"
                    }`}
                  >
                    <span
                      className={`grid size-4 shrink-0 place-items-center rounded-[5px] border ${
                        checked ? "border-accent bg-accent text-accent-foreground" : "border-border"
                      }`}
                    >
                      {checked && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Classificação de timbre de voz
              {!precisaTimbre && " (não se aplica)"}
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

          <button
            type="submit"
            disabled={!valido || salvar.isPending}
            className="w-full rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40"
          >
            {salvar.isPending ? "Salvando…" : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
