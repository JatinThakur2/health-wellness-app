# Use Node.js as the base image
FROM node:20-slim AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Fix the date-fns dependency issue
RUN npm install 

# Build the application
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production

# Copy built files from build stage to nginx serve directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Create a template file that will be populated with environment variables at runtime
RUN echo "window.REACT_APP_CONVEX_URL = \"\$REACT_APP_CONVEX_URL\";" > /usr/share/nginx/html/env-config.template.js

# Create entrypoint script properly
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'envsubst < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js' >> /docker-entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Start nginx server
CMD ["/docker-entrypoint.sh"]