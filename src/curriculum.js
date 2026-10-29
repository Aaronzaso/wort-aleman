// Contenido original de alemán A0–A1 para hispanohablantes.
// Los identificadores estables conservan los repasos al ampliar el curso.
export const lessons = [
  {
    id: "saludos",
    title: "La primera conversación",
    subtitle: "Saluda y rompe el hielo",
    level: "A1",
    minutes: 8,
    icon: "wave",
    color: "#d96743",
    summary: "Empieza con un saludo, pregunta cómo está alguien y despídete.",
    tip: "Du es el trato cercano; Sie es el trato formal y se escribe con mayúscula. En Wie geht es Ihnen?, Ihnen es la forma de dativo del trato formal. En español suele corresponder a «usted» o «ustedes».",
    cards: [
      {
        id: "saludos-01",
        de: "Hallo!",
        es: "¡Hola!",
        note: "Saludo cotidiano. Con personas desconocidas, Guten Tag puede ser una opción más formal.",
      },
      {
        id: "saludos-02",
        de: "Guten Morgen!",
        es: "¡Buenos días!",
        note: "Se usa por la mañana. Morgen, como sustantivo, se escribe con mayúscula.",
      },
      {
        id: "saludos-03",
        de: "Guten Tag!",
        es: "¡Buenos días! / ¡Buenas tardes!",
        note: "Saludo que funciona durante el día, especialmente en situaciones formales.",
      },
      {
        id: "saludos-04",
        de: "Guten Abend!",
        es: "¡Buenas tardes! / ¡Buenas noches!",
        note: "Saludo al final del día. Gute Nacht se dice al irse a dormir o despedirse de noche.",
      },
      {
        id: "saludos-05",
        de: "Wie geht es Ihnen?",
        es: "¿Cómo está usted? / ¿Cómo están ustedes?",
        note: "Ihnen indica trato formal. Con alguien cercano puedes preguntar Wie geht es dir?",
      },
      {
        id: "saludos-06",
        de: "Mir geht es gut, danke.",
        es: "Estoy bien, gracias.",
        note: "La expresión no se traduce palabra por palabra. Aprende el grupo completo.",
      },
      {
        id: "saludos-07",
        de: "Und dir?",
        es: "¿Y tú?",
        note: "Dir es una forma de du. Con trato formal: Und Ihnen?",
      },
      {
        id: "saludos-08",
        de: "Auf Wiedersehen!",
        es: "¡Adiós!",
        note: "Despedida habitual. Tschüss es una alternativa más informal.",
      },
    ],
    exercises: [
      {
        id: "saludos-e01",
        type: "choice",
        prompt: "Llegas a una clase por la mañana. ¿Qué dices?",
        answer: "Guten Morgen!",
        options: ["Guten Morgen!", "Gute Nacht!", "Auf Wiedersehen!"],
        explanation:
          "Guten Morgen saluda por la mañana. Gute Nacht se usa al irse a dormir o despedirse de noche.",
      },
      {
        id: "saludos-e02",
        type: "listen",
        prompt: "Escucha y elige lo que oyes.",
        de: "Auf Wiedersehen!",
        answer: "Auf Wiedersehen!",
        options: ["Guten Abend!", "Auf Wiedersehen!", "Hallo!"],
        explanation: "Auf Wiedersehen es una despedida: «adiós».",
      },
      {
        id: "saludos-e03",
        type: "write",
        prompt: "Escribe en alemán: «Estoy bien, gracias».",
        answer: "Mir geht es gut, danke.",
        explanation:
          "Se dice Mir geht es gut, danke. Aprende esta expresión sin copiar el orden del español.",
      },
      {
        id: "saludos-e04",
        type: "order",
        prompt: "Ordena: «¿Cómo está usted?»",
        answer: "Wie geht es Ihnen?",
        tokens: ["Wie", "geht", "es", "Ihnen?"],
        explanation:
          "Ihnen mantiene el trato formal y lleva mayúscula. Geht es forma el núcleo de la pregunta.",
      },
      {
        id: "saludos-e05",
        type: "choice",
        prompt:
          "Una amiga pregunta cómo estás. Tú respondes y preguntas «¿Y tú?».",
        answer: "Und dir?",
        options: ["Und dir?", "Und mir?", "Und Ihnen?"],
        explanation:
          "Con una amiga se usa dir, forma de du. Ihnen corresponde al trato formal.",
      },
      {
        id: "saludos-e06",
        type: "write",
        prompt: "Escribe en alemán: «¡Hola!» Usa el saludo de una palabra.",
        answer: "Hallo!",
        explanation:
          "Hallo es un saludo cotidiano. Recuerda escribir dos letras l.",
      },
    ],
  },
  {
    id: "presentarse",
    title: "Tú, yo y los demás",
    subtitle: "Preséntate y descubre los pronombres",
    level: "A1",
    minutes: 8,
    icon: "person",
    color: "#6a856c",
    summary: "Di tu nombre, de dónde eres y qué idioma hablas.",
    tip: "Los pronombres de sujeto son ich (yo), du (tú), er/sie/es (él/ella/ello), wir (nosotros), ihr (vosotros/ustedes en trato cercano) y sie (ellos/ellas). Sie con mayúscula es el trato formal. El alemán suele conservar el sujeto: Ich lerne Deutsch.",
    cards: [
      {
        id: "presentarse-01",
        de: "Ich heiße Ana.",
        es: "Me llamo Ana.",
        note: "Ich significa «yo». Heißen se usa para decir cómo se llama alguien.",
      },
      {
        id: "presentarse-02",
        de: "Wie heißt du?",
        es: "¿Cómo te llamas?",
        note: "Du es «tú». El verbo cambia: ich heiße, du heißt.",
      },
      {
        id: "presentarse-03",
        de: "Ich komme aus Costa Rica.",
        es: "Soy de Costa Rica.",
        note: "Kommen aus expresa procedencia. Literalmente: «vengo de Costa Rica».",
      },
      {
        id: "presentarse-04",
        de: "Ich wohne in San José.",
        es: "Vivo en San José.",
        note: "Wohnen significa «vivir» o «residir». Con esta ciudad se usa in.",
      },
      {
        id: "presentarse-05",
        de: "Ich spreche Spanisch.",
        es: "Hablo español.",
        note: "Los idiomas usados como sustantivos llevan mayúscula: Spanisch, Deutsch.",
      },
      {
        id: "presentarse-06",
        de: "Ich lerne Deutsch.",
        es: "Estoy aprendiendo alemán.",
        note: "El presente alemán puede expresar «aprendo» y «estoy aprendiendo».",
      },
      {
        id: "presentarse-07",
        de: "Er heißt Tom.",
        es: "Él se llama Tom.",
        note: "Er es «él». La forma del verbo es heißt, como con du en esta frase.",
      },
      {
        id: "presentarse-08",
        de: "Sie heißt Ana.",
        es: "Ella se llama Ana.",
        note: "Aquí Sie significa «ella»: está al inicio y el verbo es singular. El trato formal sería Sie heißen.",
      },
    ],
    exercises: [
      {
        id: "presentarse-e01",
        type: "choice",
        prompt: "¿Cómo dices «Hablo español»?",
        answer: "Ich spreche Spanisch.",
        options: [
          "Ich spreche Spanisch.",
          "Ich wohne in Spanien.",
          "Ich lerne Deutsch.",
        ],
        explanation:
          "Sprechen es «hablar». Wohnen indica dónde vives y lernen significa «aprender».",
      },
      {
        id: "presentarse-e02",
        type: "listen",
        prompt: "Escucha y elige la frase.",
        de: "Ich heiße Ana.",
        answer: "Ich heiße Ana.",
        options: ["Ich heiße Ana.", "Er heißt Tom.", "Ich spreche Spanisch."],
        explanation: "Ich heiße introduce tu nombre. Ich significa «yo».",
      },
      {
        id: "presentarse-e03",
        type: "write",
        prompt: "Escribe en alemán: «Vivo en San José».",
        answer: "Ich wohne in San José.",
        explanation:
          "Conserva el sujeto ich y usa wohne para la primera persona.",
      },
      {
        id: "presentarse-e04",
        type: "order",
        prompt: "Ordena: «Estoy aprendiendo alemán».",
        answer: "Ich lerne Deutsch.",
        tokens: ["Ich", "lerne", "Deutsch."],
        explanation:
          "En esta oración afirmativa, el verbo conjugado lerne ocupa la segunda posición.",
      },
      {
        id: "presentarse-e05",
        type: "choice",
        prompt: "¿Qué pronombre significa «nosotros/nosotras»?",
        answer: "Wir",
        options: ["Wir", "Ihr", "Er"],
        explanation:
          "Wir significa «nosotros/nosotras». Ihr se dirige de manera cercana a varias personas; er es «él».",
      },
      {
        id: "presentarse-e06",
        type: "write",
        prompt: "Escribe en alemán: «Él se llama Tom».",
        answer: "Er heißt Tom.",
        explanation:
          "Er es «él» y heißt es la forma de heißen con er. En Suiza se escribe heisst.",
      },
    ],
  },
  {
    id: "sonidos",
    title: "Oído, letras y artículos",
    subtitle: "Escucha cómo empieza el alemán",
    level: "A1",
    minutes: 8,
    icon: "audio",
    color: "#8c70a4",
    summary:
      "Reconoce sonidos nuevos y aprende cada sustantivo con su artículo.",
    tip: "En nominativo singular hay tres géneros: der, die y das. No coinciden siempre con el español. En plural, el artículo definido es die para los tres géneros. Los sustantivos alemanes llevan mayúscula.",
    cards: [
      {
        id: "sonidos-01",
        de: "Ich",
        es: "Yo",
        note: "La ch de ich suele ser /ç/, un sonido que no equivale exactamente a la «ch» española ni a la jota.",
      },
      {
        id: "sonidos-02",
        de: "Das Buch",
        es: "El libro",
        note: "Buch es neutro en alemán: das Buch. Su ch se articula más atrás que la de ich.",
      },
      {
        id: "sonidos-03",
        de: "Der Mann",
        es: "El hombre",
        note: "Mann es masculino: der Mann. La doble n indica que la vocal anterior es breve.",
      },
      {
        id: "sonidos-04",
        de: "Die Frau",
        es: "La mujer",
        note: "Frau es femenino: die Frau. Au forma un diptongo.",
      },
      {
        id: "sonidos-05",
        de: "Das Kind",
        es: "El niño / la niña",
        note: "Kind tiene género gramatical neutro. Das no indica aquí el género de la persona.",
      },
      {
        id: "sonidos-06",
        de: "Die Kinder",
        es: "Los niños / las niñas",
        note: "Kinder es el plural de Kind. En nominativo plural se usa die.",
      },
      {
        id: "sonidos-07",
        de: "Schön",
        es: "Bonito / bonita",
        note: "Ö es una vocal propia: redondea los labios sin convertirla simplemente en o. Sch suena /ʃ/.",
      },
      {
        id: "sonidos-08",
        de: "Die Straße",
        es: "La calle",
        note: "ß representa una s sorda: no es una B. En Suiza se escribe Strasse.",
      },
    ],
    exercises: [
      {
        id: "sonidos-e01",
        type: "choice",
        prompt: "¿Cuál es el artículo de Buch en nominativo singular?",
        answer: "Das",
        options: ["Der", "Die", "Das"],
        explanation:
          "Buch es neutro: das Buch. Aprende el artículo con el sustantivo.",
      },
      {
        id: "sonidos-e02",
        type: "listen",
        prompt: "Escucha y elige el grupo que oyes.",
        de: "Das Kind",
        answer: "Das Kind",
        options: ["Der Mann", "Das Kind", "Die Frau"],
        explanation:
          "Das Kind significa «el niño» o «la niña». Su género gramatical es neutro.",
      },
      {
        id: "sonidos-e03",
        type: "write",
        prompt: "Escribe en alemán: «El libro».",
        answer: "Das Buch",
        explanation:
          "Buch es neutro y, como todos los sustantivos alemanes, se escribe con mayúscula.",
      },
      {
        id: "sonidos-e04",
        type: "order",
        prompt: "Ordena: «Los niños aprenden alemán».",
        answer: "Die Kinder lernen Deutsch.",
        tokens: ["Die", "Kinder", "lernen", "Deutsch."],
        explanation:
          "Die Kinder es plural. El verbo es lernen y ocupa la segunda posición de la oración.",
      },
      {
        id: "sonidos-e05",
        type: "choice",
        prompt: "¿Qué indica ß en Straße?",
        answer: "Un sonido de s sorda.",
        options: [
          "Un sonido de s sorda.",
          "Un sonido de b.",
          "Una pausa obligatoria.",
        ],
        explanation: "ß no es una B. Representa /s/, como una s sorda.",
      },
      {
        id: "sonidos-e06",
        type: "write",
        prompt: "Escribe en alemán: «La mujer».",
        answer: "Die Frau",
        explanation:
          "Frau es femenino: die Frau. La F del sustantivo se mantiene en mayúscula.",
      },
    ],
  },
  {
    id: "cafe",
    title: "Tu primer café",
    subtitle: "Pide algo y paga con confianza",
    level: "A1",
    minutes: 8,
    icon: "coffee",
    color: "#b77c46",
    summary: "Practica una compra breve con expresiones de cortesía.",
    tip: "En Ich möchte einen Kaffee, Kaffee es el objeto directo y el masculino ein cambia a einen. En neutro se mantiene ein: ein Wasser. Aprende estas frases completas y fíjate en los artículos.",
    cards: [
      {
        id: "cafe-01",
        de: "Ich möchte einen Kaffee.",
        es: "Quisiera un café.",
        note: "Möchte expresa un deseo cortés. Kaffee es masculino: der Kaffee, einen Kaffee.",
      },
      {
        id: "cafe-02",
        de: "Einen Tee, bitte.",
        es: "Un té, por favor.",
        note: "Tee es masculino y lleva dos letras e. Bitte añade cortesía.",
      },
      {
        id: "cafe-03",
        de: "Ein Wasser, bitte.",
        es: "Un agua, por favor.",
        note: "Wasser es neutro: das Wasser. En este pedido suele ser una porción o una botella.",
      },
      {
        id: "cafe-04",
        de: "Ein Brötchen",
        es: "Un panecillo",
        note: "Brötchen es neutro. El sufijo diminutivo -chen forma sustantivos neutros.",
      },
      {
        id: "cafe-05",
        de: "Hier oder zum Mitnehmen?",
        es: "¿Para tomar aquí o para llevar?",
        note: "Hier es «aquí». Zum Mitnehmen se usa para pedidos para llevar.",
      },
      {
        id: "cafe-06",
        de: "Was kostet das?",
        es: "¿Cuánto cuesta eso?",
        note: "Kosten significa «costar». Was pregunta aquí por el precio.",
      },
      {
        id: "cafe-07",
        de: "Die Rechnung, bitte.",
        es: "La cuenta, por favor.",
        note: "Rechnung es femenino. Esta frase sirve en un café o restaurante.",
      },
      {
        id: "cafe-08",
        de: "Ich bezahle mit Karte.",
        es: "Pago con tarjeta.",
        note: "Mit Karte es la expresión habitual para indicar este medio de pago.",
      },
    ],
    exercises: [
      {
        id: "cafe-e01",
        type: "choice",
        prompt: "Quieres pedir un café de forma cortés. Elige la frase.",
        answer: "Ich möchte einen Kaffee.",
        options: [
          "Ich möchte einen Kaffee.",
          "Ich bin ein Kaffee.",
          "Ich wohne im Café.",
        ],
        explanation:
          "Ich möchte significa «quisiera». Einen Kaffee es el objeto directo masculino.",
      },
      {
        id: "cafe-e02",
        type: "listen",
        prompt: "Escucha y elige el pedido.",
        de: "Einen Tee, bitte.",
        answer: "Einen Tee, bitte.",
        options: [
          "Einen Kaffee, bitte.",
          "Einen Tee, bitte.",
          "Ein Wasser, bitte.",
        ],
        explanation: "Has oído Tee, «té». Bitte significa aquí «por favor».",
      },
      {
        id: "cafe-e03",
        type: "write",
        prompt: "Escribe en alemán: «¿Cuánto cuesta eso?»",
        answer: "Was kostet das?",
        explanation:
          "Was kostet das? es una pregunta breve y natural al comprar.",
      },
      {
        id: "cafe-e04",
        type: "order",
        prompt: "Ordena: «Pago con tarjeta».",
        answer: "Ich bezahle mit Karte.",
        tokens: ["Ich", "bezahle", "mit", "Karte."],
        explanation:
          "Bezahle va en segunda posición. Mit Karte significa «con tarjeta».",
      },
      {
        id: "cafe-e05",
        type: "choice",
        prompt: "Completa el pedido: Ich möchte ___ Kaffee.",
        answer: "einen",
        options: ["ein", "einen", "eine"],
        explanation:
          "Kaffee es masculino. Como objeto directo, el artículo indefinido cambia de ein a einen.",
      },
      {
        id: "cafe-e06",
        type: "write",
        prompt: "Escribe en alemán: «La cuenta, por favor».",
        answer: "Die Rechnung, bitte.",
        explanation:
          "Rechnung es femenino: die Rechnung. Los sustantivos conservan la mayúscula.",
      },
    ],
  },
  {
    id: "tiempo",
    title: "Los números de tu día",
    subtitle: "Cantidades, horas y próximos planes",
    level: "A1",
    minutes: 8,
    icon: "clock",
    color: "#49878b",
    summary: "Reconoce números básicos y expresa una hora sencilla.",
    tip: "Para decir la hora usa Es ist: Es ist zwei Uhr. Uhr no cambia aquí después del número. Der Morgen es «la mañana», parte del día; morgen con minúscula significa «mañana», el día siguiente.",
    cards: [
      {
        id: "tiempo-01",
        de: "Eins, zwei, drei",
        es: "Uno, dos, tres",
        note: "Al contar se dice eins. El número uno puede cambiar de forma delante de un sustantivo.",
      },
      {
        id: "tiempo-02",
        de: "Vier, fünf, sechs",
        es: "Cuatro, cinco, seis",
        note: "La ü de fünf no equivale a una u española. Escucha y compara los sonidos.",
      },
      {
        id: "tiempo-03",
        de: "Sieben, acht, neun",
        es: "Siete, ocho, nueve",
        note: "La ch de acht se articula más atrás que la de ich.",
      },
      {
        id: "tiempo-04",
        de: "Zehn, zwanzig",
        es: "Diez, veinte",
        note: "La z alemana suele sonar /ts/, no como una z del español peninsular.",
      },
      {
        id: "tiempo-05",
        de: "Wie spät ist es?",
        es: "¿Qué hora es?",
        note: "Pregunta habitual para saber la hora. Spät contiene la vocal ä.",
      },
      {
        id: "tiempo-06",
        de: "Es ist zwei Uhr.",
        es: "Son las dos.",
        note: "Se usa Es ist incluso si en español decimos «son».",
      },
      {
        id: "tiempo-07",
        de: "Heute",
        es: "Hoy",
        note: "El grupo eu de heute forma un diptongo; escucha el modelo completo.",
      },
      {
        id: "tiempo-08",
        de: "Morgen",
        es: "Mañana (el día siguiente)",
        note: "Al inicio de una tarjeta lleva mayúscula; dentro de una oración, el adverbio se escribe morgen: Bis morgen!",
      },
    ],
    exercises: [
      {
        id: "tiempo-e01",
        type: "choice",
        prompt: "¿Qué número es zwanzig?",
        answer: "Veinte",
        options: ["Diez", "Veinte", "Dos"],
        explanation: "Zwanzig es veinte. Zehn es diez y zwei es dos.",
      },
      {
        id: "tiempo-e02",
        type: "listen",
        prompt: "Escucha y elige la hora que oyes.",
        de: "Es ist zwei Uhr.",
        answer: "Son las dos.",
        options: ["Es la una.", "Son las dos.", "Son las tres."],
        explanation: "Zwei es dos. El audio dice Es ist zwei Uhr.",
      },
      {
        id: "tiempo-e03",
        type: "write",
        prompt: "Escribe en alemán: «Mañana» (el día siguiente).",
        answer: "Morgen",
        explanation:
          "El adverbio es morgen; solo lleva mayúscula si inicia una oración. No lo confundas con der Morgen, «la mañana».",
      },
      {
        id: "tiempo-e04",
        type: "order",
        prompt: "Ordena: «¿Qué hora es?»",
        answer: "Wie spät ist es?",
        tokens: ["Wie", "spät", "ist", "es?"],
        explanation:
          "Wie spät ist es? es la pregunta habitual para saber la hora.",
      },
      {
        id: "tiempo-e05",
        type: "choice",
        prompt: "¿Cómo se dice «Es la una»?",
        answer: "Es ist ein Uhr.",
        options: ["Es ist ein Uhr.", "Es sind eins Uhr.", "Es ist eine Uhren."],
        explanation:
          "Delante de Uhr, para la una se dice ein, sin la s de eins al contar.",
      },
      {
        id: "tiempo-e06",
        type: "write",
        prompt: "Escribe en alemán: «Hoy».",
        answer: "Heute",
        explanation:
          "Heute significa «hoy». En el interior de una oración se escribe heute con minúscula.",
      },
    ],
  },
  {
    id: "ciudad",
    title: "Encuentra tu camino",
    subtitle: "Pregunta y entiende una indicación",
    level: "A1",
    minutes: 8,
    icon: "map",
    color: "#4777a1",
    summary: "Pregunta por un lugar, reconoce direcciones y pide ayuda.",
    tip: "En preguntas con una palabra interrogativa, el verbo suele ir después: Wo ist…? En preguntas de sí o no, el verbo va primero: Können Sie…? Con el trato formal, Sie conserva la mayúscula.",
    cards: [
      {
        id: "ciudad-01",
        de: "Wo ist der Bahnhof?",
        es: "¿Dónde está la estación de tren?",
        note: "Wo pregunta por un lugar. Bahnhof es masculino: der Bahnhof.",
      },
      {
        id: "ciudad-02",
        de: "Links",
        es: "A la izquierda",
        note: "Indicación breve de dirección. No necesita copiar la preposición española.",
      },
      {
        id: "ciudad-03",
        de: "Rechts",
        es: "A la derecha",
        note: "Escucha el grupo final de consonantes. Compáralo con links.",
      },
      {
        id: "ciudad-04",
        de: "Geradeaus",
        es: "Todo recto",
        note: "Indica que sigas de frente, sin girar.",
      },
      {
        id: "ciudad-05",
        de: "Es ist in der Nähe.",
        es: "Está cerca.",
        note: "In der Nähe significa «cerca». Nähe lleva mayúscula por ser sustantivo.",
      },
      {
        id: "ciudad-06",
        de: "Eine Buchhandlung",
        es: "Una librería",
        note: "Vende libros. Una biblioteca es eine Bibliothek.",
      },
      {
        id: "ciudad-07",
        de: "Eine Fahrkarte, bitte.",
        es: "Un boleto de transporte, por favor.",
        note: "Fahrkarte es femenino. El género no coincide con el de «boleto».",
      },
      {
        id: "ciudad-08",
        de: "Können Sie mir helfen?",
        es: "¿Puede ayudarme? / ¿Pueden ayudarme?",
        note: "Können va al inicio de esta pregunta. El infinitivo helfen se coloca al final.",
      },
    ],
    exercises: [
      {
        id: "ciudad-e01",
        type: "choice",
        prompt: "Te indican Geradeaus. ¿Qué haces?",
        answer: "Sigues recto.",
        options: [
          "Sigues recto.",
          "Giras a la derecha.",
          "Giras a la izquierda.",
        ],
        explanation:
          "Geradeaus es «todo recto». Rechts es «a la derecha» y links, «a la izquierda».",
      },
      {
        id: "ciudad-e02",
        type: "listen",
        prompt: "Escucha y elige la dirección.",
        de: "Links",
        answer: "A la izquierda.",
        options: ["A la derecha.", "A la izquierda.", "Todo recto."],
        explanation:
          "Links significa «a la izquierda». Repite el audio antes de decirlo tú.",
      },
      {
        id: "ciudad-e03",
        type: "write",
        prompt: "Escribe en alemán: «¿Dónde está la estación de tren?»",
        answer: "Wo ist der Bahnhof?",
        explanation:
          "Wo pregunta por el lugar. Bahnhof conserva el artículo masculino der.",
      },
      {
        id: "ciudad-e04",
        type: "order",
        prompt: "Ordena: «Está cerca».",
        answer: "Es ist in der Nähe.",
        tokens: ["Es", "ist", "in", "der", "Nähe."],
        explanation: "In der Nähe es un grupo que significa «cerca».",
      },
      {
        id: "ciudad-e05",
        type: "choice",
        prompt: "Quieres comprar un libro. ¿Qué lugar buscas?",
        answer: "Eine Buchhandlung",
        options: ["Eine Buchhandlung", "Einen Bahnhof", "Eine Bäckerei"],
        explanation:
          "Una Buchhandlung es una librería. Bahnhof es una estación y Bäckerei es una panadería.",
      },
      {
        id: "ciudad-e06",
        type: "write",
        prompt: "Escribe en alemán: «¿Puede ayudarme?»",
        answer: "Können Sie mir helfen?",
        explanation:
          "El modal Können empieza la pregunta; el infinitivo helfen va al final. Sie indica trato formal.",
      },
    ],
  },
  {
    id: "rutina",
    title: "Así es tu día",
    subtitle: "Habla de hábitos y preferencias",
    level: "A1",
    minutes: 8,
    icon: "sun",
    color: "#b78c31",
    summary: "Describe acciones cotidianas y lo que te gusta hacer.",
    tip: "En una afirmación, el verbo conjugado va en segunda posición: Ich lerne heute Deutsch. Si empiezas con hoy, cambia el orden: Heute lerne ich Deutsch. La segunda posición cuenta grupos de palabras.",
    cards: [
      {
        id: "rutina-01",
        de: "Ich stehe um sieben Uhr auf.",
        es: "Me levanto a las siete.",
        note: "Aufstehen es separable: stehe va en segunda posición y auf al final. Um indica la hora.",
      },
      {
        id: "rutina-02",
        de: "Ich frühstücke.",
        es: "Desayuno.",
        note: "Frühstücken significa «desayunar». Conserva el pronombre ich.",
      },
      {
        id: "rutina-03",
        de: "Ich arbeite am Morgen.",
        es: "Trabajo por la mañana.",
        note: "Am Morgen se refiere a la parte del día. Morgen es aquí un sustantivo.",
      },
      {
        id: "rutina-04",
        de: "Ich lerne Deutsch.",
        es: "Estudio / aprendo alemán.",
        note: "Lernen puede traducirse como «aprender» o «estudiar», según el contexto.",
      },
      {
        id: "rutina-05",
        de: "Ich höre gern Musik.",
        es: "Me gusta escuchar música.",
        note: "Gern expresa que disfrutas una actividad. No copies literalmente la estructura «me gusta».",
      },
      {
        id: "rutina-06",
        de: "Ich trinke keinen Kaffee.",
        es: "No tomo café.",
        note: "Kein niega aquí el sustantivo. Keinen es la forma masculina de objeto directo.",
      },
      {
        id: "rutina-07",
        de: "Ich bin müde.",
        es: "Estoy cansado / cansada.",
        note: "Müde después de bin no cambia por el género de quien habla.",
      },
      {
        id: "rutina-08",
        de: "Ich gehe schlafen.",
        es: "Me voy a dormir.",
        note: "Schlafen significa «dormir». Aprende esta expresión como un grupo.",
      },
    ],
    exercises: [
      {
        id: "rutina-e01",
        type: "choice",
        prompt: "¿Cómo se dice «Me gusta escuchar música»?",
        answer: "Ich höre gern Musik.",
        options: ["Ich höre gern Musik.", "Musik hört mich.", "Ich bin Musik."],
        explanation:
          "Hören es «escuchar» y gern indica que disfrutas la actividad.",
      },
      {
        id: "rutina-e02",
        type: "listen",
        prompt: "Escucha y elige el significado.",
        de: "Ich bin müde.",
        answer: "Estoy cansado / cansada.",
        options: [
          "Estoy cansado / cansada.",
          "Tengo hambre.",
          "Voy a trabajar.",
        ],
        explanation:
          "Müde significa «cansado/cansada». La ü es distinta de una u sin diéresis.",
      },
      {
        id: "rutina-e03",
        type: "write",
        prompt: "Escribe en alemán: «Trabajo por la mañana».",
        answer: "Ich arbeite am Morgen.",
        explanation:
          "Arbeite concuerda con ich. Am Morgen significa «por la mañana».",
      },
      {
        id: "rutina-e04",
        type: "order",
        prompt: "Ordena: «Hoy aprendo alemán». Empieza con Heute.",
        answer: "Heute lerne ich Deutsch.",
        tokens: ["Heute", "lerne", "ich", "Deutsch."],
        explanation:
          "Heute ocupa la primera posición. Lerne sigue en la segunda y el sujeto ich va detrás.",
      },
      {
        id: "rutina-e05",
        type: "choice",
        prompt: "Completa: Ich trinke ___ Kaffee. (No tomo café).",
        answer: "keinen",
        options: ["keinen", "kein", "keine"],
        explanation:
          "Kaffee es masculino y objeto directo, por eso se usa keinen.",
      },
      {
        id: "rutina-e06",
        type: "write",
        prompt: "Escribe en alemán: «Desayuno».",
        answer: "Ich frühstücke.",
        explanation:
          "Con ich, frühstücken se conjuga frühstücke. El alemán suele mantener el sujeto.",
      },
    ],
  },
  {
    id: "viaje",
    title: "Sigue la conversación",
    subtitle: "Pide tiempo, aclara y conecta",
    level: "A1",
    minutes: 8,
    icon: "chat",
    color: "#bd6175",
    summary: "Usa frases de apoyo para mantener una conversación real.",
    tip: "Pedir que repitan también es conversar. Atención a bekommen: significa «recibir», no «convertirse». Para «convertirse en» se usa werden. No adivines el significado solo por el parecido con otro idioma.",
    cards: [
      {
        id: "viaje-01",
        de: "Ich verstehe nicht.",
        es: "No entiendo.",
        note: "Verstehen significa «entender». Nicht niega aquí la acción.",
      },
      {
        id: "viaje-02",
        de: "Können Sie das wiederholen?",
        es: "¿Puede repetir eso? / ¿Pueden repetir eso?",
        note: "La pregunta empieza con Können y termina con el infinitivo wiederholen.",
      },
      {
        id: "viaje-03",
        de: "Bitte sprechen Sie langsamer.",
        es: "Por favor, hable más despacio.",
        note: "Langsamer significa «más despacio». Es una petición con trato formal.",
      },
      {
        id: "viaje-04",
        de: "Wie sagt man „gracias“ auf Deutsch?",
        es: "¿Cómo se dice «gracias» en alemán?",
        note: "Man permite hablar de manera general; aquí equivale a «se» en español.",
      },
      {
        id: "viaje-05",
        de: "Ich bin einverstanden.",
        es: "Estoy de acuerdo.",
        note: "Se usa bin, una forma de sein. No traduzcas palabra por palabra desde el español.",
      },
      {
        id: "viaje-06",
        de: "Ich brauche Hilfe.",
        es: "Necesito ayuda.",
        note: "Brauchen significa «necesitar». Hilfe es un sustantivo y lleva mayúscula.",
      },
      {
        id: "viaje-07",
        de: "Ich bekomme eine E-Mail.",
        es: "Recibo un correo electrónico.",
        note: "Bekommen es «recibir». No significa «convertirse», aunque se parezca a become en inglés.",
      },
      {
        id: "viaje-08",
        de: "Danke für Ihre Hilfe.",
        es: "Gracias por su ayuda.",
        note: "Ihre mantiene la mayúscula del trato formal. Con alguien cercano: Danke für deine Hilfe.",
      },
    ],
    exercises: [
      {
        id: "viaje-e01",
        type: "choice",
        prompt: "La otra persona habla muy rápido. ¿Qué puedes decir?",
        answer: "Bitte sprechen Sie langsamer.",
        options: [
          "Bitte sprechen Sie langsamer.",
          "Auf Wiedersehen!",
          "Ich komme aus Costa Rica.",
        ],
        explanation: "Langsamer pide un ritmo más lento. Bitte añade cortesía.",
      },
      {
        id: "viaje-e02",
        type: "listen",
        prompt: "Escucha y elige el significado.",
        de: "Ich verstehe nicht.",
        answer: "No entiendo.",
        options: ["No entiendo.", "No trabajo.", "No estoy de acuerdo."],
        explanation: "Verstehen es «entender». Nicht niega esta acción.",
      },
      {
        id: "viaje-e03",
        type: "write",
        prompt: "Escribe en alemán: «Estoy de acuerdo».",
        answer: "Ich bin einverstanden.",
        explanation: "La expresión es einverstanden sein. Con ich se usa bin.",
      },
      {
        id: "viaje-e04",
        type: "order",
        prompt: "Ordena: «Necesito ayuda».",
        answer: "Ich brauche Hilfe.",
        tokens: ["Ich", "brauche", "Hilfe."],
        explanation:
          "Brauche es la forma de brauchen con ich. Hilfe, «ayuda», lleva mayúscula.",
      },
      {
        id: "viaje-e05",
        type: "choice",
        prompt: "¿Qué significa Ich bekomme eine E-Mail?",
        answer: "Recibo un correo electrónico.",
        options: [
          "Recibo un correo electrónico.",
          "Me convierto en un correo electrónico.",
          "Escribo un correo electrónico.",
        ],
        explanation:
          "Bekommen significa «recibir». «Escribir» es schreiben y «convertirse» se expresa con werden.",
      },
      {
        id: "viaje-e06",
        type: "write",
        prompt: "Escribe en alemán: «Gracias por su ayuda». Usa trato formal.",
        answer: "Danke für Ihre Hilfe.",
        explanation:
          "Ihre lleva mayúscula porque se refiere al trato formal. Hilfe también lleva mayúscula por ser sustantivo.",
      },
    ],
  },
];

export const pronunciationTips = [
  {
    title: "La CH cambia según el entorno",
    de: "Ich · Buch",
    explanation:
      "En ich suele oírse /ç/, con la lengua hacia el paladar; en Buch aparece /x/, articulado más atrás. No sustituyas ambas por la ch española. Hay variación regional.",
  },
  {
    title: "Ü y U son vocales distintas",
    de: "Müde · Gut",
    explanation:
      "Para ü, coloca la lengua hacia delante, como al decir i, y redondea los labios. La u de gut se articula más atrás. Las letras españolas no representan con precisión todo el contraste.",
  },
  {
    title: "ß no es una B",
    de: "Straße · Heißen",
    explanation:
      "ß representa /s/, una s sorda. En Suiza se utiliza ss en su lugar. Escucha la palabra completa y conserva su escritura al practicar.",
  },
  {
    title: "SCH se pronuncia como un solo sonido",
    de: "Schön · Schule",
    explanation:
      "Sch suele representar /ʃ/: un sonido continuo que no equivale a la ch española. No leas las tres letras por separado.",
  },
  {
    title: "La W suena con el labio y los dientes",
    de: "Wasser · Wohnen",
    explanation:
      "La w alemana suele pronunciarse /v/: el labio inferior se acerca a los dientes superiores y la voz vibra. No equivale al sonido habitual de b/v en español.",
  },
];
