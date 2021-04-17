FROM node
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY script/* ./
COPY server.js ./
EXPOSE 3000
CMD [ "node", "server.js" ]
