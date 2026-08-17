/**
 * Registro global de overlays em tela cheia (modais, formulários).
 *
 * Enquanto houver ao menos um overlay aberto, o rodapé de navegação é
 * removido da árvore — ele não fica atrás nem sobre o formulário, e não
 * interfere na rolagem nem cobre o botão "Salvar Música".
 */

import { useEffect, useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** True quando algum overlay em tela cheia está aberto. */
export function useOverlayOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => count > 0,
    () => false,
  );
}

/** Monta um overlay: esconde o rodapé e trava a rolagem do fundo. */
export function useOverlayLock() {
  useEffect(() => {
    count += 1;
    emit();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      count -= 1;
      emit();
      if (count === 0) document.body.style.overflow = prev;
    };
  }, []);
}
