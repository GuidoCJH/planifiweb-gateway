import { LegalDocumentShell } from "@/components/LegalDocumentShell";

const sections = [
  {
    title: "Finalidad de esta política",
    paragraphs: [
      "La presente Política de Privacidad explica de forma amplia cómo PLANIFIWEB recopila, utiliza, conserva, protege y trata la información personal y operativa vinculada al uso del servicio. Su finalidad es informar al usuario con transparencia sobre el alcance del tratamiento, los datos involucrados, la lógica funcional de la plataforma y las medidas adoptadas para proteger la continuidad, seguridad y administración del acceso.",
      "La plataforma está diseñada para ofrecer una experiencia de cuenta, suscripción y trabajo curricular asistido. Para lograrlo, es necesario tratar determinados datos de identificación, autenticación, uso y soporte, en la medida razonablemente necesaria para la prestación del servicio y la defensa de su seguridad operativa.",
    ],
  },
  {
    title: "Categorías de datos tratados",
    paragraphs: [
      "PLANIFIWEB puede tratar datos de identificación y contacto, tales como nombre, correo electrónico y credenciales de acceso protegidas mediante mecanismos de hash. También puede tratar información sobre el estado de la cuenta, la suscripción contratada, fechas de activación, historial operativo, volumen de uso, límites diarios, rol administrativo, eventos de autenticación y registros técnicos asociados al uso regular del sistema.",
      "Cuando el usuario activa una suscripción mediante verificación manual, el sistema puede tratar comprobantes, capturas o imágenes de pago, junto con metadatos asociados a fecha, método, importe, identificador del usuario, resultado de revisión y trazabilidad administrativa. Asimismo, puede tratar contenido ingresado voluntariamente por el usuario en formularios, prompts, campos curriculares, borradores y documentos generados dentro de la plataforma.",
    ],
  },
  {
    title: "Finalidades del tratamiento",
    paragraphs: [
      "Los datos se tratan para crear y administrar cuentas, autenticar sesiones, proteger accesos, aplicar controles de seguridad, gestionar suscripciones, validar pagos, prevenir abuso, operar límites de uso, responder solicitudes de soporte, registrar eventos relevantes, mantener integridad técnica, mejorar el producto y ofrecer continuidad razonable en la experiencia del usuario.",
      "El contenido curricular o de trabajo que el usuario ingresa en la plataforma puede ser procesado por la lógica interna del servicio y por proveedores tecnológicos necesarios para ejecutar funciones de inteligencia artificial. Dicho tratamiento se realiza con la finalidad exclusiva de prestar la funcionalidad solicitada por el usuario y de sostener el rendimiento operativo del producto.",
    ],
  },
  {
    title: "Cookies y tecnologías similares",
    paragraphs: [
      "PLANIFIWEB utiliza exclusivamente cookies esenciales de sesión y seguridad. Estas cookies permiten autenticar al usuario, mantener la continuidad del acceso, proteger la cuenta, aislar sesiones y hacer posible la operación normal del producto. No se utilizan, en esta implementación, cookies de publicidad comportamental, seguimiento comercial ni analítica no esencial de terceros.",
      "Debido a que la cookie utilizada es estrictamente necesaria para la autenticación y la protección del servicio, no se implementa banner de consentimiento independiente para su uso. La referencia a estas cookies se documenta expresamente en esta política con el fin de mantener transparencia frente al usuario.",
    ],
  },
  {
    title: "Conservación, acceso interno y seguridad",
    paragraphs: [
      "PLANIFIWEB aplica medidas técnicas y organizativas razonables para reducir riesgos de acceso no autorizado, exposición accidental, pérdida operativa, manipulación indebida o uso no permitido de la información. Entre dichas medidas se incluyen control de autenticación, protección de sesiones, políticas de acceso administrativo, restricciones sobre comprobantes y controles orientados a la seguridad operativa del servicio.",
      "Los datos personales y operativos se conservarán durante el tiempo necesario para la prestación del servicio, para la gestión administrativa y comercial de la cuenta, para resolver incidencias, para defender intereses legítimos del servicio, para cumplir obligaciones aplicables y para atender auditoría técnica o trazabilidad razonable cuando resulte necesario.",
    ],
  },
  {
    title: "Proveedores, transferencias y limitaciones",
    paragraphs: [
      "Para prestar determinadas funcionalidades, PLANIFIWEB puede apoyarse en infraestructura, almacenamiento, servicios de ejecución y proveedores de inteligencia artificial de terceros. El uso de estos proveedores se limita a la prestación del servicio y a la operación técnica necesaria para responder a solicitudes iniciadas por el propio usuario dentro de la plataforma.",
      "Aunque se adoptan criterios de selección y configuración razonables, PLANIFIWEB no puede garantizar una ausencia absoluta de incidencias en sistemas de terceros, interrupciones de proveedores, variaciones en modelos de IA o fallos externos a su control directo. El usuario reconoce esta limitación inherente a la prestación de servicios digitales apoyados en infraestructura y componentes tecnológicos externos.",
    ],
  },
  {
    title: "Derechos del usuario y contacto",
    paragraphs: [
      "El usuario puede solicitar información razonable sobre su cuenta y comunicar incidencias operativas o consultas vinculadas al tratamiento de datos a través de los canales de soporte visibles en la plataforma. El canal operativo actualmente expuesto para soporte es Telegram mediante el usuario @guidojh, sin perjuicio de la eventual incorporación futura de otros medios institucionales.",
      "Las solicitudes serán atendidas de forma razonable según el contexto del servicio, la verificación de identidad del solicitante, la viabilidad técnica y las obligaciones que pudieran exigir conservar determinados registros. PLANIFIWEB podrá actualizar esta política cuando resulte necesario por cambios funcionales, de seguridad, comerciales o normativos, dejando publicada la versión vigente correspondiente.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocumentShell
      eyebrow="Privacidad y datos"
      title="Política de Privacidad de PLANIFIWEB"
      subtitle="Este documento describe las prácticas de tratamiento de datos personales y operativos asociadas al uso de la cuenta, la suscripción, la atención de soporte y las herramientas curriculares asistidas por inteligencia artificial."
      lastUpdated="13 de marzo de 2026"
      sections={sections}
    />
  );
}



