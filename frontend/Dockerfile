FROM node:24-bookworm-slim AS build
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM nginx:stable-bookworm
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 80
