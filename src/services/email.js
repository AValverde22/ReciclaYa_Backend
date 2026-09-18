import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials( { refresh_token: REFRESH_TOKEN });

const sendEmail = async(destino, asunto, mensaje) => {
    try {
        const accessToken = await oAuth2Client.getAccessToken();
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_SENDER,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken.token || ""
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: destino,
            subject: asunto,
            html: mensaje
        };

        await transport.sendMail(mailOptions);
    } catch (error) { console.error(error.message); }
}

export default sendEmail;