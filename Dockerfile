FROM node:18-alpine
WORKDIR /app
COPY . .
EXPOSE 8000
CMD ["node", "api.js"]

