const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendResetEmail(email, resetLink){
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <p>You requested a password reset.</p>
            <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
            <p>If you did not request this, please ignore this email.</p>
        `,
    }
    try{
        await transporter.sendMail(mailOptions);
        console.log('Email sent to:', email);
        return { success: true, message: "Email sent successfully." };
    } catch(error){
        console.log('Error sending email:', error);
        return { success: false, message: "Error sending email" };
    }
}

module.exports = sendResetEmail;