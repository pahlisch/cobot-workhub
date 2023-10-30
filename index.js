import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path'
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const API_TOKEN = process.env.API_TOKEN

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (token === API_TOKEN) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
});

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

const dbUrl = process.env.CLEARDB_DATABASE_URL;

const smtpTransport = nodemailer.createTransport({
  host: process.env.MAILGUN_SMTP_SERVER,
  port: process.env.MAILGUN_SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.MAILGUN_SMTP_LOGIN,
    pass: process.env.MAILGUN_SMTP_PASSWORD
  }
});

async function getMealItems() {
    try {

        const connection = await mysql.createConnection(dbUrl);
        const [rows] = await connection.query('SELECT * FROM meal_items');
        connection.end();

        return rows;
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function getDateWithOrdersByMemberId(cobot_member_id) {

    

    try {
        const connection = await mysql.createConnection(dbUrl);
        const query = `
            SELECT order_date, group_concat(mi.item_name) as item_names
            FROM orders o
            INNER JOIN order_details od ON od.order_id = o.id
            INNER JOIN meal_items mi on od.meal_item_id = mi.id
            WHERE o.cobot_member_id = ?
            AND DATE(o.order_date) >= CURRENT_DATE
            GROUP BY order_date
        `;
        const [rows] = await connection.execute(query, [cobot_member_id]);
        connection.end();
        return rows;
    } catch (err) {
        console.error(err);
        return [];
    }
}


async function getOrderByMemberId(id) {


    try {
        const connection = await mysql.createConnection(dbUrl);
        const query = `
            SELECT * FROM orders o
            INNER JOIN order_details od ON od.order_id = o.id
            INNER JOIN meal_items mi on mi.id = od.meal_item_id
            WHERE cobot_member_id = ?
        `;
        const [rows] = await connection.execute(query, [id]);
        connection.end();
        return rows;
    } catch (err) {
        console.error(err);
        return [];
    }
}



async function getOrderByMemberIdAndDate(id, date) {


    try {
        const connection = await mysql.createConnection(dbUrl);
        const query = `
            SELECT * FROM orders o
            WHERE cobot_member_id = ?
            AND order_date = ?
        `;
        const [rows] = await connection.execute(query, [id, date]);
        connection.end();
        return rows;
    } catch (err) {
        console.error(err);
        return [];
    }
}


async function getOrderDetailsByMemberIdAndDate(id, date) {


    try {
        const connection = await mysql.createConnection(dbUrl);
        const [rows] = await connection.execute(
            `SELECT mi.* FROM orders o
             INNER JOIN order_details od ON od.order_id = o.id
             INNER JOIN meal_items mi ON mi.id = od.meal_item_id
             WHERE cobot_member_id = ? AND order_date = ?`,
            [id, date]
        );
        connection.end();
        return rows;
    } catch (err) {
        console.error(err);
        return [];
    }
}



async function insertOrder(req) {

    const cobot_member_id = req.body.cobot_member_id;
    const order_date = req.body.order_date;



    const sql = `INSERT INTO orders (cobot_member_id, order_date) VALUES (?, ?)`;
    const values = [cobot_member_id, order_date];
    try {
        const connection = await mysql.createConnection(dbUrl);

        
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

async function deleteOrderByMemberAndDate(member_id, date) {



    let deleteOrderDetail = `DELETE od FROM order_details od INNER JOIN orders o ON od.order_id = o.id WHERE o.cobot_member_id = ? AND o.order_date = ?`;
    let deleteOrder = `DELETE FROM orders WHERE cobot_member_id = ? AND order_date = ?`;

    try {
        const connection = await mysql.createConnection(dbUrl);



        let resultOrderDetail = await connection.query(deleteOrderDetail, [member_id, date]);
        let resultOrder = await connection.query(deleteOrder, [member_id, date]);

        connection.end();

        return { messageOrderDetail: 'Order details deleted successfully', messageOrder: 'Order deleted successfully' };

    } catch (err) {
        console.error(err);
        throw err;  
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


        connection.query(deleteSql, [order_id], (err, result) => {
            if (err) {
                res.send(err);
                connection.end();
                return;
            }});

        connection.query(sql, meal_items, (err, result) => {
            if (err) {
                res.send(err);
            } else {
                res.send({ message: 'OrderDetails inserted successfully' });
            }
            connection.end();
        });
        

    } catch (err) {
        console.error(err);
        res.send({ message: 'There was an error processing your request' });
    }

}

async function upsertUser(cobotId, userName, membershipId) {

    try {
        const connection = await mysql.createConnection(dbUrl);
        const query = `
            INSERT INTO users (cobot_id, user_name, membership_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            user_name = VALUES(user_name),
            membership_id = VALUES(membership_id)
            ;
        `;
        const [results] = await connection.execute(query, [cobotId, userName, membershipId]);
        connection.end();
        return results;
    } catch (err) {
        console.error(err);
        return null;
    }
}

// Endpoint to get the list of menu item
app.get('/meals', async (req, res) => {

    const meals = await getMealItems();
    res.send(meals);

});

app.get('/orders/:id', async (req, res) => {

    const orders = await getDateWithOrdersByMemberId(req.params.id);
    res.send(orders);

});


app.get('/meals/member/:id', async function (req, res) {
    const meals = await  getOrderByMemberId(req.params.id);
    res.send(meals);
})

app.get('/order/delete/:member/:date', async function (req, res) {
    deleteOrderByMemberAndDate(req.params.member, req.params.date);
})


app.get('/orderDetails/:member/:date', async function (req, res) {
    const orderDetails = await getOrderDetailsByMemberIdAndDate(req.params.member, req.params.date);
    res.send(orderDetails);
})


app.post('/order/insert', async function (req, res) {
    try {
       
        let cobot_member_id = req.body.cobot_member_id; 
        let order_date = req.body.order_date; 
        let existing_order = await getOrderByMemberIdAndDate(cobot_member_id, order_date);

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


// Add a meal item
app.post('/meal/add', async (req, res) => {
    const { item_name, item_description, price_restaurant_invoice, price_meal_item } = req.body;
    try {
        const connection = await mysql.createConnection(dbUrl);
        await connection.query('INSERT INTO meal_items (item_name, item_description, price_restaurant_invoice, price_meal_item) VALUES (?, ?, ?, ?)', [item_name, item_description, price_restaurant_invoice, price_meal_item]);
        connection.end();
        res.send({ message: 'Meal item added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding meal item');
    }
});

// Update a meal item
app.put('/meal/update/:id', async (req, res) => {
    const { id } = req.params;
    const { item_name, item_description, price } = req.body;
    try {
        const connection = await mysql.createConnection(dbUrl);
        await connection.query('UPDATE meal_items SET item_name = ?, item_description = ?, price = ? WHERE id = ?', [item_name, item_description, price, id]);
        connection.end();
        res.send({ message: 'Meal item updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating meal item');
    }
});

// Delete a meal item
app.delete('/meal/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbUrl);
        await connection.query('DELETE FROM meal_items WHERE id = ?', [id]);
        connection.end();
        res.send({ message: 'Meal item deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting meal item');
    }
});


app.post('/user/upsert', async function (req, res) {
    const { cobotId, userName, membershipId } = req.body;
    const result = await upsertUser(cobotId, userName, membershipId);
    if (result) {
        res.status(200).json({ message: 'User upserted successfully', result });
    } else {
        res.status(500).json({ message: 'Failed to upsert user' });
    }
});

app.put('/meal/display/:id', async (req, res) => {
    const { id } = req.params;
    const { value } = req.body;
    try {
        const connection = await mysql.createConnection(dbUrl);
        await connection.query('UPDATE meal_items SET value = ? WHERE id = ?', [value, id]);
        connection.end();
        res.send({ message: 'Display value updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating display value');
    }
});