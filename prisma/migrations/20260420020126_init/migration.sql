-- CreateEnum
CREATE TYPE "TipoEvaluacion" AS ENUM ('FORMATIVA', 'SUMATIVA');

-- CreateEnum
CREATE TYPE "NivelLogro" AS ENUM ('CL', 'L', 'ML', 'LI', 'NL');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seccion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "asignatura" TEXT NOT NULL,
    "semestre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alumno" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT,
    "esPPD" BOOLEAN NOT NULL DEFAULT false,
    "adaptaciones" TEXT,
    "umbralAlerta" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "seccionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoEvaluacion" NOT NULL,
    "semana" INTEGER NOT NULL,
    "ponderacion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seccionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterioRubrica" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "evaluacionId" TEXT NOT NULL,

    CONSTRAINT "CriterioRubrica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calificacion" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "nota" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogroCriterio" (
    "id" TEXT NOT NULL,
    "nivel" "NivelLogro" NOT NULL,
    "observacion" TEXT,
    "calificacionId" TEXT NOT NULL,
    "criterioId" TEXT NOT NULL,

    CONSTRAINT "LogroCriterio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetroAlimentacion" (
    "id" TEXT NOT NULL,
    "calificacionId" TEXT NOT NULL,
    "haciaDondeVoy" TEXT,
    "fortalezas" TEXT,
    "porMejorar" TEXT,
    "aspectosLogrados" TEXT,
    "comoSigo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetroAlimentacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Alumno_email_key" ON "Alumno"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Calificacion_alumnoId_evaluacionId_key" ON "Calificacion"("alumnoId", "evaluacionId");

-- CreateIndex
CREATE UNIQUE INDEX "LogroCriterio_calificacionId_criterioId_key" ON "LogroCriterio"("calificacionId", "criterioId");

-- CreateIndex
CREATE UNIQUE INDEX "RetroAlimentacion_calificacionId_key" ON "RetroAlimentacion"("calificacionId");

-- AddForeignKey
ALTER TABLE "Alumno" ADD CONSTRAINT "Alumno_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "Seccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluacion" ADD CONSTRAINT "Evaluacion_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "Seccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterioRubrica" ADD CONSTRAINT "CriterioRubrica_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "Evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "Evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroCriterio" ADD CONSTRAINT "LogroCriterio_calificacionId_fkey" FOREIGN KEY ("calificacionId") REFERENCES "Calificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroCriterio" ADD CONSTRAINT "LogroCriterio_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "CriterioRubrica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroAlimentacion" ADD CONSTRAINT "RetroAlimentacion_calificacionId_fkey" FOREIGN KEY ("calificacionId") REFERENCES "Calificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
