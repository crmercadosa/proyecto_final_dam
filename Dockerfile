# Etapa 1: Build
FROM node:18 AS build

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el proyecto
COPY . .

# Compilar la aplicación UI5 (genera carpeta /dist)
RUN npm run build


# Etapa 2: Producción
FROM node:18-alpine

# Instalar servidor estático 'serve'
RUN npm install -g serve

# Crear directorio de trabajo
WORKDIR /app

# Copiar artefactos construidos desde la etapa anterior
COPY --from=build /app/dist ./dist

# Exponer el puerto donde 'serve' atenderá
EXPOSE 5000

# Comando para iniciar el servidor
CMD ["serve", "-s", "dist", "-l", "5000"]
