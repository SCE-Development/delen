FROM node:alpine

WORKDIR /audioStream-alpine

COPY package.json .

COPY package-lock.json .

RUN npm install

COPY *.js .

EXPOSE 8000

CMD ["node", "api.js"]
