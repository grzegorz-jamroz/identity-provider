FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ../../ .

COPY ../../.env /app/.env.local

RUN rm -f /app/.env.test

CMD ["npm", "run", "dev"]
