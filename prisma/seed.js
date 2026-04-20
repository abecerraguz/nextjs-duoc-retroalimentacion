import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client/client.ts'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed DUOC...')

  // Admin
  const hash = await bcrypt.hash('duoc2024', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'profesor@duoc.cl' },
    update: {},
    create: { email: 'profesor@duoc.cl', password: hash, nombre: 'Profesor Demo' },
  })
  console.log('✅ Usuario admin:', admin.email)

  // Secciones
  const sec1 = await prisma.seccion.upsert({
    where: { codigo: 'IFD2201-001' },
    update: {},
    create: { codigo: 'IFD2201-001', asignatura: 'Programación Web Back End', semestre: '2024-2', activa: true },
  })
  const sec2 = await prisma.seccion.upsert({
    where: { codigo: 'IFD2201-002' },
    update: {},
    create: { codigo: 'IFD2201-002', asignatura: 'Programación Web Back End', semestre: '2024-2', activa: true },
  })
  console.log('✅ Secciones creadas')

  // Alumnos sección 1
  const alumnosSec1 = [
    { nombre: 'Valentina', apellido: 'Muñoz', email: 'v.munoz@duoc.cl', esPPD: false },
    { nombre: 'Diego', apellido: 'Herrera', email: 'd.herrera@duoc.cl', esPPD: false },
    { nombre: 'Camila', apellido: 'Torres', email: 'c.torres@duoc.cl', esPPD: false },
    { nombre: 'Sebastián', apellido: 'Fuentes', email: 's.fuentes@duoc.cl', esPPD: true, adaptaciones: 'Tiempo extendido en evaluaciones, posibilidad de entregar en formato audio.', umbralAlerta: 4.5 },
    { nombre: 'Francisca', apellido: 'Vega', email: 'f.vega@duoc.cl', esPPD: true, adaptaciones: 'Evaluaciones con retroalimentación oral, acceso a materiales de apoyo durante la actividad.', umbralAlerta: 4.0 },
  ]

  for (const a of alumnosSec1) {
    await prisma.alumno.upsert({
      where: { email: a.email },
      update: {},
      create: { ...a, seccionId: sec1.id, umbralAlerta: a.umbralAlerta ?? 4.0 },
    })
  }

  // Alumnos sección 2
  const alumnosSec2 = [
    { nombre: 'Matías', apellido: 'Contreras', email: 'm.contreras@duoc.cl', esPPD: false },
    { nombre: 'Isidora', apellido: 'Rojas', email: 'i.rojas@duoc.cl', esPPD: false },
    { nombre: 'Felipe', apellido: 'Morales', email: 'f.morales@duoc.cl', esPPD: false },
  ]
  for (const a of alumnosSec2) {
    await prisma.alumno.upsert({
      where: { email: a.email },
      update: {},
      create: { ...a, seccionId: sec2.id, umbralAlerta: 4.0 },
    })
  }
  console.log('✅ Alumnos creados')

  // Evaluación 1: Formativa — Semana 1
  const criteriosFormativa = [
    'Utiliza correctamente variables, arrays y operadores en PHP para resolver el problema planteado.',
    'Implementa estructuras de control (if/else, switch) y bucles (for, while) de forma adecuada.',
    'Organiza el código con funciones que evitan la repetición y mejoran la legibilidad.',
    'Demuestra comprensión del ciclo request-response y la diferencia entre GET y POST.',
  ]

  const eval1 = await prisma.evaluacion.upsert({
    where: { id: 'seed-eval-form-1' },
    update: {},
    create: {
      id: 'seed-eval-form-1',
      nombre: 'Experiencia 1 – Aspectos básicos de PHP y lógica de programación',
      tipo: 'FORMATIVA',
      semana: 1,
      ponderacion: 0,
      seccionId: sec1.id,
      criterios: {
        create: criteriosFormativa.map((descripcion, i) => ({ descripcion, orden: i + 1 })),
      },
    },
  })

  // Evaluación 2: Sumativa — Semana 4
  const criteriosSumativa = [
    'Utiliza PHP para crear funciones que manipulan datos enviados desde formularios HTML.',
    'Implementa validaciones del lado servidor para entradas de usuario de manera correcta.',
    'Conecta PHP con base de datos MySQL utilizando PDO y realiza consultas CRUD básicas.',
    'Aplica buenas prácticas de seguridad: sanitización de inputs y uso de consultas preparadas.',
    'El código está correctamente estructurado y documentado con comentarios relevantes.',
  ]

  const eval2 = await prisma.evaluacion.upsert({
    where: { id: 'seed-eval-sum-1' },
    update: {},
    create: {
      id: 'seed-eval-sum-1',
      nombre: 'Evaluación Sumativa 1 – CRUD con PHP y MySQL (PDO)',
      tipo: 'SUMATIVA',
      semana: 4,
      ponderacion: 20,
      seccionId: sec1.id,
      criterios: {
        create: criteriosSumativa.map((descripcion, i) => ({ descripcion, orden: i + 1 })),
      },
    },
  })
  console.log('✅ Evaluaciones creadas')
  console.log('')
  console.log('🔐 Credenciales de acceso:')
  console.log('   Email:    profesor@duoc.cl')
  console.log('   Password: duoc2024')
  console.log('')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
