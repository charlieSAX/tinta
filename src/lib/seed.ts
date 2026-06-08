import type { StudyPack } from '../types'
import { db, getMeta, setMeta } from './db'
import { importPack } from './packs'

// Two verified sample packs (B1–C2, broad topics) so first run is never empty.
// Both are marked is_sample and can be deleted from the Library.

export const SAMPLE_PACKS: StudyPack[] = [
  {
    pack_id: 'sample-bruselas-washington-aranceles',
    meta: {
      title: 'Bruselas y Washington buscan un nuevo equilibrio sobre los aranceles',
      source: 'Muestra · NYT en Español (ejemplo)',
      url: '',
      date_published: '2026-06-05',
      date_processed: '2026-06-08',
      tags: ['politica', 'economia', 'diplomacia'],
      length_words: 240,
      level: 'B2',
    },
    summary_en:
      'The European Union and the United States have reopened talks aimed at easing tariffs that have raised consumer prices on both sides. Brussels signalled willingness to make concessions in exchange for Washington resuming dialogue, while officials warned that retaliation would undermine fragile trust. Analysts expect a decision to be postponed until after the summer.',
    resumen_es:
      'La Unión Europea y Estados Unidos han reanudado las conversaciones para suavizar los aranceles que han encarecido los productos a ambos lados. Bruselas se mostró dispuesta a ceder a cambio de que Washington retome el diálogo, aunque se advirtió que las represalias socavarían una confianza ya frágil. Lo más probable es que la decisión se aplace hasta después del verano.',
    article_text:
      'Bruselas y Washington han vuelto a sentarse a la mesa. Tras meses de tensión, ambas partes intentan entablar un acuerdo que reduzca los aranceles que encarecen los productos importados. La Comisión Europea considera imprescindible reanudar el diálogo y se ha mostrado dispuesta a ceder en algunos puntos. Sin embargo, ningún negociador quiere tomar represalias que socaven la confianza. El pulso entre las dos potencias continúa, y lo más probable es que la decisión se aplace.',
    vocab: [
      { id: 'arancel', front: 'arancel', pos: 'noun', back: 'tariff, customs duty', example: 'Los aranceles encarecen los productos importados.', tier: 'B2', tags: ['economia'] },
      { id: 'encarecer', front: 'encarecer', pos: 'verb', back: 'to make more expensive, to drive up the price of', example: 'La guerra comercial encarece la electrónica.', tier: 'B2', tags: ['economia'] },
      { id: 'reanudar', front: 'reanudar', pos: 'verb', back: 'to resume, to restart (talks, an activity)', example: 'Acordaron reanudar las conversaciones en otoño.', tier: 'B2', tags: ['politica'] },
      { id: 'represalia', front: 'represalia', pos: 'noun', back: "reprisal, retaliation (often 'tomar represalias')", example: 'Amenazaron con tomar represalias arancelarias.', tier: 'B2', tags: ['politica'] },
      { id: 'socavar', front: 'socavar', pos: 'verb', back: 'to undermine, to erode (trust, authority)', example: 'Las amenazas socavan la confianza mutua.', tier: 'C1', tags: ['politica'] },
      { id: 'imprescindible', front: 'imprescindible', pos: 'adj', back: 'essential, indispensable', example: 'Es imprescindible alcanzar un acuerdo.', tier: 'B2', tags: [] },
      { id: 'pulso', front: 'pulso', pos: 'noun', back: '(figurative) trial of strength, standoff', example: 'Mantienen un pulso por el control del mercado.', tier: 'B2', tags: ['politica'] },
      { id: 'ceder', front: 'ceder', pos: 'verb', back: 'to give in, to yield, to concede', example: 'Ninguna parte quiere ceder primero.', tier: 'B2', tags: ['politica'] },
      { id: 'aplazar', front: 'aplazar', pos: 'verb', back: 'to postpone, to put off', example: 'Decidieron aplazar la votación.', tier: 'B2', tags: [] },
      { id: 'ambos-lados', front: 'ambos lados', pos: 'phrase', back: "both sides (common: 'a ambos lados')", example: 'Los aranceles afectan a ambos lados.', tier: 'B1', tags: ['conector'] },
      { id: 'a-cambio-de', front: 'a cambio de', pos: 'phrase', back: 'in exchange for', example: 'Bruselas cede a cambio de un acuerdo.', tier: 'B2', tags: ['conector'] },
    ],
    grammar: [
      { sentence: 'No hay ningún negociador que quiera tomar represalias.', point: 'present subjunctive in an adjective clause after a negative/non-existent antecedent', explanation: "When the noun being described does not exist or is uncertain, the verb in the relative clause goes into the subjunctive ('quiera', not 'quiere').", why_tricky: "English uses the indicative here, so learners default to 'quiere'." },
      { sentence: 'Bruselas cede a cambio de que Washington retome el diálogo.', point: "subjunctive after 'a cambio de que' / purpose-and-condition clauses", explanation: "Conjunctions expressing condition or purpose for a not-yet-real action ('a cambio de que', 'para que') take the subjunctive ('retome').", why_tricky: 'The trigger is the conjunction, not the main verb, which English speakers miss.' },
      { sentence: 'Lo más probable es que la decisión se aplace.', point: 'subjunctive after impersonal expressions of probability + the passive/impersonal "se"', explanation: "'Es probable que' takes the subjunctive ('se aplace'); 'se aplace' is the impersonal/passive 'se' (the decision will be postponed).", why_tricky: "English would say 'will be postponed' with no subjunctive and an explicit agent." },
    ],
    idioms: [
      { phrase: 'sentarse a la mesa', meaning: 'to sit down to negotiate, to come to the table', example: 'Tras meses de tensión, volvieron a sentarse a la mesa.' },
      { phrase: 'poner sobre la mesa', meaning: 'to put (an issue) on the table', example: 'Pusieron sobre la mesa una rebaja arancelaria.' },
    ],
    comprehension: [
      { q: '¿Qué quieren reducir Bruselas y Washington?', type: 'factual' },
      { q: '¿Qué está dispuesta a hacer la Comisión Europea para avanzar?', type: 'factual' },
      { q: '¿Por qué evitan ambas partes tomar represalias?', type: 'inferential' },
    ],
    opinion_prompt:
      '¿Crees que bajar los aranceles beneficiará a los consumidores de ambos lados? Escribe ~100 palabras.',
  },
  {
    pack_id: 'sample-hallazgo-primeros-humanos',
    meta: {
      title: 'Un hallazgo en un yacimiento reescribe la historia de los primeros humanos',
      source: 'Muestra · BBC Mundo (ejemplo)',
      url: '',
      date_published: '2026-05-28',
      date_processed: '2026-06-08',
      tags: ['ciencia', 'historia', 'sociedad'],
      length_words: 230,
      level: 'C1',
    },
    summary_en:
      'Archaeologists have unearthed fossil remains at a site in southern Africa that may push back the timeline of early humans by tens of thousands of years. Following the find, researchers are rethinking long-held assumptions about how and when our ancestors spread. Although some call the evidence compelling, others urge caution until the remains are independently dated.',
    resumen_es:
      'Unos arqueólogos han sacado a la luz restos fósiles en un yacimiento del sur de África que podrían adelantar decenas de miles de años la cronología de los primeros humanos. A raíz del hallazgo, los investigadores replantean ideas asentadas sobre cómo y cuándo se expandieron nuestros antepasados. Pese a que algunos consideran contundentes las pruebas, otros piden cautela hasta que los restos se daten de forma independiente.',
    article_text:
      'Un equipo internacional llevó a cabo durante años excavaciones en un remoto yacimiento. Mientras excavaban, encontraron unos restos que, según los primeros análisis, tendrán decenas de miles de años más de lo previsto. El hallazgo, lo que más ha sorprendido a la comunidad científica, da lugar a nuevas preguntas sobre nuestros antepasados. En cambio, algunos especialistas advierten que aún falta desentrañar muchos detalles y que conviene datar los restos con más precisión antes de reescribir los libros.',
    vocab: [
      { id: 'hallazgo', front: 'hallazgo', pos: 'noun', back: 'find, discovery', example: 'El hallazgo reescribe parte de la historia.', tier: 'B2', tags: ['ciencia'] },
      { id: 'yacimiento', front: 'yacimiento', pos: 'noun', back: '(archaeological) site, deposit', example: 'Excavaron un yacimiento muy antiguo.', tier: 'C1', tags: ['ciencia', 'historia'] },
      { id: 'excavar', front: 'excavar', pos: 'verb', back: 'to dig, to excavate', example: 'El equipo excavó durante meses.', tier: 'B2', tags: ['ciencia'] },
      { id: 'restos', front: 'restos', pos: 'noun', back: 'remains', example: 'Hallaron restos fósiles.', tier: 'B2', tags: ['ciencia'] },
      { id: 'antepasado', front: 'antepasado', pos: 'noun', back: 'ancestor', example: 'Nuestros antepasados se expandieron lentamente.', tier: 'B2', tags: ['historia'] },
      { id: 'cronologia', front: 'cronología', pos: 'noun', back: 'timeline, chronology', example: 'El hallazgo altera la cronología.', tier: 'B2', tags: ['historia', 'ciencia'] },
      { id: 'a-raiz-de', front: 'a raíz de', pos: 'phrase', back: 'as a result of, following', example: 'A raíz del hallazgo, cambiaron la teoría.', tier: 'B2', tags: ['conector'] },
      { id: 'pese-a', front: 'pese a', pos: 'phrase', back: 'despite, in spite of', example: 'Pese a las dudas, publicaron el estudio.', tier: 'B2', tags: ['conector'] },
      { id: 'en-cambio', front: 'en cambio', pos: 'phrase', back: 'on the other hand, whereas', example: 'En cambio, otros piden cautela.', tier: 'B1', tags: ['conector'] },
      { id: 'dar-lugar-a', front: 'dar lugar a', pos: 'phrase', back: 'to give rise to', example: 'El hallazgo da lugar a nuevas preguntas.', tier: 'B2', tags: ['conector'] },
      { id: 'llevar-a-cabo', front: 'llevar a cabo', pos: 'phrase', back: 'to carry out', example: 'Llevaron a cabo las excavaciones.', tier: 'B2', tags: ['conector'] },
      { id: 'replantear', front: 'replantear', pos: 'verb', back: 'to rethink, to reconsider', example: 'Hubo que replantear la cronología.', tier: 'C1', tags: [] },
      { id: 'contundente', front: 'contundente', pos: 'adj', back: 'compelling, conclusive, forceful', example: 'Presentaron pruebas contundentes.', tier: 'C1', tags: [] },
      { id: 'datar', front: 'datar', pos: 'verb', back: 'to date (determine the age of)', example: 'Dataron los restos en 30.000 años.', tier: 'C1', tags: ['ciencia'] },
      { id: 'desentranar', front: 'desentrañar', pos: 'verb', back: 'to unravel, to decipher', example: 'Falta desentrañar muchos detalles.', tier: 'C2', tags: [] },
    ],
    grammar: [
      { sentence: 'Mientras excavaban, encontraron unos restos.', point: 'imperfect vs preterite (ongoing background vs completed event)', explanation: "The imperfect 'excavaban' is the ongoing background; the preterite 'encontraron' is the single completed event that interrupts it.", why_tricky: "English uses 'were digging' vs 'found', but learners often use one Spanish past tense for both." },
      { sentence: 'El hallazgo, lo que más ha sorprendido a los científicos, da lugar a nuevas preguntas.', point: "'lo que' as a neuter relative (the thing that / what)", explanation: "'lo que' refers to a whole idea rather than a specific noun; use it where English says 'what' or 'which'.", why_tricky: "Learners confuse 'lo que' with 'que' or 'el que', which point to specific nouns." },
      { sentence: 'Los restos tendrán decenas de miles de años.', point: 'future tense for present probability (conjecture)', explanation: "Spanish uses the future ('tendrán') to guess about the present: 'they're probably tens of thousands of years old'.", why_tricky: "English uses 'must be' or 'probably', not the future tense." },
    ],
    idioms: [
      { phrase: 'sacar a la luz', meaning: 'to bring to light, to uncover', example: 'Las excavaciones sacaron a la luz restos únicos.' },
      { phrase: 'arrojar luz sobre', meaning: 'to shed light on', example: 'El estudio arroja luz sobre nuestro origen.' },
    ],
    comprehension: [
      { q: '¿Qué encontraron los arqueólogos y dónde?', type: 'factual' },
      { q: '¿Por qué piden cautela algunos especialistas?', type: 'factual' },
      { q: '¿Qué implica el hallazgo para lo que creíamos saber sobre los primeros humanos?', type: 'inferential' },
    ],
    opinion_prompt:
      '¿Hasta qué punto deberíamos reescribir la historia a partir de un solo hallazgo? Escribe ~100 palabras.',
  },
]

/** Seed the two sample packs on first run only (never re-seeds after deletion). */
export async function seedIfEmpty(): Promise<boolean> {
  const seeded = await getMeta<boolean>('seeded', false)
  const count = await db.packs.count()
  if (seeded || count > 0) return false
  for (const p of SAMPLE_PACKS) await importPack(p, { is_sample: true })
  await setMeta('seeded', true)
  return true
}
