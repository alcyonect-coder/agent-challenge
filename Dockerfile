# syntax=docker/dockerfile:1

##################################
# 1. Build stage (compilation)  #
##################################
FROM oven/bun:1 AS build

WORKDIR /app

# Désactivation de la télémétrie et logs non bufferisés
ENV DISABLE_TELEMETRY=true \
    POSTHOG_DISABLED=true \
    MASTRA_TELEMETRY_DISABLED=true \
    DO_NOT_TRACK=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    PYTHONUNBUFFERED=1

# Copier package.json et bun.lockb* pour maximiser le cache
COPY package.json bun.lockb* ./

# Installer les dépendances
RUN bun install --frozen-lockfile

# Copier le .env AVANT de copier le reste
COPY .env .env

# Copier le reste du code et builder
COPY . .
RUN bun run build

##################################
# 2. Runtime stage (exécution)   #
##################################
FROM oven/bun:1 AS runtime

WORKDIR /app

# Créer un utilisateur non-root
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m -d /app -s /bin/false appuser

# Pré-créer le dossier .config pour Mastra et lui appliquer les bons droits
RUN mkdir -p /app/.config && \
    chown -R appuser:appgroup /app/.config

# Copier l’app compilée depuis build
COPY --from=build --chown=appuser:appgroup /app .

# Variables d’environnement pour la prod
ENV NODE_ENV=production

USER appuser

EXPOSE 3000
EXPOSE 4111

# Lancement avec le CLI Bun inclus dans l’image
ENTRYPOINT ["bun","run","start"]
