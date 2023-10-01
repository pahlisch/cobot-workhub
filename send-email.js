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


const smtpTransport = nodemailer.createTransport({
  host: process.env.MAILGUN_SMTP_SERVER,
  port: process.env.MAILGUN_SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.MAILGUN_SMTP_LOGIN,
    pass: process.env.MAILGUN_SMTP_PASSWORD
  }
});

const sendEmail = async () => {
smtpTransport.sendMail({
    from: process.env.SENDER_ADDRESS,
    to: process.env.RECIPIENT,
    subject: 'Hello with attachment',
    text: 'Hello world',
    html: '<b>Hello world</b>',
  }, (error, info) => {
    if (error) {
      console.log('Error:', error);
      res.send(error)
    } else {
      console.log('Email sent:', info.response);
      res.send(info.response)
    }
  });
}

sendEmail();