import { Connection } from 'typeorm';
import createConnection from '../../../../database';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
import { app } from '../../../../app';

let connection: Connection;
let password = 'admin';
const _baseApi = '/api/v1/statements/';
const id = uuidv4();

describe("Get ballance controller", () => {
    beforeAll(async () => {
        connection = await createConnection();
        await connection.runMigrations();

        const hashedPassword = await hash(password, 8);

        await connection.query(`
            insert into users (id, name, email, password, created_at, updated_at)
            values('${id}', 'admin', 'admin@testschallange.com', '${hashedPassword}', 'now()', 'now()')`);
    });

    afterAll(async () => {
        await connection.dropDatabase();
        await connection.close();
    });

    it("Should be able to get balance from logged user", async () => {
        const authenticateResponse = await request(app)
            .post(`/api/v1/sessions`)
            .send({
                email: "admin@testschallange.com",
                password,
            });

        const { token } = authenticateResponse.body;

        await request(app)
            .post(`${_baseApi}deposit`)
            .send({
                amount: 100, 
                description: "first deposit"
            })
            .set({
                Authorization: `Bearer ${token}`,
            });

        const getUserBalance = await request(app)
            .get(`${_baseApi}balance`)
            .set({
                Authorization: `Bearer ${token}`,
            });

        expect(getUserBalance.status).toBe(200);
        expect(getUserBalance.body).toHaveProperty("statement");
    });

    it("Should not be able to return balance if user does not exist", async () => {
        const authenticateResponse = await request(app)
            .post(`/api/v1/sessions`)
            .send({
                email: "admin@testschallange.com",
                password,
            });

        const { token } = authenticateResponse.body;

        await connection.query(`DELETE FROM users WHERE id=$1`, [id]);

        const getUserBalance = await request(app)
            .get(`${_baseApi}balance`)
            .set({
                Authorization: `Bearer ${token}`,
            });

        expect(getUserBalance.status).toBe(404);
    });
})