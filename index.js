import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path'


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });


// Initialize the express app
const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

console.log(dbConfig)

const dbUrl = process.env.CLEARDB_DATABASE_URL;

// Function to get restaurants from the database
async function getMealItems() {
    console.log("outer getMealsItems")
    try {
        console.log("try conn")
        const connection = await mysql.createConnection(dbUrl);
        console.log("connected")
        const [rows] = await connection.query('SELECT * FROM meal_items');
        connection.end();
        console.log(rows)
        return rows;
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function getOrderByMemberId(id) {
    const isnum = true // /^\d+$/.test(id);
    if (isnum) {
        try {
            const connection = await mysql.createConnection(dbUrl);
            const [row] = await connection.query(
            `SELECT * FROM orders o
            INNER JOIN order_details od ON od.order_id = o.id
            INNER JOIN meal_items mi on mi.id = od.meal_item_id
            WHERE cobot_member_id ="${id}"`);
            connection.end();
            return row;
        } catch (err) {
            console.error(err);
            return [];
        }
    }
    else {
        return [];
    }
}

// Endpoint to get the list of restaurants
app.get('/meals', async (req, res) => {
    console.log("get meals")
    const meals = await getMealItems();
    res.send(meals);

});

app.get('/meals/member/:id', async function (req, res) {
    console.log(req.params)
    console.log("--------------")
    const meals = await  getOrderByMemberId(req.params.id);
    res.send(meals);
})

// Use the environment variable PORT or default to 8080
const port = process.env.PORT || 8080;

app.listen(port, () => console.log(`Listening on port http://localhost:${port}/meals`));