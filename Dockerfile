FROM node:alpine

WORKDIR /audioStream-alpine

COPY package.json .

COPY package-lock.json .

RUN npm install

COPY AudioStream.js .

EXPOSE 5000

CMD ["node", "AudioStream.js"]
