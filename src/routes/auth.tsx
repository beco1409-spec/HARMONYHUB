import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Portal Adoração" },
      { name: "description", content: "Acesse sua conta do ministério de louvor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/perfil", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate({ to: "/reset-password" });
        return;
      }
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        navigate({ to: "/perfil", replace: true });
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: nome },
          },
        });
        if (error) throw error;
        // Supabase devolve identities vazio quando o e-mail já existe.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error("Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.");
          setMode("signin");
          return;
        }
        if (data.session) {
          toast.success("Conta criada! Bem-vindo.");
        } else {
          setInfo("Conta criada. Confirme seu e-mail pelo link que enviamos para poder entrar.");
          toast.success("Enviamos um e-mail de confirmação.");
          setMode("signin");
        }
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Se existir uma conta com este e-mail, enviamos um link para redefinir a senha.");
        toast.success("E-mail de recuperação enviado.");
      }
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    try {
      // Login com Google direto pelo Supabase Auth (sem o proxy de OAuth da Lovable).
      // Requer o provedor "Google" configurado no seu próprio projeto Supabase
      // (Authentication > Providers > Google, com Client ID/Secret do Google Cloud).
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(authErrorMessage(err));
      setLoading(false);
    }
  }

  const titulo =
    mode === "signin" ? "Bem-vindo de volta" : mode === "signup" ? "Junte-se ao ministério" : "Recuperar senha";
  const subtitulo =
    mode === "signin"
      ? "Entre para ver escalas, cifras e o Modo Culto."
      : mode === "signup"
        ? "Crie sua conta para participar do ministério."
        : "Informe seu e-mail e enviaremos um link para criar uma nova senha.";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
        <Link to="/" className="mb-8 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          ← Voltar
        </Link>
        <h1 className="font-sans font-bold text-4xl text-foreground">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p>

        {info && (
          <p className="mt-4 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
            {info}
          </p>
        )}

        {mode !== "forgot" && (
          <>
            <button
              onClick={onGoogle}
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              <svg className="size-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              Continuar com Google
            </button>

            <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={onSubmit} className={mode === "forgot" ? "mt-8 space-y-3" : "space-y-3"}>
          {mode === "signup" && (
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Nome completo"
              autoComplete="name"
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Senha"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? "Aguarde..."
              : mode === "signin"
                ? "Entrar"
                : mode === "signup"
                  ? "Criar conta"
                  : "Enviar link de recuperação"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setInfo(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signup" ? "Já tem conta? Entrar" : "Não tem conta? Cadastre-se"}
          </button>
          <button
            type="button"
            onClick={() => {
              setInfo(null);
              setMode(mode === "forgot" ? "signin" : "forgot");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "forgot" ? "Voltar ao login" : "Esqueci minha senha"}
          </button>
        </div>
      </div>
    </div>
  );
}
