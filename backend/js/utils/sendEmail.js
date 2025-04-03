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
    console.log("Setting up email options for:", email);
    console.log("Using email credentials:", process.env.EMAIL_USER ? "Email user set" : "EMAIL_USER MISSING", 
                process.env.EMAIL_PASS ? "Email password set" : "EMAIL_PASS MISSING");
    
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
        console.log("Attempting to send email with nodemailer");
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', email);
        return { success: true, message: "Email sent successfully." };
    } catch(error){
        console.error('Error sending email:', error);
        // More detailed error info
        return { 
            success: false, 
            message: `Error sending email: ${error.message}`,
            error: error.toString()
        };
    }
}

module.exports = sendResetEmail;