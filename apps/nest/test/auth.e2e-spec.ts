import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /auth/login returns a JWT with the correct password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ password: 'test-password-e2e' })
      .expect(201);

    const body = response.body as { access_token: string };
    expect(typeof body.access_token).toBe('string');
  });

  it('POST /auth/login returns 401 with the wrong password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ password: 'wrong-password' })
      .expect(401);
  });
});
