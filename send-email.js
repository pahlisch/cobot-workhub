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
    if (!data || data.length === 0) {
        return '<p>No data available</p>';
    }

    let table = '<table border="1">';

    // Generate table headers
    const headers = Object.keys(data[0]);
    table += '<tr>';
    headers.forEach(header => {
        table += `<th>${header}</th>`;
    });
    table += '</tr>';

    // Generate table rows
    data.forEach(row => {
        table += '<tr>';
        Object.values(row).forEach(cell => {
            table += `<td>${cell}</td>`;
        });
        table += '</tr>';
    });

    table += '</table>';
    return table;
}



function generateCSV(data, filename) {
    if (!data || data.length === 0) {
        return 'No data available';
    }

    // Generate CSV headers
    const headers = Object.keys(data[0]);
    let csv = headers.join(';') + '\n';

    // Generate CSV rows
    data.forEach(row => {
        const values = Object.values(row).map(value => 
            typeof value === 'string' && value.includes(';') ? `"${value}"` : value
        );
        csv += values.join(';') + '\n';
    });

    // Write CSV to file
    const path = `./orders/${filename}.csv`;
    fs.writeFileSync(path, csv);

    return path;
}



async function DayOrderTotal() {
    try {
        const connection = await mysql.createConnection(dbUrl);
        const [data] = await connection.query(
`select mi.item_name as plat, count(*) as quantité from orders o  
inner join order_details od on od.order_id = o.id 
inner join meal_items mi on mi.id = od.meal_item_id 
where o.order_date  = current_date()
group by mi.item_name ;`);
        connection.end();

        const htmlTable = generateHTMLTable(data);
        const csvPath = generateCSV(data, "commande_du_jour");

        return { htmlTable, csvPath } ;

    } catch (err) {
        console.error(err);
        return [];
    }
}


const sendEmail = async (order_table, csvPath) => {
smtpTransport.sendMail({
    from: process.env.SENDER_ADDRESS,
    to: process.env.RECIPIENT,
    subject: 'Commande du jour Workhub',
    text: 'Veuillez trouvez les commandes du jour ci-dessous et en pièce jointe. \n En vous souhaitant une bonne journée',
    html: order_table,
    attachments: [{
        filename: 'order_totals.xls',
        path: csvPath
      }]
  }, (error, info) => {
    if (error) {
      console.log('Error:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

(async () => {
    const { htmlTable, csvPath }  = await DayOrderTotal();
    sendEmail(htmlTable, csvPath);
})();