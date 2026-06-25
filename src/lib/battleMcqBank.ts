import { flashcards } from "@/data/flashcards";
import { flashcardsCh1 } from "@/data/flashcardsCh1";
import { flashcardsCh2 } from "@/data/flashcardsCh2";
import { flashcardsCh4 } from "@/data/flashcardsCh4";
import { flashcardsCh5 } from "@/data/flashcardsCh5";
import { flashcardsCh6 } from "@/data/flashcardsCh6";
import { flashcardsCh7 } from "@/data/flashcardsCh7";
import { flashcardsCh8 } from "@/data/flashcardsCh8";
import { flashcardsCh1Ar } from "@/data/flashcardsCh1Ar";
import { flashcardsCh2Ar } from "@/data/flashcardsCh2Ar";
import { flashcardsCh3Ar } from "@/data/flashcardsCh3Ar";
import { flashcardsCh4Ar } from "@/data/flashcardsCh4Ar";
import { flashcardsCh5Ar } from "@/data/flashcardsCh5Ar";
import { flashcardsCh6Ar } from "@/data/flashcardsCh6Ar";
import { flashcardsCh7Ar } from "@/data/flashcardsCh7Ar";
import { flashcardsCh8Ar } from "@/data/flashcardsCh8Ar";
import { flashcardsChemCh1En } from "@/data/flashcardsChemCh1En";
import { flashcardsChemCh2En } from "@/data/flashcardsChemCh2En";
import { flashcardsChemCh3En } from "@/data/flashcardsChemCh3En";
import { flashcardsChemCh4En } from "@/data/flashcardsChemCh4En";
import { flashcardsChemCh5En } from "@/data/flashcardsChemCh5En";
import { flashcardsChemCh6En } from "@/data/flashcardsChemCh6En";
import { flashcardsChemCh1Ar } from "@/data/flashcardsChemCh1Ar";
import { flashcardsChemCh2Ar } from "@/data/flashcardsChemCh2Ar";
import { flashcardsChemCh3Ar } from "@/data/flashcardsChemCh3Ar";
import { flashcardsChemCh4Ar } from "@/data/flashcardsChemCh4Ar";
import { flashcardsChemCh5Ar } from "@/data/flashcardsChemCh5Ar";
import { flashcardsChemCh6Ar } from "@/data/flashcardsChemCh6Ar";
import { flashcardsBioCh1En } from "@/data/flashcardsBioCh1En";
import { flashcardsBioCh2En } from "@/data/flashcardsBioCh2En";
import { flashcardsBioCh3En } from "@/data/flashcardsBioCh3En";
import { flashcardsBioCh5En } from "@/data/flashcardsBioCh5En";
import { flashcardsBioCh1Ar } from "@/data/flashcardsBioCh1Ar";
import { flashcardsBioCh2Ar } from "@/data/flashcardsBioCh2Ar";
import { flashcardsBioCh3Ar } from "@/data/flashcardsBioCh3Ar";
import { flashcardsBioCh5Ar } from "@/data/flashcardsBioCh5Ar";
import { ministerialPhysicsCh1 } from "@/data/ministerialPhysicsCh1";
import { ministerialPhysicsCh2 } from "@/data/ministerialPhysicsCh2";
import { ministerialPhysicsCh1Ar } from "@/data/ministerialPhysicsCh1Ar";
import { ministerialPhysicsCh2Ar } from "@/data/ministerialPhysicsCh2Ar";
import { ministerialChemCh1 } from "@/data/ministerialChemCh1";
import { ministerialChemCh2 } from "@/data/ministerialChemCh2";
import { ministerialChemCh3 } from "@/data/ministerialChemCh3";
import { ministerialChemCh4 } from "@/data/ministerialChemCh4";
import { ministerialChemCh5 } from "@/data/ministerialChemCh5";
import { ministerialChemCh6 } from "@/data/ministerialChemCh6";
import { ministerialChemCh1Ar } from "@/data/ministerialChemCh1Ar";
import { ministerialChemCh2Ar } from "@/data/ministerialChemCh2Ar";
import { ministerialChemCh3Ar } from "@/data/ministerialChemCh3Ar";
import { ministerialChemCh4Ar } from "@/data/ministerialChemCh4Ar";
import { ministerialChemCh5Ar } from "@/data/ministerialChemCh5Ar";
import { ministerialChemCh6Ar } from "@/data/ministerialChemCh6Ar";
import { ministerialBioCh1Ar } from "@/data/ministerialBioCh1Ar";

export type BattleSubject = "general" | "physics" | "chemistry" | "biology";
export type BattleMCQ = { q: string; choices: string[]; answer: number; subject: BattleSubject };

type QA = { q: string; a: string };

const physicsPool: QA[] = [
  ...flashcards,
  ...flashcardsCh1, ...flashcardsCh2, ...flashcardsCh4, ...flashcardsCh5,
  ...flashcardsCh6, ...flashcardsCh7, ...flashcardsCh8,
  ...flashcardsCh1Ar, ...flashcardsCh2Ar, ...flashcardsCh3Ar, ...flashcardsCh4Ar,
  ...flashcardsCh5Ar, ...flashcardsCh6Ar, ...flashcardsCh7Ar, ...flashcardsCh8Ar,
  ...ministerialPhysicsCh1, ...ministerialPhysicsCh2,
  ...ministerialPhysicsCh1Ar, ...ministerialPhysicsCh2Ar,
];

const chemistryPool: QA[] = [
  ...flashcardsChemCh1En, ...flashcardsChemCh2En, ...flashcardsChemCh3En,
  ...flashcardsChemCh4En, ...flashcardsChemCh5En, ...flashcardsChemCh6En,
  ...flashcardsChemCh1Ar, ...flashcardsChemCh2Ar, ...flashcardsChemCh3Ar,
  ...flashcardsChemCh4Ar, ...flashcardsChemCh5Ar, ...flashcardsChemCh6Ar,
  ...ministerialChemCh1, ...ministerialChemCh2, ...ministerialChemCh3,
  ...ministerialChemCh4, ...ministerialChemCh5, ...ministerialChemCh6,
  ...ministerialChemCh1Ar, ...ministerialChemCh2Ar, ...ministerialChemCh3Ar,
  ...ministerialChemCh4Ar, ...ministerialChemCh5Ar, ...ministerialChemCh6Ar,
];

const biologyPool: QA[] = [
  ...flashcardsBioCh1En, ...flashcardsBioCh2En, ...flashcardsBioCh3En, ...flashcardsBioCh5En,
  ...flashcardsBioCh1Ar, ...flashcardsBioCh2Ar, ...flashcardsBioCh3Ar, ...flashcardsBioCh5Ar,
  ...ministerialBioCh1Ar,
];

const isMcqFriendly = (qa: QA) =>
  !!qa && typeof qa.q === "string" && typeof qa.a === "string"
  && qa.q.length > 0 && qa.q.length <= 220
  && qa.a.length > 0 && qa.a.length <= 90
  && !qa.a.includes("\n");

const subjectPool = (s: BattleSubject): { pool: QA[]; subject: BattleSubject }[] => {
  if (s === "physics") return [{ pool: physicsPool.filter(isMcqFriendly), subject: "physics" }];
  if (s === "chemistry") return [{ pool: chemistryPool.filter(isMcqFriendly), subject: "chemistry" }];
  if (s === "biology") return [{ pool: biologyPool.filter(isMcqFriendly), subject: "biology" }];
  return [
    { pool: physicsPool.filter(isMcqFriendly), subject: "physics" },
    { pool: chemistryPool.filter(isMcqFriendly), subject: "chemistry" },
    { pool: biologyPool.filter(isMcqFriendly), subject: "biology" },
  ];
};

export function buildBattleMcqs(subject: BattleSubject, n: number, seed: number): BattleMCQ[] {
  let s = seed || 1;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  const pools = subjectPool(subject);
  // Combined pool of unique entries
  const seen = new Set<string>();
  const merged: { qa: QA; subject: BattleSubject }[] = [];
  for (const { pool, subject: sub } of pools) {
    for (const qa of pool) {
      const key = qa.q.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ qa, subject: sub });
    }
  }
  // Seeded shuffle
  const arr = merged.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const distractorPoolAll = merged.map((m) => m.qa.a);

  const out: BattleMCQ[] = [];
  for (const entry of arr) {
    if (out.length >= n) break;
    const correct = entry.qa.a.trim();
    const usedA = new Set<string>([correct.toLowerCase()]);
    const distractors: string[] = [];
    for (let tries = 0; tries < 80 && distractors.length < 3; tries++) {
      const candidate = distractorPoolAll[Math.floor(rand() * distractorPoolAll.length)]?.trim();
      if (!candidate) continue;
      const key = candidate.toLowerCase();
      if (usedA.has(key)) continue;
      usedA.add(key);
      distractors.push(candidate);
    }
    if (distractors.length < 3) continue;
    const choices = [correct, ...distractors];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    out.push({
      q: entry.qa.q,
      choices,
      answer: choices.indexOf(correct),
      subject: entry.subject,
    });
  }
  return out;
}