FROM node:18-alpine
WORKDIR /app
COPY . .

RUN npm install express
RUN npm install child_process
RUN npm install ytdl-core
RUN npm install path

RUN apk add mpv

EXPOSE 8000
CMD ["node", "api.js"]

