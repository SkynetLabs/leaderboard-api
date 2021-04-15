FROM node

RUN mkdir -p /srv
WORKDIR /srv
COPY . /srv

RUN npm install -g typescript@latest
RUN npm ci
RUN npm run build

CMD ["./scripts/start.sh"]
