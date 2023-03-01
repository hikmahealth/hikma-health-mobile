const es = {
  login: {
    signIn: 'Iniciar Sesión',
    email: 'Correo electrónico',
    password: 'Contraseña',
  },
  patientFile: {
    visitHistory: 'Historia de la visita',
    visitHistoryDescription:
      'Visitas recientes del paciente con un proveedor de atención médica',
    medicalHistory: 'Historial médico',
    medicalHistoryDescription: 'Historial médico del paciente',
    complaint: 'Queja',
    complaintDescription: 'Queja o preocupación médica del paciente',
    examination: 'Examen',
    examinationDescription:
      'Exámenes físicos realizados en las visitas pasadas',
    medicine: 'Medicina',
    medicineDescription: 'Medicina prescrita al paciente',
  },
  newVisitScreen: {
    medicalHistory: 'Historial médico',
    medicalHistoryDescription: 'Historial médico del paciente',
    complaint: 'Queja',
    complaintDescription: 'Queja o preocupación médica del paciente',
    vitals: 'Signos vitales',
    vitalsDescription: 'Signos vitales tomados durante la visita',
    examination: 'Examen físico',
    examinationDescription: 'Realice un examen físico al paciente',
    medicineDispensed: 'Medicina dispensada',
    medicineDispensedDescription: 'Medicina prescrita al paciente',
    physiotherapy: 'Fisioterapia',
    physiotherapyDescription: 'Tratamiento de fisioterapia dado al paciente',
    dentalTreatment: 'Tratamiento dental',
    dentalTreatmentDescription: 'Tratamiento dental dado al paciente',
    notes: 'Notas',
    notesDescription: 'Notas sobre el paciente',
    covid19Screening: 'Preguntas de detección de COVID-19',
    covid19ScreeningDescription: 'Preguntas de detección de COVID-19',
  },

  signOut: 'Desconectar',
  patients: 'Pacientes',
  PATIENTS: 'PACIENTES',
  welcome: 'Bienvenido de vuelta',
  dob: 'Fecha de nacimiento ',
  DOB: 'Fecha de nacimiento ',
  sex: 'Sexo',
  gender: 'Género',
  GENDER: 'GENERO',
  patientSummary: 'Resumen del paciente',
  noContent: 'No hay contenido aún',
  age: 'EDAD',
  edit: 'EDITAR',
  back: '< Volver a atrás',
  save: 'GUARDAR',
  confirm: 'CONFIRMAR',
  cancel: 'CANCELAR',
  yes: 'Sí',
  no: 'No',
  firstName: 'Nombre',
  surname: 'Apellido',
  country: 'País',
  hometown: 'Ciudad de origen',
  selectDob: 'Seleccione fecha de nacimiento',
  phone: 'Teléfono',
  patientSearch: 'Buscar nombre del paciente...',
  search: 'Buscar',
  minAge: 'Edad Mínima',
  maxAge: 'Edad Máxima',
  advancedFilters: 'Filtros Avanzados ▼',
  hideFilters: 'Ocultar Filtros',
  clearFilters: 'Restablecer Filtros',
  camp: 'Nombre del campo de refugiados',
  vitals: 'Signos vitales',
  examination: 'Examen físico',
  notes: 'Notas',
  complaint: 'Queja/Preocupación médica',
  treatment: 'Tratamiento',
  diagnosis: 'Diagnóstico',
  medicineDispensed: 'Medicamento suscrito',
  prescriptions: 'Recetas de medicamentos',
  allergies: 'Alergias',
  medicalHistory: 'Historial médico',
  covidScreening: 'Prueba de COVID-19',
  enterTextHere: 'Introduzca texto aquí',
  visitDate: 'Fecha de la visita',
  visitHistory: 'Historia de la visita',
  visitEvents: 'Eventos durante la visita',
  visitType: 'Tipo de visita',
  trends: 'Tendencias',
  eventType: 'Tipo de evento',
  datePrescribed: 'Fecha de prescripción',
  provider: 'Proveedor médico',
  severity: 'Severidad',
  onsetDate: 'Fecha de comienzo de los síntomas',
  departure: 'Ida',
  to: 'a ',
  return: 'Vuelta',
  fever: '¿Fiebre o escalofríos?',
  dryCough: '¿Tos seca?',
  diffBreathing: '¿Dificultad al respirar?',
  soreThroat: '¿Dolor de garganta o secreción nasal?',
  nausea: '¿Náuseas, vómitos o diarrea?',
  chestPain: '¿Dolor de pecho?',
  confusion: '¿Nueva confusión?',
  bluish: '¿Labios azulados/ violetas?',
  fatigue: '¿Fatiga?',
  aches: '¿Dolores y molestias?',
  headache: '¿Dolor de cabeza?',
  changeTasteSmell: '¿Cambio de gusto u olfato?',
  diabetes: '¿Diabetes?',
  cardioDisease: '¿Problemas del corazón?',
  pulmonaryDisease: '¿Enfermedad en los pulmones?',
  renalDisease: '¿Enfermedad de los riñones?',
  malignancy: '¿Cáncer?',
  pregnant: '¿Mujer recién dada a luz?',
  immunocompromised: '¿Inmunocomprometido? / ¿Tiene las defensas bajas?',
  exposureKnown:
    '¿Contacto reciente con personas con COVID-19 conocido o sospechado?',
  travel: '¿Viaje reciente fuera del país?',
  symptomsDate: '¿Fecha de aparición de los primeros síntomas?',
  riskFactors: 'Factores de riesgo',
  hideRiskFactors: 'Ocultar factores de riesgo',
  testIsolate: 'Hacerle la prueba/Aislar al paciente',
  seekCare: 'Busque atención de emergencia y aísle',
  noAction: 'No es necesario tomar ninguna acción',
  syncFailure: '¡Fallo de sincronización!',
  syncFailureConnection: 'Verifica la conexión a internet',
  syncFailureSystem: 'Comuníquese con el administrador del sistema',
  syncSuccess: 'Éxito en la sincronización',
};

export default es;
export type Translations = typeof es;
