# build stage
FROM node:18-alpine AS builder

WORKDIR /app

# copy package files
COPY package*.json ./

# install deps
RUN npm ci

# copy source code
COPY . .

# build app, need to set api base
# use /api prefix, nginx will proxy it to backend
ARG REACT_APP_API_BASE=/api
ENV REACT_APP_API_BASE=$REACT_APP_API_BASE

RUN npm run build

# runtime stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# copy nginx config file
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

