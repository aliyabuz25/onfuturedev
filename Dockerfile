FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN cp -r data data-defaults
EXPOSE 6985
ENV HOST=0.0.0.0
ENV PORT=6985
CMD ["npm", "start"]
