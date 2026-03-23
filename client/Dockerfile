FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY . .

RUN if [ ! -d node_modules ]; then npm ci --no-audit --no-fund; fi
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
