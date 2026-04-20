/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `Seccion` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Seccion_codigo_key" ON "Seccion"("codigo");
