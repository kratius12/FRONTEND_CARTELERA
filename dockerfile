# ---------- Build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Dependencias
COPY package*.json ./
RUN npm ci

# Código
COPY . .

# Variables de Vite en build-time (IMPORTANTE)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build
RUN npm run build


# ---------- Run ----------
FROM nginx:alpine

# Reemplaza config default
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Archivos estáticos
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
