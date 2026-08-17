# -*- coding: utf-8 -*-
import io, sys

def apply(path, pairs):
    s = io.open(path, encoding="utf-8").read()
    for old, new in pairs:
        if old not in s:
            print("MISS in %s: %r" % (path, old[:90])); sys.exit(1)
        s = s.replace(old, new)
    io.open(path, "w", encoding="utf-8").write(s)
    print("patched", path)

ES = [
# 1 invented aircraft tactic
("convoyes de vehículos idénticos que toman rutas distintas, aviones que se intercambian, movimientos anunciados en el último momento",
 "convoyes de vehículos idénticos que toman rutas distintas, rutas alternativas anunciadas en el último momento, apariciones que no figuraban en la agenda"),
("convoys of identical vehicles that take different routes, aircraft that swap places, movements announced at the last minute",
 "convoys of identical vehicles that take different routes, alternative routes announced at the last minute, appearances that were never on the schedule"),
# 8 enclisis note
("Note also esconderlo, where the pronoun lo is attached to the end of the infinitive, a position that is standard with infinitives and gerunds.",
 "Note also esconderlo, where lo must attach to the infinitive: there is no finite verb here for it to climb to."),
("Learners often use pero where sino is needed, and they tend to place the pronoun before the conjugated verb even when the infinitive is what governs it.",
 "Learners often use pero where sino is needed; and because verbal periphrases do allow both positions (quiere esconderlo, lo quiere esconder), they assume the pronoun can always go in front, which is impossible with a bare infinitive like this one."),
# 16 ejecuciones plural
("El país del cedro no llevaba a cabo ninguna ejecución desde 2004",
 "El país del cedro no llevaba a cabo ejecuciones desde 2004"),
# 15 cambia/cambio repetition
("lo que cambia ahora es que el cambio queda escrito en la ley",
 "lo que cambia ahora es que la abolición queda escrita en la ley"),
("what changes now is that the change is written into the law",
 "what changes now is that the abolition is written into the law"),
# 17 concentra -> registra
("porque la región concentra algunas de las tasas de ejecución más altas del mundo",
 "porque la región registra algunas de las tasas de ejecución más altas del mundo"),
("because the region concentrates some of the highest execution rates in the world",
 "because the region records some of the highest execution rates in the world"),
# 6 pluperfect note
("English prefers a perfect here, had not carried out since 2004, so learners reach for había llevado; and lo que has no single-word English equivalent.",
 "Both are possible here: the pluperfect no había llevado a cabo is equally correct and is what most news wires write. The imperfect simply frames it as a lasting state; and lo que has no single-word English equivalent."),
# 7 pasiva refleja
("soler plus infinitive, and the impersonal se with the perfect",
 "soler plus infinitive, and the pasiva refleja with the perfect"),
("Se ha demostrado leaves the agent unstated, close to English it has never been proved.",
 "Se ha demostrado leaves the agent unstated, close to English it has never been proved. The verb agrees with su efecto disuasorio; with a plural subject it would be se han demostrado, which is what separates this from the truly impersonal se."),
("Soler has no English verb equivalent, so learners paraphrase with normalmente; and this use of se is easily confused with the reflexive.",
 "Soler has no English verb equivalent, so learners paraphrase with normalmente; and this use of se is easily confused with the reflexive."),
# 9 ser zanjado
("Compare ser zanjado, which would foreground the act of settling it.",
 "Compare se zanjó el debate, which foregrounds the act of settling it rather than the resulting state."),
# 24 add la condena (14 vocab)
('{"front": "hacer campaña", "pos": "phrase", "back": "to campaign", "example": "La asociación hace campaña por el derecho a la vivienda.", "tier": "B1"}',
 '{"front": "hacer campaña", "pos": "phrase", "back": "to campaign", "example": "La asociación hace campaña por el derecho a la vivienda.", "tier": "B1"},\n    {"front": "la condena", "pos": "noun", "back": "sentence, conviction", "example": "La condena se redujo a cinco años.", "tier": "B1"}'),
# 30 idiom swap
('{"phrase": "el gobierno de turno", "meaning": "whoever happens to be governing at the moment", "example": "Los funcionarios se quejan de que cada gobierno de turno cambia las reglas."}',
 '{"phrase": "llevar a cabo", "meaning": "to carry out, to see through to completion", "example": "El ministerio llevó a cabo una reforma profunda."}'),
# 2 invented governments
("Aun así, otros gobiernos siguen el caso de cerca.",
 "Aun así, es un experimento que merece la pena seguir de cerca."),
("Even so, other governments are following the case closely.",
 "Even so, it is an experiment worth following closely."),
# 27 study programmes
("have scrapped or suspended more than 12,000 degree programmes",
 "have scrapped or suspended more than 12,000 study programmes"),
# 28 idiom swap
('{"phrase": "aun así", "meaning": "even so, despite that", "example": "El proyecto era caro; aun así, lo aprobaron."}',
 '{"phrase": "apostar por algo", "meaning": "to back something, to commit to a strategy", "example": "El país ha apostado por las energías renovables."}'),
]
# 19 opening question marks
QM = [
 "Qué ejemplos concretos de tácticas",
 "Qué tensión plantea el texto",
 "Hasta qué punto crees que los ciudadanos",
 "Qué diferencia hay entre lo que ocurría",
 "Qué argumentos recoge el texto",
 "Por qué dice el texto que la decisión",
 "Crees que abolir una pena",
 "Qué cifras concretas da el texto",
 "Por qué dice el texto que la velocidad",
 "Qué riesgo señala el artículo",
 "Debería la universidad adaptarse",
]
for q in QM:
    ES.append(('"' + q, '"¿' + q))
# fix the one that needs the mark mid-sentence, not at the start
ES.append(("Según el texto, por qué esconder", "Según el texto, ¿por qué esconder"))

IT = [
# 3 attribution
("Secondo gli scienziati il solletico non è solo un gioco.",
 "Il solletico, però, non è solo un gioco."),
("According to the scientists, tickling is not just a game.",
 "Tickling, though, is not just a game."),
("Perché gli scienziati pensano che il solletico sia un meccanismo di difesa?",
 "Perché il solletico potrebbe essere un meccanismo di difesa?"),
# 12 quasi mai
("perché quasi non riusciamo mai a farci il solletico da soli",
 "perché non riusciamo quasi mai a farci il solletico da soli"),
# 11 clitic climbing note
("and they place the pronoun before riusciamo instead of attaching it.",
 "and attaching the pronoun to the infinitive is the safe option here, even though colloquial Italian does allow climbing in other cases (non lo riesco a fare)."),
# 29 idiom swap
('{"phrase": "da solo", "meaning": "on one\'s own, without help", "example": "Il bambino si veste già da solo."}',
 '{"phrase": "morire dal ridere", "meaning": "to die laughing, to find something hilarious", "example": "Quando l\'ha visto cadere è morto dal ridere."}'),
# 14 compaiono
("Marchi comuni, ristoranti e perfino il Big Mac entrano nell'esposizione:",
 "Marchi comuni, ristoranti e perfino il Big Mac compaiono nell'esposizione:"),
("even the Big Mac appear in the display:",
 "even the Big Mac appear in the exhibition:"),
# 4 attribution
("secondo i curatori l'immigrazione ha plasmato gli Stati Uniti",
 "secondo la mostra l'immigrazione ha plasmato gli Stati Uniti"),
("according to the curators, immigration has shaped the United States",
 "according to the exhibition, immigration has shaped the United States"),
("Ma proprio questo, spiegano i curatori, è il punto.",
 "Ma proprio questo, in fondo, è il punto."),
("But that, the curators explain, is exactly the point.",
 "But that, in the end, is exactly the point."),
# 13 word order
("molti piatti famosi in Italia non esistono, oppure sono piuttosto diversi",
 "molti piatti famosi non esistono in Italia, oppure lì sono piuttosto diversi"),
# 25 tiers
('{"front": "plasmare", "pos": "verb", "back": "to shape, to mould", "example": "La guerra ha plasmato quella generazione.", "tier": "B1"}',
 '{"front": "plasmare", "pos": "verb", "back": "to shape, to mould", "example": "La guerra ha plasmato quella generazione.", "tier": "B2"}'),
('{"front": "la mescolanza", "pos": "noun", "back": "mixture, blend", "example": "La sua musica è una mescolanza di stili.", "tier": "B1"}',
 '{"front": "la mescolanza", "pos": "noun", "back": "mixture, blend", "example": "La sua musica è una mescolanza di stili.", "tier": "B2"}'),
# 31 idiom swap cucina
('{"phrase": "portare con sé", "meaning": "to take along, also to bring as a consequence", "example": "Il trasloco porta con sé molte spese."}',
 '{"phrase": "farsi strada", "meaning": "to make one\'s way, to get established", "example": "Molti immigrati si sono fatti strada aprendo un ristorante."}'),
# 20 tag accent
('"tags": ["scuola", "societa"]', '"tags": ["scuola", "società"]'),
# 23 borsa -> zaino
("il diritto di aprire una borsa", "il diritto di aprire uno zaino"),
("the right to open a bag", "the right to open a backpack"),
# 5 invented experts
("Alcuni esperti fanno notare che controllare una borsa non risolve il problema vero",
 "C'è poi chi fa notare che controllare uno zaino non risolve il problema vero"),
("Some experts point out that a bag check does not solve the real problem, which is why so much violence arrives at school in the first place.",
 "Others point out that a bag check does not solve the real problem, namely why so much violence reaches the school in the first place."),
# 21 mirror the last clause
("Il dibattito continuerà.", "Il dibattito continuerà mentre iniziano i primi controlli."),
# 10 ogni + numeral
("Note that ogni is always followed by a singular noun: ogni studente.",
 "Note that ogni is followed by a singular noun (ogni studente); the one exception is with a numeral, as in ogni due giorni."),
# 18 entrare in vigore date
("Il divieto entrerà in vigore dal primo gennaio.", "Il divieto entrerà in vigore il primo gennaio."),
# 26 add la misura (14 vocab)
('{"front": "risolvere", "pos": "verb", "back": "to solve", "example": "Non è facile risolvere questo problema.", "tier": "A2"}',
 '{"front": "risolvere", "pos": "verb", "back": "to solve", "example": "Non è facile risolvere questo problema.", "tier": "A2"},\n    {"front": "la misura", "pos": "noun", "back": "measure, policy step", "example": "La misura è stata approvata in Parlamento.", "tier": "B1"}'),
# 31 idiom swap cile
('{"phrase": "venire prima di tutto", "meaning": "to be the top priority", "example": "In montagna la sicurezza viene prima di tutto."}',
 '{"phrase": "chiudere un occhio", "meaning": "to turn a blind eye", "example": "Prima i presidi chiudevano un occhio sui controlli."}'),
]
apply("packs_es.py", ES)
apply("packs_it.py", IT)
