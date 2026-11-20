// Writing prompts by phase for Block 4. Phase 0–1 are guided (controlled
// practice); later phases push free and constrained production.

export const WRITING_PROMPTS = {
  0: [
    'Write 3 sentences about yourself: name, where you are from, where you live. (Ich heiße… Ich komme aus… Ich wohne in…)',
    'Write 3 sentences, each with a different subject: ich, du, er/sie.',
    'Describe your room in 3 sentences using «Das ist…» and «Hier ist…».',
    'Write 3 sentences with «haben»: what you have, and one thing you don\'t have («kein»).',
  ],
  1: [
    'Your daily routine: 5–8 sentences. Start at least two with a time word (Morgens…, Dann…) — watch the verb in position 2.',
    'Write about last weekend in the Perfekt (5–8 sentences). Mix «haben» and «sein».',
    'Describe your flat: what is where? Use two-way prepositions with location (dative): «Das Sofa steht neben dem Fenster.»',
    'Write a short message to a friend inviting them somewhere. Use «möchten», «können» and a «weil» clause.',
    'Who helps you, what do you give to whom? 5 sentences with dative (helfen, geben, schenken, gefallen).',
    'Describe a family member: what they look like, what they do, what they like (gefällt / mag).',
    'Plan a trip: 6 sentences with «wollen», «müssen» and «dass».',
  ],
  2: [
    'Describe a place you love with at least 6 adjectives before nouns (ein kleines Café, mit dem alten Freund…).',
    'Tell a childhood story in the Präteritum (war, hatte, ging, kam…). 120+ words.',
    'Write an email complaining politely about a product. Use relative clauses (der/die/das…).',
    'Compare Spain and Germany on three things. Use comparatives and «als».',
    'Explain how to cook a dish you know. Use «zuerst, dann, danach, zum Schluss».',
    'Agree or disagree: «Remote work is better than office work.» 120+ words with weil / obwohl / trotzdem.',
  ],
  3: [
    'Timed free writing: what did you do today and how did you feel? Don\'t stop to correct.',
    'Summarize the last text you read in Block 3 in your own words.',
    'Write about a decision you regret — use Konjunktiv II (hätte, wäre, würde).',
    'Describe a process in the passive voice (how coffee/wine/bread is made).',
    'Argue both sides of a news topic, then give your opinion. Use a range of connectors.',
  ],
  4: [
    'Constrained writing: a 150-word story in which every sentence contains a participial attribute (die gestern gekaufte Zeitung…).',
    'Report what someone said using only Konjunktiv I (Er sagte, er sei…).',
    'Write a formal letter using at least three Funktionsverbgefüge (zur Verfügung stellen, in Frage kommen…).',
    'Rewrite a paragraph you wrote months ago, raising its register.',
    'Free writing targeting your top error category from the Roadmap.',
  ],
};

/** Short shadowing sentences by phase (spoken via device TTS when no audio file is loaded). */
export const SHADOW_SETS = {
  0: ['Guten Morgen!', 'Ich heiße Ana.', 'Ich komme aus Spanien.', 'Wie geht es dir?', 'Danke, sehr gut.', 'Das ist mein Buch.', 'Wo ist der Bahnhof?', 'Ich verstehe das nicht.'],
  1: ['Ich stehe jeden Morgen um sieben Uhr auf.', 'Am Wochenende habe ich meine Eltern besucht.', 'Kannst du mir bitte helfen?', 'Ich lerne Deutsch, weil ich in Berlin arbeiten möchte.', 'Das Buch liegt auf dem Tisch.', 'Ich lege das Buch auf den Tisch.', 'Wir sind gestern ins Kino gegangen.', 'Wie lange wohnst du schon hier?'],
  2: ['Als ich klein war, wohnten wir in einem kleinen Dorf.', 'Der Mann, den ich gestern getroffen habe, ist Arzt.', 'Obwohl es regnete, gingen wir spazieren.', 'Ich hätte gern ein großes Glas kaltes Wasser.', 'Das ist der beste Kuchen, den ich je gegessen habe.'],
  3: ['Wenn ich mehr Zeit hätte, würde ich öfter reisen.', 'Das Haus wurde im neunzehnten Jahrhundert gebaut.', 'Es kommt darauf an, wie man die Sache betrachtet.', 'Ich bin mir nicht sicher, ob das eine gute Idee ist.'],
  4: ['Die Regierung teilte mit, die Verhandlungen seien gescheitert.', 'Die im letzten Jahr eingeführten Maßnahmen zeigen bereits Wirkung.', 'Diese Frage kommt für uns nicht in Betracht.'],
};
