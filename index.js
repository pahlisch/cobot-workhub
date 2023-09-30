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


async function getOrderByMemberIdAndDate(id, date) {
    const isnum = true // /^\d+$/.test(id);
    if (isnum) {
        try {
            const connection = await mysql.createConnection(dbUrl);
            const [row] = await connection.query(
            `SELECT * FROM orders o
            WHERE cobot_member_id ="${id}"
            AND order_date = "${date}"`);
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

async function insertOrder(req) {
    console.log(req.body)
    const cobot_member_id = req.body.cobot_member_id;
    const order_date = req.body.order_date;

    const sql = `INSERT INTO orders (cobot_member_id, order_date) VALUES (?, ?)`;
    const values = [cobot_member_id, order_date];
    try {
        const connection = await mysql.createConnection(dbUrl);
        console.log("connected")
        
        connection.query(sql, values, (err, result) => {
            if (err) {
            res.send(err);
            } else {
            res.send({ message: 'Order inserted successfully' });
            }})
        connection.end();

    } catch (err) {
        console.error(err);
        return [];
    }
}

async function insertOrderDetails(order_id, req, res) {

    const meal_items = req.body.meal_items;

    let deleteSql = `DELETE FROM order_details WHERE order_id = ?`;

    let sql = `INSERT INTO order_details (order_id, meal_item_id) VALUES `;
    for (let i = 0; i < meal_items.length; i++) {
        sql = sql + "(" + order_id + ", ?)";
        if (i == meal_items.length - 1) {
            sql = sql + ';';
        } else {
            sql = sql + ',';
        }
    }

    try {
        const connection = await mysql.createConnection(dbUrl);
        console.log("connected");

        // First, delete existing order details
        connection.query(deleteSql, [order_id], (err, result) => {
            if (err) {
                res.send(err);
                connection.end();
                return;
            }

            // Now, insert new order details
            connection.query(sql, meal_items, (err, result) => {
                if (err) {
                    res.send(err);
                } else {
                    res.send({ message: 'OrderDetails inserted successfully' });
                }
                connection.end();
            });
        });

    } catch (err) {
        console.error(err);
        res.send({ message: 'There was an error processing your request' });
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



app.post('/order/insert', async function (req, res) {
    console.log("post route called")
    try {
       
        let cobot_member_id = req.body.cobot_member_id; 
        let order_date = req.body.order_date; 
        let existing_order = await getOrderByMemberIdAndDate(cobot_member_id, order_date);
        console.log(existing_order);

        if (existing_order.length === 0) {
            await insertOrder(req); 
            existing_order = await getOrderByMemberIdAndDate(cobot_member_id, order_date);
        }

        let order_id;
        if (existing_order.length !== 0) {
            order_id = existing_order[0].id;
            
        }
        await insertOrderDetails(order_id, req); 

        res.status(200).send('Order and Order Details inserted successfully');

    } catch (error) {
        console.error("Error processing order:", error);
        res.status(500).send('Error processing order');
    }
})

// Use the environment variable PORT or default to 8080
const port = process.env.PORT || 8080;

app.listen(port, () => console.log(`Listening on port http://localhost:${port}/meals`));