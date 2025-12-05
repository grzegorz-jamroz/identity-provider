FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ../../ .

COPY ../../.env.example /app/.env

CMD ["npm", "run", "dev"]
