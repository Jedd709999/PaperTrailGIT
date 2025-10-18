# Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY papertrail_frontend/package.json /app/package.json
COPY papertrail_frontend/package-lock.json /app/package-lock.json
RUN npm ci || npm install

# Copy app
COPY papertrail_frontend /app

# Build (optional: for production serve with nginx). For dev, we run start.
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
