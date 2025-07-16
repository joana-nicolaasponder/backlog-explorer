const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.FEEDBACK_EMAIL_USER, // Your Gmail address
    pass: process.env.FEEDBACK_EMAIL_PASS, // App password or Gmail password
  },
});

async function sendFeedbackMail({ name, email, message }) {
  const mailOptions = {
    from: process.env.FEEDBACK_EMAIL_USER,
    to: 'joanaponder@gmail.com',
    subject: `New Feedback from ${name || 'Anonymous'}`,
    text: `Feedback from: ${name || 'Anonymous'} <${email || 'no email'}>\n\n${message}`,
  };
  await transporter.sendMail(mailOptions);
}

module.exports = { sendFeedbackMail };
