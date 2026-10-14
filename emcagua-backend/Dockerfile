# ── Etapa 1: Compilar ────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copiar solo lo necesario para resolver dependencias (se cachea si pom.xml no cambia)
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:resolve -B -q

# Copiar código fuente y compilar
COPY src src
RUN ./mvnw package -DskipTests -B -q

# ── Etapa 2: Imagen final ligera ─────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Crear usuario sin privilegios
RUN addgroup -S emcagua && adduser -S emcagua -G emcagua

# Copiar el JAR generado
COPY --from=build /app/target/*.jar app.jar

# Carpeta para respaldos de BD (se puede montar como volumen)
RUN mkdir -p /data/respaldos && chown -R emcagua:emcagua /data/respaldos

USER emcagua

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
