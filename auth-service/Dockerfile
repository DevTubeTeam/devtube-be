# Use the official Node.js image as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /root/auth-service

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN yarn install

COPY src/prisma/ ./src/prisma/

RUN yarn prisma generate --schema /root/auth-service/src/prisma/schema.prisma

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN yarn build

# Command to run the application
CMD ["yarn", "start:prod"]
