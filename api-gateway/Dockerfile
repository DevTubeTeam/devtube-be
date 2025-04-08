# Use the official Node.js image as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /root/api-gateway

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