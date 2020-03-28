FROM node:lts

# Copy files
COPY . .

# Install production dependencies
RUN npm install --production

# Run
CMD npm run serve
