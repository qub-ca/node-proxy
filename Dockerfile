FROM node:latest

# Create app directory
RUN mkdir -p /usr/src/app && \
		mkdir -p /usr/src/app/cache
WORKDIR /usr/src/app

# Install app dependencies
COPY ./package.json /usr/src/app/
RUN npm install --production
# RUN npm install pm2 -g
# RUN npm install https -g

# Bundle app source
COPY ./*.js /usr/src/app/

# RUN groupadd -r nodejs && useradd -m -r -g nodejs nodejs

# USER nodejs #Problem opening port 80 with this user

EXPOSE 80 443
CMD [ "npm", "start" ]
