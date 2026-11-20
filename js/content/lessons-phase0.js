// Phase 0 seed lessons (Block 1). Real instructional content, written for a
// Spanish/English speaker learning German.
//
// Markup inside German example strings: [[nom:…]] [[akk:…]] [[dat:…]] [[gen:…]]
// colours a phrase by case. Each example has a full translation (es, en) and a
// role-based explanation (why.es / why.en) — what job each phrase does.

import { FUNCTION_WORDS } from './function-words.js';

const CASE_MAP = {
  id: 'p0-casemap', phase: 0, tag: 'casemap', kind: 'read', selfRate: true,
  title: 'The case-role map',
  summary: 'An overview of what each of the four cases *does*, before any endings.',
  body: `German marks the **job** a noun phrase does in the sentence with its *case*, mostly on the article (der/den/dem/des). Spanish and English mark most of these jobs with **word order** or a **preposition** instead. Read this map as a mental model — the endings come later.

### [[nom:Nominative]] — who/what is doing it
- The grammatical **subject**. Maps directly onto the Spanish/English subject: *[[nom:Der Mann]] liest.* — *El hombre lee.*
- **Trap:** after **sein** (to be), **bleiben** (to remain) and **werden** (to become), the complement is *also* nominative: *Er ist [[nom:ein guter Lehrer]].* Spanish/English give you no signal for this — it's not an object.

### [[akk:Accusative]] — what is directly affected; where something is going
- The **direct object**: *Ich sehe [[akk:den Mann]].* — *Veo al hombre.* (Note: Spanish personal *a* doesn't change anything here; German still uses accusative.)
- Goes further than Spanish/English: it marks the **destination** (motion *into/onto*) with two-way prepositions: *Ich gehe in [[akk:den Garten]].*
- A fixed preposition set **always** takes accusative, motion or not: **durch, für, gegen, ohne, um** (memory hook: *DOGFU*).
- Time spans without a preposition: *[[akk:jeden Tag]], [[akk:den ganzen Abend]].*

### [[dat:Dative]] — to/for whom; where something is
- The **indirect object** — the receiver — with **no preposition**: *Ich gebe [[dat:dem Kind]] das Buch.* Spanish/English need *a / to* here (*le doy el libro **al** niño*). German folds that *a/to* into the case. This is the least intuitive case for you.
- **Static location** with two-way prepositions: *Ich bin in [[dat:dem Garten]]* (→ *im Garten*).
- A fixed preposition set **always** takes dative: **aus, bei, mit, nach, seit, von, zu** (plus *gegenüber*).
- **Dative verbs** — memorize as a list; your L1's transitivity gives no clue: **helfen, danken, gehören, gefallen, antworten, folgen, gratulieren, schmecken, passen, fehlen**. *Ich helfe [[dat:dir]]* (Spanish: *te ayudo*, where *te* is a direct object!).
- Good news: *gefallen* works exactly like **gustar**: *[[nom:Der Film]] gefällt [[dat:mir]]* = *[[nom:La película]] [[dat:me]] gusta*.

### [[gen:Genitive]] — whose; and a few prepositions
- **Possession**: *das Auto [[gen:meines Vaters]]* — closest cousin to Spanish *de* / English *'s*.
- A small preposition set: **trotz, während, wegen, innerhalb, statt** (*anstatt*).
- In everyday speech German increasingly says **von + dative** instead: *das Auto von [[dat:meinem Vater]]*. Recognize the genitive; you can survive speaking without much of it.

### Two-way prepositions — the rule with no Spanish/English equivalent
**in, an, auf, unter, über, vor, hinter, neben, zwischen** take:
- **accusative** for motion towards a destination — answers *Wohin?* (where to?)
- **dative** for a static location — answers *Wo?* (where?)

Learn it as **one generalizable rule**, not nine exceptions: *Ich lege das Buch auf [[akk:den Tisch]]* (destination) → *Das Buch liegt auf [[dat:dem Tisch]]* (location).

### How to ask which case
| Job | Question | Case |
|---|---|---|
| doer / subject | Wer? Was? | [[nom:Nominative]] |
| directly affected / destination | Wen? Was? Wohin? | [[akk:Accusative]] |
| receiver / location | Wem? Wo? | [[dat:Dative]] |
| owner | Wessen? | [[gen:Genitive]] |

### Preview only — don't memorize yet
Most of the case signal lives on the article. You'll drill this in Phase 1; for now, just notice that **masculine** changes the most.

| | masc. | fem. | neut. | plural |
|---|---|---|---|---|
| [[nom:Nom]] | der | die | das | die |
| [[akk:Akk]] | **den** | die | das | die |
| [[dat:Dat]] | **dem** | **der** | **dem** | **den** (+n) |
| [[gen:Gen]] | **des** (+s) | **der** | **des** (+s) | **der** |

When you can explain each case's *job* in your own words, rate yourself below.`,
  examples: [],
};

const NOM = {
  id: 'p0-nom', phase: 0, tag: 'case', kind: 'read',
  title: 'Nominative — 10 examples',
  summary: 'The subject, and the "sein / bleiben / werden" trap.',
  body: `The nominative names **who or what does the action** (or *is* something). In German the subject isn't always first — the **verb is second**, and anything can come first. The case, not the position, tells you who the subject is.`,
  examples: [
    { de: '[[nom:Der Hund]] schläft.', es: 'El perro duerme.', en: 'The dog is sleeping.',
      why: { es: '«Der Hund» es el sujeto: quién duerme. Masculino nominativo = der.', en: '"Der Hund" is the subject — who sleeps. Masculine nominative = der.' } },
    { de: '[[nom:Meine Schwester]] arbeitet in Berlin.', es: 'Mi hermana trabaja en Berlín.', en: 'My sister works in Berlin.',
      why: { es: '«Meine Schwester» hace la acción (trabajar). Femenino: meine.', en: '"Meine Schwester" does the action (works). Feminine: meine.' } },
    { de: '[[nom:Das Kind]] ist [[nom:ein guter Schüler]].', es: 'El niño es un buen alumno.', en: 'The child is a good student.',
      why: { es: 'Trampa: tras «sein» el complemento NO es objeto; sigue en nominativo → «ein guter», no «einen guten».', en: 'Trap: after "sein" the complement is not an object; it stays nominative → "ein guter", not "einen guten".' } },
    { de: '[[nom:Er]] bleibt [[nom:mein bester Freund]].', es: 'Él sigue siendo mi mejor amigo.', en: 'He remains my best friend.',
      why: { es: '«bleiben» funciona como «sein»: los dos lados son la misma persona → nominativo.', en: '"bleiben" works like "sein": both sides are the same person → nominative.' } },
    { de: 'Heute kommt [[nom:der Lehrer]] später.', es: 'Hoy el profesor viene más tarde.', en: 'Today the teacher is coming later.',
      why: { es: '«Heute» va primero, así que el verbo (posición 2) va antes del sujeto. «der Lehrer» sigue siendo nominativo.', en: '"Heute" comes first, so the verb (slot 2) comes before the subject. "der Lehrer" is still nominative.' } },
    { de: '[[nom:Wer]] hat angerufen?', es: '¿Quién ha llamado?', en: 'Who called?',
      why: { es: '«Wer» pregunta por el sujeto (nominativo). Compara: wen (acusativo), wem (dativo).', en: '"Wer" asks for the subject (nominative). Compare: wen (accusative), wem (dative).' } },
    { de: '[[nom:Die Kinder]] spielen im Garten.', es: 'Los niños juegan en el jardín.', en: 'The children are playing in the garden.',
      why: { es: 'Sujeto en plural: «die Kinder». El verbo concuerda: spielen.', en: 'Plural subject: "die Kinder". The verb agrees: spielen.' } },
    { de: '[[nom:Das]] ist [[nom:der neue Chef]].', es: 'Ese es el nuevo jefe.', en: 'That is the new boss.',
      why: { es: 'Otra vez «sein»: «der neue Chef» es nominativo, no «den neuen Chef».', en: '"sein" again: "der neue Chef" is nominative, not "den neuen Chef".' } },
    { de: '[[akk:Den Film]] findet [[nom:mein Vater]] langweilig.', es: 'A mi padre la película le parece aburrida.', en: 'My father finds the film boring.',
      why: { es: 'El objeto va primero (énfasis). «Den» marca acusativo, así que el sujeto tiene que ser «mein Vater», aunque venga después del verbo.', en: 'The object comes first (emphasis). "Den" marks accusative, so the subject must be "mein Vater" even though it comes after the verb.' } },
    { de: '[[nom:Ich]] werde [[nom:Ärztin]].', es: 'Voy a ser médica. / Me hago médica.', en: 'I\'m going to be a doctor.',
      why: { es: '«werden» (llegar a ser) también lleva nominativo en los dos lados. Profesiones sin artículo.', en: '"werden" (to become) also takes nominative on both sides. Professions take no article.' } },
  ],
};

const AKK = {
  id: 'p0-akk', phase: 0, tag: 'case', kind: 'read',
  title: 'Accusative — 10 examples',
  summary: 'Direct objects, DOGFU prepositions, destinations, time spans.',
  body: `The accusative is the **thing directly affected** by the verb. Only the masculine visibly changes: **der → den, ein → einen, kein → keinen, er → ihn**. Feminine, neuter and plural look the same as nominative.

Prepositions that **always** take accusative: **durch, für, gegen, ohne, um**.`,
  examples: [
    { de: 'Ich sehe [[akk:den Hund]].', es: 'Veo al perro.', en: 'I see the dog.',
      why: { es: '«den Hund» recibe la acción de ver: objeto directo. der → den.', en: '"den Hund" receives the seeing: direct object. der → den.' } },
    { de: '[[nom:Sie]] kauft [[akk:einen neuen Mantel]].', es: 'Ella compra un abrigo nuevo.', en: 'She is buying a new coat.',
      why: { es: 'Objeto directo masculino con «ein» → «einen», y el adjetivo también cambia: «neuen».', en: 'Masculine direct object with "ein" → "einen"; the adjective changes too: "neuen".' } },
    { de: 'Das Geschenk ist für [[akk:meinen Bruder]].', es: 'El regalo es para mi hermano.', en: 'The present is for my brother.',
      why: { es: '«für» siempre rige acusativo, aunque no haya movimiento.', en: '"für" always takes accusative, no motion needed.' } },
    { de: 'Wir gehen durch [[akk:den Park]].', es: 'Vamos por el parque / atravesamos el parque.', en: 'We walk through the park.',
      why: { es: '«durch» = a través de; siempre acusativo.', en: '"durch" = through; always accusative.' } },
    { de: 'Ohne [[akk:dich]] fahre ich nicht.', es: 'Sin ti no voy.', en: 'I\'m not going without you.',
      why: { es: '«ohne» rige acusativo: du → dich. Fíjate: «fahre ich» — verbo en posición 2.', en: '"ohne" takes accusative: du → dich. Note "fahre ich" — verb in slot 2.' } },
    { de: 'Wir spielen gegen [[akk:die andere Mannschaft]].', es: 'Jugamos contra el otro equipo.', en: 'We\'re playing against the other team.',
      why: { es: '«gegen» = contra; acusativo. Femenino: la forma no cambia (die).', en: '"gegen" = against; accusative. Feminine: the form doesn\'t change (die).' } },
    { de: 'Der Bus fährt um [[akk:die Ecke]].', es: 'El autobús dobla la esquina.', en: 'The bus goes around the corner.',
      why: { es: '«um» = alrededor de; acusativo.', en: '"um" = around; accusative.' } },
    { de: 'Ich lege das Buch auf [[akk:den Tisch]].', es: 'Pongo el libro sobre la mesa.', en: 'I put the book on the table.',
      why: { es: 'Preposición de doble vía con movimiento hacia un destino (¿Wohin?) → acusativo.', en: 'Two-way preposition with motion to a destination (Wohin?) → accusative.' } },
    { de: 'Ich arbeite [[akk:jeden Tag]].', es: 'Trabajo todos los días.', en: 'I work every day.',
      why: { es: 'Expresión de tiempo sin preposición → acusativo: jeder → jeden.', en: 'Time expression without a preposition → accusative: jeder → jeden.' } },
    { de: 'Ich habe [[akk:keinen Hunger]].', es: 'No tengo hambre.', en: 'I\'m not hungry.',
      why: { es: 'Como en español, «tener hambre» = haben + objeto. «der Hunger» → «keinen Hunger».', en: 'Like Spanish "tener hambre": haben + object. "der Hunger" → "keinen Hunger".' } },
  ],
};

const DAT = {
  id: 'p0-dat', phase: 0, tag: 'case', kind: 'read',
  title: 'Dative — 10 examples',
  summary: 'The receiver without a preposition, dative verbs, location, aus-bei-mit-nach-seit-von-zu.',
  body: `The dative marks the **receiver** ("to/for whom") — with **no preposition** — and **static location**. Signals: **dem** (m./n.), **der** (f.), **den …n** (plural), pronouns **mir, dir, ihm, ihr, uns, euch, ihnen/Ihnen**.

**Dative verbs** (memorize as a list): helfen, danken, gehören, gefallen, antworten, folgen, gratulieren, schmecken, passen, fehlen, glauben (a person), vertrauen.

**Always-dative prepositions:** aus, bei, mit, nach, seit, von, zu.`,
  examples: [
    { de: 'Ich gebe [[dat:dem Kind]] [[akk:einen Apfel]].', es: 'Le doy una manzana al niño.', en: 'I give the child an apple.',
      why: { es: '«dem Kind» es quien recibe (objeto indirecto). En español necesitas «a»; en alemán el dativo ya lo dice. «einen Apfel» es la cosa dada (acusativo).', en: '"dem Kind" is the receiver (indirect object). Spanish/English need "a/to"; German\'s dative already says it. "einen Apfel" is the thing given (accusative).' } },
    { de: 'Ich helfe [[dat:meiner Mutter]].', es: 'Ayudo a mi madre.', en: 'I help my mother.',
      why: { es: '¡Verbo de dativo! En español «la ayudo» (directo), pero «helfen» exige dativo: meine → meiner.', en: 'Dative verb! In Spanish/English "help" takes a direct object, but "helfen" requires dative: meine → meiner.' } },
    { de: 'Das Buch gehört [[dat:mir]].', es: 'El libro es mío. (me pertenece)', en: 'The book belongs to me.',
      why: { es: '«gehören» + dativo: el dueño va en dativo (mir). Sujeto: «das Buch».', en: '"gehören" + dative: the owner is dative (mir). Subject: "das Buch".' } },
    { de: '[[nom:Der Film]] gefällt [[dat:uns]].', es: 'Nos gusta la película.', en: 'We like the film.',
      why: { es: 'Igual que «gustar»: lo que gusta es el sujeto; a quien le gusta va en dativo (nos = uns).', en: 'Works exactly like Spanish "gustar": the liked thing is the subject; the person is dative (uns).' } },
    { de: '[[dat:Mir]] ist kalt.', es: 'Tengo frío.', en: 'I\'m cold.',
      why: { es: 'Sensaciones con dativo: «a mí me está frío». «Ich bin kalt» significaría «soy frío» (de carácter).', en: 'Sensations use dative: "to me it is cold". "Ich bin kalt" would mean "I\'m a cold person".' } },
    { de: 'Ich fahre mit [[dat:dem Bus]].', es: 'Voy en autobús.', en: 'I\'m going by bus.',
      why: { es: '«mit» siempre rige dativo. Medio de transporte: mit + dativo (no «en»).', en: '"mit" always takes dative. Transport: mit + dative.' } },
    { de: 'Sie kommt aus [[dat:der Schweiz]].', es: 'Ella es de Suiza.', en: 'She comes from Switzerland.',
      why: { es: '«aus» = de (origen); dativo. Femenino die → der.', en: '"aus" = from (origin); dative. Feminine die → der.' } },
    { de: 'Ich wohne bei [[dat:meinen Eltern]].', es: 'Vivo en casa de mis padres.', en: 'I live at my parents\' place.',
      why: { es: '«bei» = en casa de / junto a; dativo. Plural dativo: «den/meinen … -n» (Eltern ya termina en -n).', en: '"bei" = at someone\'s place; dative. Dative plural: "den/meinen … -n" (Eltern already ends in -n).' } },
    { de: 'Ich lerne seit [[dat:einem Jahr]] Deutsch.', es: 'Estudio alemán desde hace un año.', en: 'I\'ve been learning German for a year.',
      why: { es: '«seit» + dativo, y con PRESENTE (como «desde hace»), no con pasado como en inglés.', en: '"seit" + dative, with the PRESENT tense (like Spanish "desde hace"), not "have been".' } },
    { de: 'Das Buch liegt auf [[dat:dem Tisch]].', es: 'El libro está sobre la mesa.', en: 'The book is lying on the table.',
      why: { es: 'Doble vía sin movimiento (¿Wo?) → dativo. Compara con «Ich lege das Buch auf den Tisch».', en: 'Two-way preposition, no motion (Wo?) → dative. Compare "Ich lege das Buch auf den Tisch".' } },
  ],
};

const GEN = {
  id: 'p0-gen', phase: 0, tag: 'case', kind: 'read',
  title: 'Genitive — 10 examples',
  summary: 'Possession, trotz/während/wegen/innerhalb/statt, and the spoken von + dative.',
  body: `The genitive answers **wessen?** (whose?). It follows the noun it describes, like Spanish *de*: *el coche **de mi padre*** → *das Auto **meines Vaters***. Masculine and neuter nouns add **-s/-es**.

Prepositions: **trotz, während, wegen, innerhalb, statt**. In everyday speech many people use **von + dative** or even dative after *wegen* — recognize the genitive, write it in formal texts.`,
  examples: [
    { de: 'Das ist das Auto [[gen:meines Vaters]].', es: 'Ese es el coche de mi padre.', en: 'That is my father\'s car.',
      why: { es: 'Poseedor en genitivo: mein → meines, Vater → Vaters. Va detrás, como «de mi padre».', en: 'Owner in genitive: mein → meines, Vater → Vaters. It follows the noun, like "of my father".' } },
    { de: 'Die Farbe [[gen:des Hauses]] gefällt mir.', es: 'Me gusta el color de la casa.', en: 'I like the colour of the house.',
      why: { es: 'Neutro: das → des, Haus → Hauses (-es en monosílabos).', en: 'Neuter: das → des, Haus → Hauses (-es on one-syllable nouns).' } },
    { de: 'Trotz [[gen:des Regens]] gehen wir spazieren.', es: 'A pesar de la lluvia, salimos a pasear.', en: 'Despite the rain we\'re going for a walk.',
      why: { es: '«trotz» = a pesar de; genitivo: der Regen → des Regens.', en: '"trotz" = despite; genitive: der Regen → des Regens.' } },
    { de: 'Während [[gen:der Woche]] arbeite ich viel.', es: 'Durante la semana trabajo mucho.', en: 'During the week I work a lot.',
      why: { es: '«während» = durante; femenino genitivo: die → der.', en: '"während" = during; feminine genitive: die → der.' } },
    { de: 'Wegen [[gen:des Streiks]] fährt kein Zug.', es: 'Por la huelga no circula ningún tren.', en: 'Because of the strike no trains are running.',
      why: { es: '«wegen» = a causa de. Hablando, mucha gente dice «wegen dem Streik» (dativo).', en: '"wegen" = because of. In speech many say "wegen dem Streik" (dative).' } },
    { de: 'Innerhalb [[gen:einer Stunde]] war alles fertig.', es: 'En menos de una hora todo estaba listo.', en: 'Within an hour everything was ready.',
      why: { es: '«innerhalb» = dentro de (tiempo/espacio); genitivo: eine → einer.', en: '"innerhalb" = within; genitive: eine → einer.' } },
    { de: 'Statt [[gen:eines Briefes]] schreibe ich eine E-Mail.', es: 'En lugar de una carta, escribo un correo.', en: 'Instead of a letter I\'m writing an email.',
      why: { es: '«statt» = en lugar de; genitivo masculino: ein → eines, Brief → Briefes.', en: '"statt" = instead of; masculine genitive: ein → eines, Brief → Briefes.' } },
    { de: 'Das ist [[gen:Annas]] Buch.', es: 'Ese es el libro de Anna.', en: 'That is Anna\'s book.',
      why: { es: 'Nombres propios: -s delante, sin apóstrofo (≠ inglés «Anna\'s»).', en: 'Proper names: -s in front, no apostrophe (unlike English "Anna\'s").' } },
    { de: 'Die Meinung [[gen:der Leute]] ist mir egal.', es: 'La opinión de la gente me da igual.', en: 'I don\'t care what people think.',
      why: { es: 'Genitivo plural: der. «mir egal» = me da igual (dativo otra vez).', en: 'Genitive plural: der. "mir egal" = I don\'t care (dative again).' } },
    { de: 'Das Auto von [[dat:meinem Vater]] ist alt.', es: 'El coche de mi padre es viejo.', en: 'My father\'s car is old.',
      why: { es: 'Versión hablada: «von» + dativo sustituye al genitivo. Es correcta y muy frecuente.', en: 'Spoken version: "von" + dative replaces the genitive. Correct and very common.' } },
  ],
};

const TWOWAY = {
  id: 'p0-twoway', phase: 0, tag: 'case', kind: 'read',
  title: 'Two-way prepositions — Wohin? vs. Wo?',
  summary: 'One rule, nine prepositions: motion → accusative, location → dative.',
  body: `**in, an, auf, unter, über, vor, hinter, neben, zwischen**

- **Wohin?** (motion towards a destination) → [[akk:accusative]]
- **Wo?** (where something is) → [[dat:dative]]

German even has **verb pairs** for this: a *putting* verb (motion → Akk) and a *being-there* verb (location → Dat):

| put (→ Akk) | be there (→ Dat) |
|---|---|
| legen (lay) | liegen (lie) |
| stellen (stand upright) | stehen (stand) |
| setzen (seat) | sitzen (sit) |
| hängen (hang sth.) | hängen (hang) |

Contractions you'll see constantly: **in dem → im, an dem → am, in das → ins, an das → ans**.

Motion *within* a place is still **Wo?**: *Wir laufen im Park* (we run around inside the park) → dative.`,
  examples: [
    { de: 'Ich gehe in [[akk:die Küche]]. — Ich bin in [[dat:der Küche]].', es: 'Voy a la cocina. — Estoy en la cocina.', en: 'I go into the kitchen. — I\'m in the kitchen.',
      why: { es: 'Mismo «in», distinto caso: destino (acusativo) vs. ubicación (dativo).', en: 'Same "in", different case: destination (accusative) vs. location (dative).' } },
    { de: 'Ich hänge das Bild an [[akk:die Wand]]. — Das Bild hängt an [[dat:der Wand]].', es: 'Cuelgo el cuadro en la pared. — El cuadro cuelga en la pared.', en: 'I hang the picture on the wall. — The picture hangs on the wall.',
      why: { es: 'Colgar algo (movimiento → Akk) vs. estar colgado (Dat).', en: 'Hanging something up (motion → Akk) vs. being hung there (Dat).' } },
    { de: 'Die Katze springt auf [[akk:das Sofa]]. — Die Katze schläft auf [[dat:dem Sofa]].', es: 'El gato salta al sofá. — El gato duerme en el sofá.', en: 'The cat jumps onto the sofa. — The cat sleeps on the sofa.',
      why: { es: 'Neutro: das (Akk) / dem (Dat). Saltar hacia = destino.', en: 'Neuter: das (Akk) / dem (Dat). Jumping onto = destination.' } },
    { de: 'Ich stelle die Tasche neben [[akk:die Tür]]. — Die Tasche steht neben [[dat:der Tür]].', es: 'Pongo el bolso junto a la puerta. — El bolso está junto a la puerta.', en: 'I put the bag next to the door. — The bag is next to the door.',
      why: { es: 'stellen (poner) → Akk; stehen (estar de pie) → Dat.', en: 'stellen (put) → Akk; stehen (stand) → Dat.' } },
    { de: 'Er läuft hinter [[akk:das Haus]]. — Der Garten ist hinter [[dat:dem Haus]].', es: 'Corre detrás de la casa (hacia allí). — El jardín está detrás de la casa.', en: 'He runs (round to) behind the house. — The garden is behind the house.',
      why: { es: 'Con «hinter» el español no distingue; el alemán sí, con el caso.', en: 'Spanish/English don\'t distinguish this with "behind"; German does, with case.' } },
    { de: 'Wir fahren ins Kino. — Wir sind im Kino.', es: 'Vamos al cine. — Estamos en el cine.', en: 'We\'re going to the cinema. — We\'re at the cinema.',
      why: { es: 'ins = in das (Akk, destino); im = in dem (Dat, ubicación).', en: 'ins = in das (Akk, destination); im = in dem (Dat, location).' } },
    { de: 'Wir laufen im Park.', es: 'Corremos en el parque (por dentro).', en: 'We\'re running in the park.',
      why: { es: 'Hay movimiento, pero DENTRO del lugar: no hay destino → dativo.', en: 'There\'s motion, but WITHIN the place: no destination → dative.' } },
    { de: 'Der Hund legt sich unter [[akk:den Tisch]]. — Der Hund liegt unter [[dat:dem Tisch]].', es: 'El perro se tumba debajo de la mesa. — El perro está tumbado debajo de la mesa.', en: 'The dog lies down under the table. — The dog is lying under the table.',
      why: { es: 'sich legen (acción de tumbarse) → Akk; liegen (estado) → Dat.', en: 'sich legen (the act of lying down) → Akk; liegen (the state) → Dat.' } },
  ],
};

const COMBINED = {
  id: 'p0-combined', phase: 0, tag: 'case', kind: 'read',
  title: 'All cases together — 5 sentences',
  summary: 'Read each sentence as a set of roles: doer, thing, receiver, owner, place.',
  body: `For each sentence, first find the **verb** (slot 2), then ask: *Wer?* (Nom) — *Wen/Was?* (Akk) — *Wem?* (Dat) — *Wessen?* (Gen). Tap ▶ to hear it, then try to say the roles out loud before reading the explanation.`,
  examples: [
    { de: '[[nom:Der Vater]] gibt [[dat:dem Sohn]] [[akk:den Schlüssel]] [[gen:des Autos]].', es: 'El padre le da al hijo la llave del coche.', en: 'The father gives the son the car key.',
      why: { es: 'Quién da: der Vater (Nom). A quién: dem Sohn (Dat). Qué: den Schlüssel (Akk). De qué: des Autos (Gen). Los cuatro casos en una frase.', en: 'Who gives: der Vater (Nom). To whom: dem Sohn (Dat). What: den Schlüssel (Akk). Of what: des Autos (Gen). All four cases in one sentence.' } },
    { de: 'Wegen [[gen:des Regens]] leiht [[nom:meine Nachbarin]] [[dat:mir]] [[akk:ihren Schirm]].', es: 'Por la lluvia, mi vecina me presta su paraguas.', en: 'Because of the rain my neighbour lends me her umbrella.',
      why: { es: 'La causa (wegen + Gen) va primero, así que el verbo va antes del sujeto. Receptor: mir (Dat). Cosa prestada: ihren Schirm (Akk, masculino).', en: 'The cause (wegen + Gen) comes first, so the verb precedes the subject. Receiver: mir (Dat). Thing lent: ihren Schirm (Akk, masculine).' } },
    { de: '[[nom:Die Lehrerin]] erklärt [[dat:den Schülern]] [[akk:die Regel]].', es: 'La profesora les explica la regla a los alumnos.', en: 'The teacher explains the rule to the students.',
      why: { es: 'Dativo plural: den Schülern (¡con -n!). Al español le basta «les»; el alemán lo marca en artículo y sustantivo.', en: 'Dative plural: den Schülern (with -n!). English needs "to"; German marks it on article and noun.' } },
    { de: '[[nom:Er]] legt [[akk:das Handy]] auf [[akk:den Tisch]] — jetzt liegt [[nom:es]] auf [[dat:dem Tisch]].', es: 'Pone el móvil sobre la mesa; ahora está sobre la mesa.', en: 'He puts the phone on the table — now it\'s lying on the table.',
      why: { es: 'Primero destino (Akk: den Tisch), después ubicación (Dat: dem Tisch). «es» = das Handy, ahora sujeto.', en: 'First destination (Akk: den Tisch), then location (Dat: dem Tisch). "es" = das Handy, now the subject.' } },
    { de: 'Trotz [[gen:der Kälte]] zeigt [[nom:der Opa]] [[dat:seinen Enkeln]] [[akk:den Garten]].', es: 'A pesar del frío, el abuelo les enseña el jardín a sus nietos.', en: 'Despite the cold, grandpa shows his grandchildren the garden.',
      why: { es: 'trotz + Gen (der Kälte). Quién muestra: der Opa. A quién: seinen Enkeln (Dat pl.). Qué: den Garten (Akk).', en: 'trotz + Gen (der Kälte). Who shows: der Opa. To whom: seinen Enkeln (Dat pl.). What: den Garten (Akk).' } },
  ],
};

// ---- Minimal pairs (listen-and-choose discrimination) ----
const PAIRS = [
  { id: 'p0-mp-length', title: 'Long vs. short vowels', note: 'Spanish has no vowel length. In German it changes meaning: a long vowel is often followed by one consonant or h; a short one by two consonants.',
    pairs: [['Staat', 'Stadt'], ['Miete', 'Mitte'], ['Ofen', 'offen'], ['Höhle', 'Hölle'], ['bieten', 'bitten'], ['Beet', 'Bett'], ['Kahn', 'kann'], ['Mus', 'muss']] },
  { id: 'p0-mp-umlaut', title: 'u/ü, o/ö, i/ü', note: 'Round your lips for ü/ö while keeping the tongue in the i/e position. i vs. ü is the hardest pair for Spanish speakers.',
    pairs: [['Mutter', 'Mütter'], ['fuhr', 'für'], ['Kuchen', 'Küchen'], ['schon', 'schön'], ['Tochter', 'Töchter'], ['Kiste', 'Küste'], ['Tier', 'Tür'], ['Kissen', 'küssen']] },
  { id: 'p0-mp-eiie', title: 'ei vs. ie', note: 'Spelling trap: «ei» sounds like Spanish «ai»; «ie» is a long «i». Rule of thumb: say the second letter.',
    pairs: [['Lied', 'Leid'], ['Miene', 'Meine'], ['Biene', 'Beine'], ['Wien', 'Wein'], ['Riese', 'Reise'], ['Lieder', 'leider']] },
  { id: 'p0-mp-bw', title: 'w vs. b', note: 'German «w» is a real [v] — upper teeth on lower lip. Spanish merges b/v; German doesn\'t.',
    pairs: [['Wein', 'Bein'], ['wir', 'Bier'], ['Wald', 'bald'], ['Wand', 'Band'], ['winden', 'binden']] },
  { id: 'p0-mp-s', title: 's, ß and z', note: 'Before a vowel, «s» is voiced [z] (a buzz Spanish lacks); «ß/ss» is a sharp [s]; «z» is [ts].',
    pairs: [['reisen', 'reißen'], ['weise', 'weiße'], ['heiser', 'heißer'], ['Zeit', 'seit'], ['Ziege', 'Siege']] },
  { id: 'p0-mp-chsch', title: 'ch (ich-Laut) vs. sch', note: 'The «ich» sound: say «j» as in «yo» but voiceless and with more air. «sch» is rounder, lips forward.',
    pairs: [['Kirche', 'Kirsche'], ['mich', 'misch'], ['Fichte', 'fischte'], ['Löcher', 'Löscher']] },
  { id: 'p0-mp-endings', title: 'Endings: -e vs. -er vs. -en', note: 'Case endings live in these unstressed syllables. «-er» at the end sounds like a short «a»; «-e» is a weak «e»; «-en» is often just «n».',
    pairs: [['diese', 'dieser'], ['eine', 'einer'], ['kleine', 'kleinen'], ['Lehre', 'Lehrer'], ['bitte', 'bitter'], ['guten', 'guter']] },
  { id: 'p0-mp-h', title: 'h vs. no h', note: 'German «h» at the start of a word is always pronounced (a breath), unlike Spanish «h». It is never the Spanish «j».',
    pairs: [['Hals', 'als'], ['Hund', 'und'], ['Haus', 'aus'], ['hier', 'ihr'], ['halt', 'alt']] },
].map((p) => ({ ...p, phase: 0, tag: 'pairs', kind: 'pairs', summary: `${p.pairs.length} pairs · listen and choose`, body: p.note, examples: [] }));

// ---- Function words in 5 chunks of 20 ----
const FW_CHUNKS = Array.from({ length: 5 }, (_, i) => ({
  id: `p0-fw-${i + 1}`, phase: 0, tag: 'function', kind: 'vocab',
  title: `Function words ${i * 20 + 1}–${i * 20 + 20}`,
  summary: 'Read, listen, then add to your SRS deck.',
  body: 'These small words make up roughly half of any German text. Learn them as atomic cards (one word each, both directions). Notes flag which case a preposition takes.',
  words: FUNCTION_WORDS.slice(i * 20, i * 20 + 20),
  examples: [],
}));

export const SEED_LESSONS = [CASE_MAP, NOM, AKK, DAT, GEN, TWOWAY, COMBINED, ...PAIRS, ...FW_CHUNKS];
