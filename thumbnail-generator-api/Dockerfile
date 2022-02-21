FROM public.ecr.aws/sam/build-nodejs14.x

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080