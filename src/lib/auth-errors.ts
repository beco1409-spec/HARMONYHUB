export function authErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.toLowerCase();

  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }
  if (m.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.";
  }
  if (m.includes("user not found")) {
    return "Não encontramos uma conta com este e-mail.";
  }
  if (m.includes("password should be at least")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (m.includes("pwned") || m.includes("compromised")) {
    return "Essa senha aparece em vazamentos conhecidos. Escolha outra.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (m.includes("jwt expired") || m.includes("session") && m.includes("expired")) {
    return "Sua sessão expirou. Entre novamente.";
  }
  if (m.includes("invalid email")) {
    return "E-mail inválido.";
  }
  if (m.includes("same password")) {
    return "A nova senha precisa ser diferente da anterior.";
  }
  return raw || "Não foi possível concluir. Tente novamente.";
}
