// Inflected forms that the rule-based generator in text.js can't produce:
// articles/pronouns, sein/haben/werden, modals, and strong/mixed verbs.
// Format: "lemma: form form form" — each form maps back to the (bare) lemma.

const SRC = `
der: den dem des die das
an: am ans
in: im ins
zu: zum zur
von: vom
bei: beim
ein: eine einen einem einer eines
kein: keine keinen keinem keiner keines
ich: mich mir meiner
du: dich dir deiner
er: ihn ihm seiner
sie: ihr ihnen ihrer
es: 's
wir: uns unser
ihr: euch euer
dieser: diese diesen diesem dieses dies
jeder: jede jeden jedem jedes
welcher: welche welchen welchem welches
mein: meine meinen meinem meiner meines
dein: deine deinen deinem deiner deines
sein: bin bist ist sind seid war warst waren wart gewesen sei seien wäre wären wärst
haben: habe hast hat habt hatte hattest hatten hattet gehabt hätte hätten hättest
werden: werde wirst wird werdet wurde wurdest wurden wurdet geworden worden würde würden würdest
können: kann kannst könnt konnte konntest konnten gekonnt könnte könnten
müssen: muss musst müsst musste musstest mussten gemusst müsste müssten
wollen: will willst wollt wollte wolltest wollten gewollt
sollen: soll sollst sollt sollte solltest sollten gesollt
dürfen: darf darfst dürft durfte durften gedurft dürfte dürften
mögen: mag magst mögt mochte mochten gemocht möchte möchtest möchten möchtet
wissen: weiß weißt wisst wusste wussten gewusst wüsste
gehen: geht ging gingen gegangen
kommen: kam kamen gekommen käme
sehen: sieht siehst sah sahen gesehen
geben: gibt gibst gab gaben gegeben
nehmen: nimmt nimmst nahm nahmen genommen
sprechen: spricht sprichst sprach sprachen gesprochen
essen: isst aß aßen gegessen
lesen: liest las lasen gelesen
fahren: fährt fährst fuhr fuhren gefahren
laufen: läuft läufst lief liefen gelaufen
schlafen: schläft schläfst schlief schliefen geschlafen
tragen: trägt trägst trug trugen getragen
fallen: fällt fällst fiel fielen gefallen
halten: hält hältst hielt hielten gehalten
lassen: lässt ließ ließen gelassen
helfen: hilft hilfst half halfen geholfen
treffen: trifft triffst traf trafen getroffen
werfen: wirft wirfst warf warfen geworfen
vergessen: vergisst vergaß vergaßen
treten: tritt trittst trat traten getreten
stehen: stand standen gestanden
verstehen: verstand verstanden
bleiben: blieb blieben geblieben
schreiben: schrieb schrieben geschrieben
scheinen: schien schienen geschienen
heißen: hieß hießen geheißen
finden: fand fanden gefunden
trinken: trank tranken getrunken
singen: sang sangen gesungen
beginnen: begann begannen begonnen
gewinnen: gewann gewannen gewonnen
sitzen: saß saßen gesessen
liegen: lag lagen gelegen
bitten: bat baten gebeten
tun: tue tust tut tat taten getan
bringen: brachte brachten gebracht
denken: dachte dachten gedacht
kennen: kannte kannten gekannt
nennen: nannte nannten genannt
rennen: rannte rannten gerannt
ziehen: zog zogen gezogen
fliegen: flog flogen geflogen
verlieren: verlor verloren
schließen: schloss schlossen geschlossen
rufen: rief riefen gerufen
schneiden: schnitt schnitten geschnitten
greifen: griff griffen gegriffen
leiden: litt litten gelitten
steigen: stieg stiegen gestiegen
wachsen: wächst wuchs wuchsen gewachsen
waschen: wäscht wusch gewaschen
sterben: stirbt starb starben gestorben
brechen: bricht brach brachen gebrochen
helfen: hilft
erscheinen: erschien erschienen
entscheiden: entschied entschieden
bekommen: bekam bekamen
gefallen: gefällt gefiel gefielen
anfangen: fängt fing fingen angefangen
aussehen: sieht aus sah aus ausgesehen
`;

export const IRREGULAR_FORMS = (() => {
  const map = Object.create(null);
  for (const line of SRC.trim().split('\n')) {
    const [lemma, forms] = line.split(':');
    for (const f of forms.trim().split(/\s+/)) if (f && !(f in map)) map[f] = lemma.trim();
  }
  return map;
})();
