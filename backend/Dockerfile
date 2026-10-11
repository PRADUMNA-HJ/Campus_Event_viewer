# ===================================================================
# Stage 1: Build Spring Boot JAR with Maven Wrapper
# ===================================================================
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Cache Maven dependencies
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B

# Compile and package application (tests skipped in container build)
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# ===================================================================
# Stage 2: Lightweight, hardened JRE 21 runtime
# ===================================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create unprivileged service user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder --chown=appuser:appgroup /app/target/campuspulse-backend-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
