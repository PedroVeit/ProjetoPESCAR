import { useEffect, useRef, useState } from "react";

// Modo estático (?estatico na URL): sem animações. Serve para capturar os
// gráficos em imagem para o relatório e respeita quem pede menos movimento.
export const ESTATICO = typeof location !== "undefined" && /[?&]estatico\b/.test(location.search);
export const REDUCED = ESTATICO || (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);

// Interpola um vetor de números do estado atual para o novo (easeOutCubic).
// Os gráficos animam a troca de estado (ano, filtro, foco) em vez de saltar.
//
// Vetor de comprimento diferente troca sem animar — interpolar entre vetores
// de tamanhos distintos produziria movimento que não corresponde a dado nenhum.
export function useTweenValues(target, dur = 420, depKey) {
  const key = depKey !== undefined ? String(depKey)
    : Array.isArray(target) ? target.join("|") : String(target);
  const curRef = useRef(target);
  const rafRef = useRef(0);
  const [, force] = useState(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const from = curRef.current;
    if (REDUCED || !Array.isArray(target) || !Array.isArray(from) || from.length !== target.length) {
      curRef.current = target;
      force(n => n + 1);
      return;
    }
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      curRef.current = p >= 1 ? target : target.map((v, i) => from[i] + (v - from[i]) * e);
      force(n => n + 1);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dur]);

  const cur = curRef.current;
  if (Array.isArray(target) && Array.isArray(cur) && cur.length !== target.length) return target;
  return cur;
}
