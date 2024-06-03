import {NestFactory} from "@nestjs/core";

import {request} from "@lib/request";

import {AppModule} from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		cors: {
			origin: process.env.CLIENT_ORIGIN.split(", "),
			credentials: true,
		},
	});

	request.setUp();

	await app.listen(+process.env.PORT);
}

bootstrap();
