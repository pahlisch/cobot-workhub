import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path'
import nodemailer from 'nodemailer';
import fs from 'fs';
import moment from 'moment';

const currentDate = moment().format('YYYY-MM-DD');

const format = '.xls'
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
    const path = `./orders/${filename}${format}`;
    fs.writeFileSync(path, csv);

    return path;
}



async function DayOrderTotal() {
    try {
        const connection = await mysql.createConnection(dbUrl);
        const [data] = await connection.query(
`select DATE_FORMAT(order_date, '%d %m %Y') AS date_commande, mi.item_name as plat, count(*) as quantité from orders o  
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

async function DayOrderDetails() {
    try {
        const connection = await mysql.createConnection(dbUrl);
        const [data] = await connection.query(
`select DATE_FORMAT(order_date, '%d %m %Y') AS date_commande, o.cobot_member_id as name, mi.item_name as plat, count(*) as quantité from orders o  
inner join order_details od on od.order_id = o.id 
inner join meal_items mi on mi.id = od.meal_item_id 
where o.order_date  = current_date()
group by o.cobot_member_id, mi.item_name ;`);
        connection.end();

        const csvPath = generateCSV(data, "détail_commande");

        return csvPath ;

    } catch (err) {
        console.error(err);
        return [];
    }
}

async function MonthOrderTotal() {
    try {
        const connection = await mysql.createConnection(dbUrl);
        const [data] = await connection.query(
            `SELECT mi.item_name as plat, COUNT(*) as quantité, SUM(mi.price) as total_chf
            FROM orders o
            INNER JOIN order_details od ON od.order_id = o.id
            INNER JOIN meal_items mi on od.meal_item_id = mi.id
            WHERE MONTH(DATE(o.order_date)) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 DAY))
            AND YEAR(DATE(o.order_date)) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 DAY))
            GROUP BY mi.item_name
            
            UNION
            
            SELECT 'Total' as plat, COUNT(*) as quantité, SUM(mi.price) as total_chf
            FROM orders o
            INNER JOIN order_details od ON od.order_id = o.id
            INNER JOIN meal_items mi on od.meal_item_id = mi.id
            WHERE MONTH(DATE(o.order_date)) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 DAY))
            AND YEAR(DATE(o.order_date)) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 DAY));` );
        connection.end();

        const htmlTable = generateHTMLTable(data);
        const csvPath = generateCSV(data, "total_commande_du_mois");

        return { htmlTable, csvPath } ;

    } catch (err) {
        console.error(err);
        return [];
    }
    }

    async function MonthOrderDetails() {
        try {
            const connection = await mysql.createConnection(dbUrl);
            const [data] = await connection.query(
    `select DATE_FORMAT(order_date, '%d %m %Y') AS date_commande, o.cobot_member_id as name, mi.item_name as plat, count(*) as quantité, sum(mi.price) as total_chf from orders o
    INNER JOIN order_details od ON od.order_id = o.id
    INNER JOIN meal_items mi on od.meal_item_id = mi.id
    WHERE MONTH(DATE(o.order_date)) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 DAY))
    AND YEAR(DATE(o.order_date)) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 DAY))
    group by o.cobot_member_id, mi.item_name 
    
    UNION
    
    SELECT 'Total', 'Total', 'Total' as plat, COUNT(*) as quantité, SUM(mi.price) as total_chf
    FROM orders o
    INNER JOIN order_details od ON od.order_id = o.id
    INNER JOIN meal_items mi on od.meal_item_id = mi.id
    WHERE MONTH(DATE(o.order_date)) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 DAY))
    AND YEAR(DATE(o.order_date)) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 DAY));`);
            connection.end();
    
            const csvPath = generateCSV(data, "détail_commande_du_mois");
    
            return csvPath ;
    
        } catch (err) {
            console.error(err);
            return [];
        }
    }



const sendEmail = async (order_table, csvPath, subject, filename) => {
    if (csvPath[0] === 'No data available' || csvPath[1] === 'No data available') {
      console.log('No data available to send in email.');
      return;
    }
  
    smtpTransport.sendMail({
      from: process.env.SENDER_ADDRESS,
      to: process.env.RECIPIENT,
      subject: subject,
      text: 'workhub order data',
      html: order_table,
      attachments: [{
          filename: `${filename[0]}${format}`,
          path: csvPath[0]
        },
        {
          filename: `${filename[1]}}${format}`,
          path: csvPath[1]
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
    let { htmlTable, csvPath }  = await DayOrderTotal();
    let csvPath_2 = await DayOrderDetails();
    let filename = [`${currentDate}_commande_du_jour${format}`, `${currentDate}_détail_commande_du_jour${format}`];
    sendEmail(htmlTable, [csvPath, csvPath_2], 'Commande du jour Workhub', filename);
    if (moment().date() == 1) {
        let { htmlTable, csvPath }  = await MonthOrderTotal();
        let csvPath_2 = await MonthOrderDetails();
        let filename = [`${currentDate}_commande_du_mois${format}`, `${currentDate}_détail_commande_du_mois${format}`];
        sendEmail(htmlTable, [csvPath, csvPath_2], 'Commande du mois Workhub', filename);
    }
})();