import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path'
import nodemailer from 'nodemailer';
import fs from 'fs';

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

function generateHTMLTable(data) {
    let table = '<table border="1">';
    table += '<tr><th>Item Name</th><th>Count</th></tr>'; // Table headers

    data.forEach(row => {
        table += `<tr><td>${row.item_name}</td><td>${row.count}</td></tr>`;
    });

    table += '</table>';
    return table;
}


function generateCSV(data) {
    let csv = 'Item Name,Count\n'; // CSV headers

    data.forEach(row => {
        csv += `${row.item_name},${row.count}\n`;
    });

    const path = './orders/order_totals.csv';
    fs.writeFileSync(path, csv);

    return path; 
}


async function DayOrderTotal() {
    try {
        const connection = await mysql.createConnection(dbUrl);
        const [data] = await connection.query(
`select mi.item_name, count(*) as count from orders o  
inner join order_details od on od.order_id = o.id 
inner join meal_items mi on mi.id = od.meal_item_id 
where o.order_date  = current_date()
group by mi.item_name ;`);
        connection.end();

        const htmlTable = generateHTMLTable(data);
        const csvPath = generateCSV(data);

        return htmlTable ;

    } catch (err) {
        console.error(err);
        return [];
    }
}


const sendEmail = async (order_table) => {
smtpTransport.sendMail({
    from: process.env.SENDER_ADDRESS,
    to: process.env.RECIPIENT,
    subject: 'Hello with attachment',
    text: 'Hello world',
    html: order_table,
  }, (error, info) => {
    if (error) {
      console.log('Error:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

(async () => {
    const order_table = await DayOrderTotal();
    sendEmail(order_table);
})();