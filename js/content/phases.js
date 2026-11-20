// Phase definitions and their user-ticked checklists.
// Each item's `stat` names a function in stats.js whose output is shown next to
// the checkbox to *inform* self-assessment. Nothing here auto-ticks.

export const PHASES = [
  {
    n: 0, name: 'Foundation', level: 'pre-A1',
    focus: 'Sounds, the case-role map, and the top-100 function words. Understanding before drilling.',
    blocks: {
      1: 'Work through the case-role map first, then the case example sets, minimal pairs and function-word chunks.',
      2: 'Atomic cards only: function words, one item per card, both directions.',
      3: 'Very short, very easy texts. Listen with TTS while reading.',
      4: 'Shadowing short sentences, or writing 3–5 very simple sentences. No correction now.',
      5: 'Look back at yesterday\'s writing and note errors. Keep it light.',
    },
    items: [
      { id: 'p0-pairs', label: 'Practiced minimal-pair discrimination for every contrast set (vowel length, umlauts, ich/ach, final devoicing…)', stat: 'minimalPairs' },
      { id: 'p0-casemap', label: 'Case-role map reviewed and self-rated "understood"', stat: 'caseMap' },
      { id: 'p0-caseex', label: 'Worked through the example sets for all four cases + the combined sentences', stat: 'caseLessons' },
      { id: 'p0-twoway', label: 'Can state the two-way preposition rule (motion → accusative, location → dative) without notes', stat: 'twoWay' },
      { id: 'p0-dativeverbs', label: 'Know the core dative verbs (helfen, danken, gehören, gefallen…) as a list', stat: 'caseLessons' },
      { id: 'p0-func', label: 'Top-100 function words introduced in SRS', stat: 'functionWords' },
      { id: 'p0-routine', label: 'Completed the full daily session on at least 5 days', stat: 'completedDays' },
    ],
  },
  {
    n: 1, name: 'Survival grammar', level: 'A1–A2',
    focus: 'Core conjugation, the case system in practice, V2 and verb-final word order, ~1500 core words. Explicit grammar + controlled practice before free production.',
    blocks: {
      1: 'One grammar topic at a time (import or generate lessons), plus a 10-word vocabulary chunk.',
      2: 'Still atomic cards: words, article+noun, preposition+case chunks.',
      3: 'Graded readers / simple texts near 95% coverage. Tap unknown words; add the useful ones to SRS.',
      4: 'Guided writing on a prompt (controlled practice), or shadowing. Corrections come later.',
      5: 'Review yesterday\'s output; convert real errors into atomic cards.',
    },
    items: [
      { id: 'p1-present', label: 'Present tense drilled: regular verbs, sein/haben/werden, stem-changing verbs', stat: 'lessonsPhase' },
      { id: 'p1-perfect', label: 'Present perfect drilled: haben vs. sein + participle (ge-…-t / ge-…-en)', stat: 'lessonsPhase' },
      { id: 'p1-modals', label: 'Modal verbs with the infinitive at the end', stat: 'lessonsPhase' },
      { id: 'p1-cases', label: 'All 4 cases drilled in isolation (articles, pronouns, possessives)', stat: 'reviewAccuracy' },
      { id: 'p1-preps', label: 'Fixed-case preposition sets and two-way prepositions practiced', stat: 'reviewAccuracy' },
      { id: 'p1-v2', label: 'V2 word order explicitly covered (incl. inversion: "Heute gehe ich…")', stat: 'lessonsPhase' },
      { id: 'p1-sub', label: 'Subordinate clauses (weil, dass, wenn, ob) — verb-final — explicitly covered', stat: 'lessonsPhase' },
      { id: 'p1-vocab', label: '~1500-word core vocabulary introduced in SRS', stat: 'vocabIntroduced' },
      { id: 'p1-retention', label: 'SRS accuracy stable at ≥85% over the last 2 weeks', stat: 'reviewAccuracy' },
      { id: 'p1-controlled', label: 'At least 10 guided writing sessions done before moving to free production', stat: 'writingCount' },
    ],
  },
  {
    n: 2, name: 'Grammar engine', level: 'A2–B1',
    focus: 'Adjective endings, interleaved case/gender practice, structured output with delayed correction, error-log-sourced cards.',
    blocks: {
      1: 'Adjective endings, Präteritum, relative clauses, genitive in writing. Mix topics.',
      2: 'Sentence-pattern cards join the deck. Batches are interleaved by design — don\'t sort them.',
      3: 'Authentic-but-easy texts at 94–98% coverage.',
      4: 'Structured free writing daily. Do not self-correct while writing.',
      5: 'The engine of this phase: every real error becomes a card.',
    },
    items: [
      { id: 'p2-adj', label: 'Adjective-ending paradigm drilled across interleaved cases/genders (not blocked tables)', stat: 'sentenceCards' },
      { id: 'p2-interleave', label: 'Interleaved review sustained for 4+ weeks (reviews on ≥20 of the last 28 days)', stat: 'reviewDays28' },
      { id: 'p2-errorlog', label: 'Personal error log active with ≥50 error-sourced SRS cards', stat: 'errorCards' },
      { id: 'p2-output', label: 'Sustained daily output for 21 consecutive sessions', stat: 'outputRun' },
      { id: 'p2-delayed', label: 'At least 15 output sessions reviewed after a delay in Block 5', stat: 'reviewedOutputs' },
      { id: 'p2-past', label: 'Präteritum of common verbs and relative clauses covered', stat: 'lessonsPhase' },
      { id: 'p2-reading', label: 'Read at least 20 texts in the i+1 zone', stat: 'textsRead' },
    ],
  },
  {
    n: 3, name: 'Fluency consolidation', level: 'B1–B2',
    focus: 'Shadowing, extensive volume-first input, timed free production targeting chunk retrieval over slow accuracy.',
    blocks: {
      1: 'Fewer new rules; collect chunks and connectors from your reading.',
      2: 'Mostly sentence/chunk cards from input and errors.',
      3: 'Volume: easy texts (≥98%) read fast. Track words read.',
      4: 'Timed writing (no pausing to polish) and shadowing at native speed.',
      5: 'Focus on recurring error categories, not one-offs.',
    },
    items: [
      { id: 'p3-shadow', label: 'Shadowing practiced for 30 sessions', stat: 'shadowSessions' },
      { id: 'p3-volume', label: 'Extensive reading volume: 100,000 words read', stat: 'wordsRead' },
      { id: 'p3-timed', label: '20 timed free-production sessions completed', stat: 'timedSessions' },
      { id: 'p3-chunks', label: '200+ cards mature (stability ≥ 21 days)', stat: 'matureCards' },
      { id: 'p3-structures', label: 'Konjunktiv II, passive and a range of connectors appear naturally in your own output', stat: 'writingCount' },
      { id: 'p3-erroracc', label: 'Accuracy on error-sourced cards ≥ 90%', stat: 'errorAccuracy' },
    ],
  },
  {
    n: 4, name: 'Refinement', level: 'B2–C1',
    focus: 'Unmodified native input, constrained creative production with low-frequency structures, deliberate practice on your residual error profile. No exit — this phase is ongoing.',
    ongoing: true,
    blocks: {
      1: 'Generate lessons on low-frequency structures you avoid (Konjunktiv I, Partizipialattribute, Funktionsverbgefüge…).',
      2: 'Cards from native input and your residual errors.',
      3: 'Unmodified native texts. Coverage will drop — that\'s expected.',
      4: 'Constrained creative writing: force a target structure into each piece.',
      5: 'Deliberate practice: track your top error categories.',
    },
    items: [
      { id: 'p4-native', label: 'Regular unmodified native input (news, novels, podcasts)', stat: 'textsRead' },
      { id: 'p4-lowfreq', label: 'Constrained production targeting low-frequency structures', stat: 'writingCount' },
      { id: 'p4-residual', label: 'Residual error profile reviewed this month', stat: 'errorProfile' },
    ],
  },
];

export function phaseInfo(n) { return PHASES[Math.max(0, Math.min(4, n))]; }

export function allItems(phase, progress) {
  const base = PHASES[phase].items;
  if (phase !== 4) return base;
  return [...base, ...(progress.customTargets || []).map((t) => ({ id: t.id, label: t.label, stat: 'errorProfile', custom: true }))];
}
