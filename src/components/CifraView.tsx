import { useMemo } from "react";
import { parseCifra, transposeChord, type CifraLine } from "@/lib/cifra-parser";

/**
 * Renderiza uma cifra já classificada pelo Parser de Cifras:
 * - acordes em laranja (accent) e negrito;
 * - títulos de seção ([Intro], [Refrão]) em cinza;
 * - anotações ((2x), %) em cinza itálico;
 * - letra na cor padrão, intocada.
 *
 * A transposição é sempre calculada a partir do texto ORIGINAL:
 * `parseCifra(text)` roda uma vez (memoizado) e cada render aplica o
 * deslocamento atual sobre os tokens originais — nunca em cadeia.
 */
export function CifraView({
  text,
  semitones = 0,
  className = "",
}: {
  text: string;
  semitones?: number;
  className?: string;
}) {
  const parsed = useMemo(() => parseCifra(text), [text]);
  return (
    <div className={`font-mono text-[13px] leading-relaxed ${className}`}>
      {parsed.lines.map((line, i) => (
        <CifraLineView key={i} line={line} semitones={semitones} />
      ))}
    </div>
  );
}

function CifraLineView({ line, semitones }: { line: CifraLine; semitones: number }) {
  if (line.type === "vazio") {
    return <div className="whitespace-pre">{"\u00A0"}</div>;
  }
  return (
    <div className="whitespace-pre">
      {line.tokens.map((t, i) => {
        const isChord = line.type === "acordes" && t.type === "acorde";
        const content = isChord ? transposeChord(t.text, semitones) : t.text;
        const cls = isChord
          ? "font-bold text-accent"
          : t.type === "titulo"
            ? "font-semibold text-muted-foreground"
            : t.type === "anotacao"
              ? "italic text-muted-foreground"
              : "text-foreground";
        return (
          <span key={i} className={cls}>
            {t.leading}
            {content}
          </span>
        );
      })}
      {line.trailing}
    </div>
  );
}
