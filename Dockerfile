FROM node:latest

# Bundle app source
ADD . /usr/src/app
WORKDIR /usr/src/app
RUN npm install

EXPOSE 4941

CMD [ "npm", "start" ]
