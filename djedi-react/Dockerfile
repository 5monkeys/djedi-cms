FROM node:10

RUN mkdir /code
WORKDIR /code

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV PATH /code/node_modules/.bin:$PATH
ENTRYPOINT ["npm"]
CMD ["start"]
