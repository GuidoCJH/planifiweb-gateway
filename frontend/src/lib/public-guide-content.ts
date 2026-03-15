import { publicGuideSummaries } from "@/lib/discovery";

export type PublicGuideSlug = (typeof publicGuideSummaries)[number]["slug"];

type GuideSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type GuideContent = {
  heroTitle: string;
  intro: string[];
  checklist: string[];
  sections: GuideSection[];
  related: PublicGuideSlug[];
};

const guideContent: Record<PublicGuideSlug, GuideContent> = {
  "planificacion-curricular-cneb": {
    heroTitle:
      "Planificación curricular CNEB con una mirada más útil para el trabajo real del docente",
    intro: [
      "La planificación curricular no debería sentirse como un documento aislado que solo sirve para cumplir una entrega. En la práctica, tiene que ayudarte a ordenar decisiones sobre competencias, unidades, evidencias, tiempos y prioridades del aula.",
      "Dentro del CNEB, la programación anual funciona como una pieza de articulación: conecta el diagnóstico, el propósito del año, la secuencia de unidades y los criterios con los que se observará el progreso de los estudiantes.",
    ],
    checklist: [
      "Definir qué necesidades del contexto sí deben orientar la planificación.",
      "Traducir competencias y enfoques a decisiones concretas de aula.",
      "Evitar una anual genérica que luego no dialogue con las unidades.",
      "Mantener trazabilidad entre diagnóstico, unidades, evaluación y calendarización.",
    ],
    sections: [
      {
        title: "Qué debe resolver una buena planificación curricular",
        paragraphs: [
          "Una planificación útil da dirección. No solo enumera competencias o copia textos normativos: prioriza qué aprendizajes requieren mayor atención, cómo se organizarán las unidades y qué evidencias permitirán mirar progreso con sentido.",
          "Cuando el plan anual está bien resuelto, el docente puede bajar a la unidad y a la sesión sin reinventar el trabajo cada vez. Eso reduce retrabajo y mantiene coherencia entre lo que se declara y lo que realmente se enseña.",
        ],
      },
      {
        title: "Qué decisiones pedagógicas se juegan en la programación anual",
        paragraphs: [
          "En esta etapa se define qué problemas del contexto, necesidades de aprendizaje o ejes institucionales van a ordenar el año. También se decide cómo se distribuyen las competencias, qué productos tendrán mayor peso y cómo se secuenciarán las unidades.",
          "En primaria esto además implica mirar integración entre áreas; en secundaria, ordenar mejor el tratamiento por área sin perder conexión con enfoques transversales, evaluación y tiempos reales del calendario escolar.",
        ],
        bullets: [
          "Diagnóstico resumido con potencialidades, problemas y necesidades.",
          "Secuencia de unidades coherente con el año escolar.",
          "Matriz de competencias por unidad y componentes transversales.",
          "Calendarización que no rompa la lógica pedagógica del plan.",
        ],
      },
      {
        title: "Errores frecuentes que hacen que el plan anual pierda valor",
        paragraphs: [
          "El error más común es tratar la anual como un documento decorativo: se llena con bloques normativos, pero no aterriza en decisiones concretas. Otro problema frecuente es repetir todas las competencias en todas las unidades sin criterio real de progresión.",
          "También se pierde valor cuando la calendarización se hace aparte, sin conexión con el diagnóstico o con la secuencia de unidades. En ese punto, el documento deja de orientar y pasa a ser solo una obligación administrativa.",
        ],
      },
      {
        title: "Cómo ayuda PLANIFIWEB en esta parte del trabajo",
        paragraphs: [
          "PLANIFIWEB busca que la planificación curricular sea una base operativa, no un archivo suelto. La plataforma te permite partir del contexto, distribuir competencias por unidad, construir calendarización y mantener relación con la generación posterior de unidades, sesiones y evaluación.",
          "Eso vuelve más claro el paso entre la planificación anual y el trabajo diario, que es precisamente donde muchos docentes sienten mayor desgaste cuando el sistema está fragmentado.",
        ],
      },
    ],
    related: ["unidad-de-aprendizaje", "sesion-de-aprendizaje"],
  },
  "sesion-de-aprendizaje": {
    heroTitle:
      "Sesión de aprendizaje: cómo conectar propósito, actividades y evidencia sin perder coherencia",
    intro: [
      "Una sesión de aprendizaje no se sostiene solo con actividades llamativas. Necesita una lógica interna clara: situación significativa, propósito, competencias, desempeños, secuencia didáctica, evidencia y retroalimentación deben empujar en la misma dirección.",
      "Cuando esa relación se rompe, la sesión puede verse completa en papel pero débil en aula. Por eso, en el marco del CNEB, la calidad de una sesión depende más de su coherencia pedagógica que de la cantidad de elementos formales que tenga.",
    ],
    checklist: [
      "Alinear el propósito con el tema y la situación significativa.",
      "Usar desempeños y capacidades que sí correspondan a la competencia elegida.",
      "Evitar actividades sueltas que no produzcan evidencia útil.",
      "Cerrar la sesión con retroalimentación y proyección clara.",
    ],
    sections: [
      {
        title: "Qué debe tener una sesión de aprendizaje bien construida",
        paragraphs: [
          "La sesión necesita responder a una pregunta simple: qué aprendizaje observable se quiere movilizar y cómo se verá ese avance durante el trabajo del estudiante. Desde ahí se ordenan propósito, criterios, evidencias, actividades y cierre.",
          "En la práctica, una buena sesión también cuida el ritmo. El inicio no debe ser un bloque decorativo; el desarrollo no puede quedarse corto ni desconectado; y el cierre debe recoger evidencias, promover metacognición y dejar sentido de continuidad.",
        ],
      },
      {
        title: "Cómo se relacionan situación significativa, propósito y secuencia",
        paragraphs: [
          "La situación significativa da contexto y relevancia. El propósito traduce ese contexto en una meta de aprendizaje concreta. La secuencia didáctica organiza el camino para que el estudiante avance hacia esa meta con actividades, recursos e interacciones coherentes.",
          "Si el propósito habla de argumentar, indagar o diseñar, la secuencia debe producir oportunidades reales para argumentar, indagar o diseñar. Ese vínculo es el que permite que la evidencia final tenga legitimidad pedagógica.",
        ],
        bullets: [
          "Inicio para activar contexto, saberes previos y reto.",
          "Desarrollo con etapas que hagan progresar la competencia.",
          "Cierre que recupere evidencia, reflexión y siguiente paso.",
        ],
      },
      {
        title: "Qué revisar antes de considerar que una sesión está lista",
        paragraphs: [
          "Revisa si el desempeño precisado corresponde realmente a la competencia y a las capacidades trabajadas. Revisa también si la evidencia puede observarse con los criterios planteados y si la actividad central del desarrollo produce información suficiente para retroalimentar.",
          "Otro punto crítico es el tiempo. Muchas sesiones se ven correctas en estructura pero no caben en el tiempo real de aula. La sesión debe poder ejecutarse sin sacrificar el núcleo del aprendizaje.",
        ],
      },
      {
        title: "Cómo entra PLANIFIWEB en este proceso",
        paragraphs: [
          "PLANIFIWEB está pensado para ayudarte a que la sesión no se arme como piezas sueltas. El objetivo es que propósito, desempeños precisados, fases, evidencia y evaluación se construyan con continuidad, y luego se puedan exportar o retomar sin perder el hilo de trabajo.",
          "Eso reduce el desgaste de rehacer formatos y mejora la consistencia entre lo que el docente planifica y lo que necesita usar realmente en el aula.",
        ],
      },
    ],
    related: ["unidad-de-aprendizaje", "evaluacion-por-competencias"],
  },
  "unidad-de-aprendizaje": {
    heroTitle:
      "Unidad de aprendizaje: cómo articular competencias, reto, producto y secuencia",
    intro: [
      "La unidad de aprendizaje es el puente entre la programación anual y la sesión concreta. Allí se organiza un tramo de trabajo con sentido, se delimita un reto, se define un producto y se distribuyen experiencias que realmente hagan avanzar la competencia.",
      "Cuando la unidad está bien pensada, el docente gana claridad para planificar sesiones, recoger evidencias y sostener continuidad. Cuando está mal resuelta, todo lo demás se fragmenta: los criterios se sienten débiles, las actividades parecen sueltas y la evaluación pierde foco.",
    ],
    checklist: [
      "Definir un reto o situación que justifique la unidad.",
      "Precisar un producto final que tenga sentido pedagógico.",
      "Seleccionar competencias y desempeños sin inflar la carga.",
      "Secuenciar experiencias que sí conduzcan al producto y a la evidencia.",
    ],
    sections: [
      {
        title: "Qué hace que una unidad tenga estructura pedagógica",
        paragraphs: [
          "Una unidad no es una lista larga de actividades. Necesita un hilo conductor: problema, reto o situación que convoque aprendizaje; producto final o evidencia integradora; y una secuencia de experiencias que haga progresar las competencias elegidas.",
          "Eso implica seleccionar mejor, no acumular más. El valor de la unidad está en la articulación entre propósito, competencias, criterios, evidencias, recursos y tiempos.",
        ],
      },
      {
        title: "Cómo se unen producto final, secuencia y evaluación",
        paragraphs: [
          "El producto final no debería aparecer solo al final del formato. Tiene que orientar la secuencia desde el inicio: qué harán los estudiantes, qué decisiones tomarán, qué conocimientos movilizarán y cómo se observará calidad en lo que produzcan.",
          "La evaluación por competencias entra aquí como criterio de lectura del proceso. No basta decir que habrá rúbrica o lista de cotejo; hace falta que el instrumento converse con los criterios y con la evidencia esperada en cada experiencia.",
        ],
        bullets: [
          "Producto final visible y comprensible para el estudiante.",
          "Criterios que describan calidad y no solo cumplimiento.",
          "Experiencias de aprendizaje que preparen progresivamente el producto.",
          "Instrumentos acordes con la evidencia que se recogerá.",
        ],
      },
      {
        title: "Errores comunes en unidades de aprendizaje",
        paragraphs: [
          "Un error frecuente es proponer demasiadas competencias o demasiados productos, con lo que la unidad se vuelve inmanejable. Otro es tener una situación significativa potente, pero luego pasar a una secuencia de actividades que no la retoma.",
          "También debilita mucho la unidad cuando las evidencias y los instrumentos se piensan al final como un trámite, en vez de diseñarse junto con la secuencia de trabajo.",
        ],
      },
      {
        title: "Qué aporta PLANIFIWEB en el diseño de unidades",
        paragraphs: [
          "PLANIFIWEB busca que la unidad se convierta en una estructura reutilizable y exportable, no en un documento frágil. La plataforma puede ayudarte a relacionar propósito, competencias, producto, criterios, secuencia y recursos sin perder continuidad con la anual y con las sesiones.",
          "Eso te permite trabajar con una base más consistente y con menos retrabajo cuando necesitas ajustar, exportar o volver a abrir el documento.",
        ],
      },
    ],
    related: ["planificacion-curricular-cneb", "sesion-de-aprendizaje"],
  },
  "evaluacion-por-competencias": {
    heroTitle:
      "Evaluación por competencias: cómo definir criterios, evidencias e instrumentos con más claridad",
    intro: [
      "Hablar de evaluación por competencias no significa solo cambiar la palabra nota por criterio. Significa observar desempeño con base en evidencias, interpretar progreso y retroalimentar de forma útil para que el estudiante siga avanzando.",
      "En el trabajo docente diario, esto exige traducir competencias y desempeños en criterios comprensibles, recoger evidencias pertinentes y usar instrumentos que sirvan realmente para leer la calidad del aprendizaje.",
    ],
    checklist: [
      "Definir criterios observables y comprensibles.",
      "Diferenciar entre actividad, evidencia e instrumento.",
      "Evitar listas de cotejo o rúbricas desconectadas del propósito.",
      "Convertir la retroalimentación en parte del proceso, no en un comentario final suelto.",
    ],
    sections: [
      {
        title: "Qué cambia cuando se evalúa por competencias",
        paragraphs: [
          "La mirada deja de centrarse en acumulación de respuestas correctas y pasa a observar cómo el estudiante moviliza saberes, habilidades y actitudes para actuar frente a una tarea o situación. Eso exige instrumentos más pertinentes y criterios mejor definidos.",
          "También exige continuidad. La evaluación no se improvisa al final de la sesión o de la unidad; se diseña desde el momento en que se decide qué aprendizaje se busca y qué evidencia permitirá observarlo.",
        ],
      },
      {
        title: "Cómo se relacionan criterios, evidencias e instrumentos",
        paragraphs: [
          "Los criterios describen la calidad esperada. La evidencia es la producción, actuación o respuesta que permite observar esa calidad. El instrumento organiza la observación y el juicio docente. Si una de las tres piezas no conversa con las otras, la evaluación se vuelve confusa.",
          "Por eso conviene preguntarse siempre: qué evidencia concreta se espera, qué aspecto de calidad se quiere mirar y qué instrumento resulta más pertinente para recoger información útil.",
        ],
        bullets: [
          "Criterios redactados con foco en calidad del desempeño.",
          "Evidencias alineadas con la tarea real del estudiante.",
          "Instrumentos que sirvan para observar y retroalimentar.",
          "Registro claro del progreso para decisiones posteriores.",
        ],
      },
      {
        title: "Problemas frecuentes en la evaluación escolar",
        paragraphs: [
          "Muchas veces se confunde actividad con evidencia, o se usan instrumentos genéricos que no guardan relación con el propósito. También es frecuente cargar demasiados criterios, lo que vuelve difícil aplicar la evaluación de manera realista en aula.",
          "Otro problema es no dejar espacio para retroalimentación. Si la evaluación solo clasifica, pero no orienta, pierde una parte central de su sentido pedagógico.",
        ],
      },
      {
        title: "Cómo ayuda PLANIFIWEB en este punto",
        paragraphs: [
          "PLANIFIWEB puede ayudarte a ordenar criterios, evidencias e instrumentos dentro del mismo flujo donde construyes sesiones, unidades y evaluaciones. La ventaja práctica es que la evaluación deja de estar aislada y se conecta mejor con el trabajo que ya venías diseñando.",
          "Esa continuidad mejora la consistencia del documento final y reduce el tiempo que normalmente se pierde acomodando formatos o rehaciendo secciones al final.",
        ],
      },
    ],
    related: ["sesion-de-aprendizaje", "unidad-de-aprendizaje"],
  },
};

export function getPublicGuide(slug: string) {
  const summary = publicGuideSummaries.find((guide) => guide.slug === slug);
  if (!summary) {
    return null;
  }

  return {
    ...summary,
    ...guideContent[summary.slug as PublicGuideSlug],
  };
}
