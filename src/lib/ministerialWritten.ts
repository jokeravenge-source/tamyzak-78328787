import type { MinisterialQuestion } from "@/data/ministerialIslamicUnit1";
import type { BattleSubject } from "@/lib/battleMcqBank";
import { ministerialPhysicsCh1 } from "@/data/ministerialPhysicsCh1";
import { ministerialPhysicsCh1Ar } from "@/data/ministerialPhysicsCh1Ar";
import { ministerialPhysicsCh2 } from "@/data/ministerialPhysicsCh2";
import { ministerialPhysicsCh2Ar } from "@/data/ministerialPhysicsCh2Ar";
import { ministerialChemCh1 } from "@/data/ministerialChemCh1";
import { ministerialChemCh1Ar } from "@/data/ministerialChemCh1Ar";
import { ministerialChemCh2 } from "@/data/ministerialChemCh2";
import { ministerialChemCh2Ar } from "@/data/ministerialChemCh2Ar";
import { ministerialChemCh3 } from "@/data/ministerialChemCh3";
import { ministerialChemCh3Ar } from "@/data/ministerialChemCh3Ar";
import { ministerialChemCh4 } from "@/data/ministerialChemCh4";
import { ministerialChemCh4Ar } from "@/data/ministerialChemCh4Ar";
import { ministerialChemCh5 } from "@/data/ministerialChemCh5";
import { ministerialChemCh5Ar } from "@/data/ministerialChemCh5Ar";
import { ministerialChemCh6 } from "@/data/ministerialChemCh6";
import { ministerialChemCh6Ar } from "@/data/ministerialChemCh6Ar";
import { ministerialBioCh1Ar } from "@/data/ministerialBioCh1Ar";
import { ministerialArabicIstifham } from "@/data/ministerialArabicIstifham";
import { ministerialArabicMadhDham } from "@/data/ministerialArabicMadhDham";
import { ministerialArabicTaajjub } from "@/data/ministerialArabicTaajjub";
import { ministerialArabicNida } from "@/data/ministerialArabicNida";
import { ministerialIslamicUnit1 } from "@/data/ministerialIslamicUnit1";
import { ministerialIslamicUnit2 } from "@/data/ministerialIslamicUnit2";

export type WrittenQuestion = MinisterialQuestion;

/** Written (non-MCQ) ministerial questions grouped by subject and language. */
function poolFor(subject: BattleSubject, lang: "ar" | "en"): WrittenQuestion[] {
  switch (subject) {
    case "physics":
      return lang === "ar"
        ? [...ministerialPhysicsCh1Ar, ...ministerialPhysicsCh2Ar]
        : [...ministerialPhysicsCh1, ...ministerialPhysicsCh2];
    case "chemistry":
      return lang === "ar"
        ? [...ministerialChemCh1Ar, ...ministerialChemCh2Ar, ...ministerialChemCh3Ar, ...ministerialChemCh4Ar, ...ministerialChemCh5Ar, ...ministerialChemCh6Ar]
        : [...ministerialChemCh1, ...ministerialChemCh2, ...ministerialChemCh3, ...ministerialChemCh4, ...ministerialChemCh5, ...ministerialChemCh6];
    case "biology":
      return [...ministerialBioCh1Ar];
    case "arabic":
      return [...ministerialArabicIstifham, ...ministerialArabicMadhDham, ...ministerialArabicTaajjub, ...ministerialArabicNida];
    case "islamic":
      return [...ministerialIslamicUnit1, ...ministerialIslamicUnit2];
    default:
      return [];
  }
}

/** Deterministic daily selection of written ministerial questions. */
export function buildWrittenSet(subject: BattleSubject, count: number, seed: number, lang: "ar" | "en"): WrittenQuestion[] {
  let pool = poolFor(subject, lang).filter((q) => q.q && q.a);
  if (pool.length < 3) pool = poolFor(subject, lang === "ar" ? "en" : "ar").filter((q) => q.q && q.a);
  if (pool.length === 0) return [];
  let s = seed || 1;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.max(1, count));
}

export function hasWrittenPool(subject: BattleSubject, lang: "ar" | "en"): boolean {
  return buildWrittenSet(subject, 3, 1, lang).length >= 3;
}
