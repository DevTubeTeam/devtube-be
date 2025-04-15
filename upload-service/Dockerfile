# Use the official Node.js image as the base image
FROM node:23-slim

# Set the working directory inside the container
WORKDIR /root/upload-service

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN yarn install

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN yarn build

# Command to run the application
CMD ["yarn", "start:prod"]
