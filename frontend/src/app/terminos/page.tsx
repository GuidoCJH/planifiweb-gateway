import { LegalDocumentShell } from "@/components/LegalDocumentShell";

const sections = [
  {
    title: "Objeto del servicio",
    paragraphs: [
      "PLANIFIWEB es un servicio digital de apoyo a la planificación curricular orientado a docentes, coordinadores y responsables pedagógicos que trabajan con referencias del sistema educativo peruano, incluyendo el Currículo Nacional de la Educación Básica. El servicio proporciona herramientas de organización, generación asistida por inteligencia artificial, estructuración de materiales y apoyo operativo para la preparación de sesiones, unidades, evaluaciones, fichas y otros documentos académicos relacionados.",
      "El servicio se presta como una plataforma de apoyo y productividad. No constituye una sustitución del criterio pedagógico, la revisión profesional del docente, la autonomía institucional ni la evaluación contextual que corresponde a cada usuario dentro de su centro educativo, red, UGEL o instancia responsable. El usuario entiende que PLANIFIWEB no asume el rol de autoridad educativa ni de consultoría normativa oficial.",
    ],
  },
  {
    title: "Naturaleza de la cuenta y del acceso",
    paragraphs: [
      "El acceso a PLANIFIWEB está sujeto a un registro válido, a la aceptación expresa de este documento y de la Política de Privacidad, y a la verificación del estado comercial de la cuenta. La plataforma puede operar con estados como cuenta en espera de pago, revisión pendiente, acceso activo, acceso rechazado, suspendido o vencido, según el flujo comercial y de cumplimiento interno establecido por el servicio.",
      "Cada usuario es responsable de custodiar sus credenciales y de utilizar la plataforma exclusivamente para fines lícitos, profesionales y compatibles con el uso esperado del producto. El usuario acepta no compartir accesos, no ceder cuentas a terceros, no intentar eludir límites de uso, no automatizar abusivamente interacciones con la plataforma y no utilizar la cuenta para extraer, replicar, revender o redistribuir el servicio sin autorización previa y escrita.",
    ],
  },
  {
    title: "Alcance funcional y limitaciones del sistema",
    paragraphs: [
      "PLANIFIWEB incorpora herramientas asistidas por inteligencia artificial para acelerar procesos de redacción, estructuración y propuesta de materiales. El usuario reconoce expresamente que las salidas generadas por inteligencia artificial pueden contener errores, omisiones, imprecisiones, formulaciones genéricas, sesgos, desalineaciones parciales con el contexto del aula o interpretaciones que requieran corrección humana posterior.",
      "En consecuencia, el usuario acepta que ninguna sesión, unidad, rúbrica, examen, ficha, propuesta curricular, sugerencia metodológica o salida generada por el sistema debe considerarse perfecta, definitiva o automáticamente apta para su uso sin validación profesional. La revisión final, la adecuación al contexto institucional y la responsabilidad pedagógica permanecen siempre bajo control del usuario.",
      "PLANIFIWEB no garantiza resultados idénticos en cada generación, continuidad absoluta de determinados modelos de inteligencia artificial, disponibilidad permanente de terceros proveedores, ausencia total de errores ni compatibilidad universal con todos los estilos de trabajo de cada institución. El servicio se presta sobre una base de mejora continua y uso razonable.",
    ],
  },
  {
    title: "Condiciones comerciales, pagos y no reembolsos",
    paragraphs: [
      "El acceso comercial a PLANIFIWEB puede requerir el pago de una suscripción, cargo único, renovación o modalidad equivalente informada por la plataforma. En la versión actual, determinados pagos pueden ser verificados manualmente mediante comprobantes enviados por el usuario. La activación del acceso no se considera definitiva hasta que el sistema o el equipo administrador valide internamente la operación correspondiente.",
      "Salvo disposición legal imperativa en contrario, todos los pagos realizados se consideran finales y no reembolsables. El usuario acepta expresamente que no existe política de reembolso por cambio de opinión, por uso parcial, por expectativas subjetivas no cumplidas, por variaciones en el estilo de salida de la inteligencia artificial, por disconformidad con redacciones generadas, por desconocimiento del flujo del servicio o por falta de lectura de la documentación contractual.",
      "La ausencia de reembolso se fundamenta en la naturaleza digital del servicio, en la activación operativa de la cuenta, en el acceso a recursos consumibles, en la asignación de capacidad de uso, en el empleo de infraestructura de IA y en el costo administrativo del proceso. El usuario acepta esta condición como parte esencial del contrato.",
    ],
  },
  {
    title: "Uso permitido, prohibiciones y límite de responsabilidad",
    paragraphs: [
      "El usuario se obliga a utilizar la plataforma de forma diligente, legal y compatible con la buena fe contractual. Está prohibido utilizar PLANIFIWEB para generar contenido fraudulento, suplantar identidades, vulnerar derechos de terceros, evadir sistemas de control, probar ataques de seguridad sin autorización, revender accesos, realizar scraping del servicio, compartir exportaciones como si fueran soporte oficial del sistema educativo o emplear el producto para fines incompatibles con el uso docente razonable.",
      "PLANIFIWEB, sus administradores, desarrolladores, operadores y colaboradores no serán responsables por decisiones pedagógicas, administrativas, disciplinarias, institucionales, laborales o contractuales tomadas por el usuario con base en contenido no revisado. Tampoco responderán por daños indirectos, lucro cesante, pérdida de oportunidad, reprocesos internos, observaciones institucionales ni resultados derivados del uso de material no verificado por el propio usuario.",
      "En la máxima medida permitida por la normativa aplicable, la responsabilidad total del servicio frente a un reclamo relacionado directamente con el acceso contratado no excederá, en conjunto, el importe efectivamente pagado por el usuario durante el período comercial inmediatamente anterior al evento reclamado.",
    ],
  },
  {
    title: "Suspensión, cambios y terminación",
    paragraphs: [
      "PLANIFIWEB podrá suspender, limitar, observar o terminar cuentas cuando detecte indicios razonables de fraude, incumplimiento contractual, uso abusivo, elusión de límites, falta de pago, entrega de comprobantes no válidos, conductas que comprometan la seguridad del servicio o cualquier otro hecho que, bajo criterio operativo razonable, ponga en riesgo la plataforma, a terceros o al modelo comercial del producto.",
      "El servicio podrá modificar funcionalidades, interfaz, proveedores tecnológicos, límites de uso, textos legales, alcances operativos o políticas de producto cuando ello sea necesario para mantener viabilidad, seguridad, calidad o cumplimiento. La versión vigente de estos términos será la publicada en el sitio al momento de consulta y podrá requerir una nueva aceptación expresa para continuar usando la plataforma.",
    ],
  },
  {
    title: "Ley aplicable y contacto",
    paragraphs: [
      "Estos Términos y Condiciones se interpretan conforme a la normativa aplicable al servicio y a la operación comercial del titular, sin perjuicio de las disposiciones imperativas que pudieran resultar exigibles según la jurisdicción del usuario. Si alguna cláusula fuera declarada inválida, las restantes conservarán plena vigencia.",
      "Para soporte operativo, consultas sobre la cuenta o comunicaciones relacionadas con el servicio, el canal visible habilitado actualmente es Telegram mediante el usuario @guidojh. El uso del canal de soporte no implica aceptación automática de reclamaciones, reembolsos ni modificaciones individuales al contenido de este contrato.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocumentShell
      eyebrow="Documento legal"
      title="Términos y Condiciones de PLANIFIWEB"
      subtitle="Este documento regula el acceso, la suscripción, el uso de la plataforma, el alcance funcional de las herramientas de inteligencia artificial y las reglas comerciales aplicables al servicio."
      lastUpdated="13 de marzo de 2026"
      sections={sections}
    />
  );
}




