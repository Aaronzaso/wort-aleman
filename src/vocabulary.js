import { lessons as defaultLessons } from "./curriculum.js";

// Articles and plural forms checked against these teaching publishers' glossaries.
// Spanish explanations are original; existing lesson/card IDs remain unchanged.
export const vocabularySources = [
  "https://lernen.goethe.de/deutschonline/A1/PDF/EN/A1_deutschonline_course_vocabulary_1-18.pdf",
  "https://edit.hueber.de/media/36/Akademie_Deutsch_A1_Wortliste.pdf",
];

const extra = (id, categoryId, de, es, note) => ({
  id,
  de,
  es,
  note,
  categoryId,
  lessonId: null,
  lessonTitle: categoryId === "frutas" ? "Frutas" : "Comida",
});

export const extraVocabulary = [
  extra("frutas-01", "frutas", "Der Apfel", "La manzana", "Plural: die Äpfel. Aprende el artículo junto con la palabra: Apfel es masculino en alemán."),
  extra("frutas-02", "frutas", "Die Banane", "El banano / la banana", "Plural: die Bananen. En alemán es femenino: die Banane."),
  extra("frutas-03", "frutas", "Die Orange", "La naranja", "Plural: die Orangen. El sustantivo empieza con mayúscula."),
  extra("frutas-04", "frutas", "Die Birne", "La pera", "Plural: die Birnen. Conserva el artículo die al aprenderla."),
  extra("frutas-05", "frutas", "Die Zitrone", "El limón", "Plural: die Zitronen. Zitrone es femenino en alemán, aunque limón sea masculino en español."),
  extra("frutas-06", "frutas", "Die Kiwi", "El kiwi", "Plural: die Kiwis. El artículo alemán es die."),
  extra("frutas-07", "frutas", "Die Erdbeere", "La fresa", "Plural: die Erdbeeren. Aprende la palabra completa y escucha su pronunciación."),
  extra("frutas-08", "frutas", "Die Himbeere", "La frambuesa", "Plural: die Himbeeren. No la confundas con Erdbeere, que significa fresa."),
  extra("comida-01", "comida", "Das Brot", "El pan", "Plural: die Brote, cuando se cuentan panes o tipos de pan. Das es el artículo neutro."),
  extra("comida-02", "comida", "Der Käse", "El queso", "Como alimento suele usarse en singular. Para contar tipos o porciones, aprende la expresión completa."),
  extra("comida-03", "comida", "Der Reis", "El arroz", "Como alimento se usa normalmente en singular. Reis es masculino en alemán."),
  extra("comida-04", "comida", "Das Ei", "El huevo", "Plural: die Eier. El singular lleva el artículo neutro das."),
  extra("comida-05", "comida", "Die Kartoffel", "La papa / la patata", "Plural: die Kartoffeln. Ambas traducciones españolas se refieren al mismo alimento."),
  extra("comida-06", "comida", "Die Tomate", "El tomate", "Plural: die Tomaten. El artículo alemán es femenino: die."),
  extra("comida-07", "comida", "Die Suppe", "La sopa", "Plural: die Suppen. Para pedir una: Eine Suppe, bitte."),
  extra("comida-08", "comida", "Der Fisch", "El pescado / el pez", "Plural: die Fische. La traducción depende de si hablas del alimento o del animal."),
];

const sequence = (prefix, numbers) =>
  numbers.map((number) => `${prefix}-${String(number).padStart(2, "0")}`);
const eight = [1, 2, 3, 4, 5, 6, 7, 8];

export const vocabularyCategories = [
  {
    id: "saludos",
    title: "Saludos",
    description: "Hallo, buenos días, cómo estás y despedidas.",
    cardIds: sequence("saludos", eight),
  },
  {
    id: "personas",
    title: "Personas y presentación",
    description: "Nombres, origen, idiomas y formas de hablar de alguien.",
    cardIds: [...sequence("presentarse", eight), ...sequence("sonidos", [1, 3, 4, 5, 6])],
  },
  {
    id: "objetos",
    title: "Objetos y descripciones",
    description: "Palabras para nombrar y describir lo que te rodea.",
    cardIds: sequence("sonidos", [2, 7]),
  },
  {
    id: "frutas",
    title: "Frutas",
    description: "Ocho frutas con su artículo y su plural.",
    cardIds: sequence("frutas", eight),
  },
  {
    id: "comida",
    title: "Comida",
    description: "Alimentos y expresiones para pedir y pagar.",
    cardIds: [...sequence("cafe", [4, 5, 6, 7, 8]), ...sequence("comida", eight)],
  },
  {
    id: "bebidas",
    title: "Bebidas",
    description: "Café, té, agua y cómo pedirlos.",
    cardIds: [...sequence("cafe", [1, 2, 3]), "rutina-06"],
  },
  {
    id: "numeros-tiempo",
    title: "Números y tiempo",
    description: "Cantidades, horas, hoy y mañana.",
    cardIds: sequence("tiempo", eight),
  },
  {
    id: "lugares-direcciones",
    title: "Lugares y direcciones",
    description: "Moverte por la ciudad y pedir indicaciones.",
    cardIds: [...sequence("ciudad", eight), "sonidos-08"],
  },
  {
    id: "rutina",
    title: "Rutina y actividades",
    description: "Lo que haces, cómo te sientes y lo que te gusta.",
    cardIds: sequence("rutina", [1, 2, 3, 4, 5, 7, 8]),
  },
  {
    id: "conversacion",
    title: "Conversación y ayuda",
    description: "Pedir que repitan, aclarar y seguir conversando.",
    cardIds: sequence("viaje", eight),
  },
];

const categoryByCard = new Map(
  vocabularyCategories.flatMap((category) =>
    category.cardIds.map((id) => [id, category.id]),
  ),
);

/** Return detached cards so folder filtering cannot mutate the lesson curriculum. */
export function getVocabularyCards(lessonList = defaultLessons) {
  return [
    ...lessonList.flatMap((lesson) =>
      lesson.cards.map((card) => ({
        ...card,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        categoryId: categoryByCard.get(card.id) || "conversacion",
      })),
    ),
    ...extraVocabulary.map((card) => ({ ...card })),
  ];
}
