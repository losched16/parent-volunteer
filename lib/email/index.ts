// lib/email/index.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "resend",
    pass: process.env.SMTP_PASSWORD,
  },
});

const FROM = `${process.env.EMAIL_FROM_NAME || "Salem Montessori School"} <${process.env.EMAIL_FROM || "volunteers@salemmontessori.com"}>`;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const SCHOOL_NAME = process.env.SCHOOL_NAME || "Salem Montessori School";
const BRAND_COLOR = "#86BD40";

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7f0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { background: ${BRAND_COLOR}; padding: 28px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; }
    .body { padding: 32px; color: #333333; line-height: 1.7; font-size: 15px; }
    .body h2 { color: #2d5016; font-size: 20px; margin-top: 0; }
    .btn { display: inline-block; background: ${BRAND_COLOR}; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; font-size: 15px; }
    .btn:hover { background: #6da030; }
    .detail-box { background: #f4fbe8; border-left: 4px solid ${BRAND_COLOR}; padding: 16px 20px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .detail-box p { margin: 4px 0; }
    .footer { background: #f9faf7; padding: 24px 32px; text-align: center; color: #888; font-size: 13px; border-top: 1px solid #eee; }
    .progress-bar { background: #e8e8e8; border-radius: 10px; height: 20px; overflow: hidden; margin: 12px 0; }
    .progress-fill { background: ${BRAND_COLOR}; height: 100%; border-radius: 10px; transition: width 0.3s; }
    .milestone { text-align: center; padding: 20px; }
    .milestone .number { font-size: 48px; font-weight: 700; color: ${BRAND_COLOR}; }
  </style>
</head>
<body>
  <div style="padding: 20px 12px;">
    <div class="container">
      <div class="header">
        <h1>🌳 ${SCHOOL_NAME}</h1>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>${SCHOOL_NAME} Volunteer Portal</p>
        <p><a href="${APP_URL}" style="color: ${BRAND_COLOR};">Visit Portal</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html: emailWrapper(html),
    });
    console.log(`Email sent: ${subject} → ${to}`);
    return true;
  } catch (error) {
    console.error(`Email failed: ${subject} → ${to}`, error);
    return false;
  }
}

// === EMAIL TEMPLATES ===

export async function sendWelcomeEmail(parent: {
  email: string;
  first_name: string;
}, requiredHours: number): Promise<boolean> {
  return sendEmail(
    parent.email,
    `Welcome to the ${SCHOOL_NAME} Volunteer Portal!`,
    `
    <h2>Welcome, ${parent.first_name}! 🎉</h2>
    <p>Thank you for joining the ${SCHOOL_NAME} Volunteer Portal. We're excited to have you as part of our community!</p>
    
    <div class="detail-box">
      <p><strong>Your volunteer hour requirement:</strong> ${requiredHours} hours per school year</p>
      <p><strong>Getting started:</strong> Browse available opportunities and sign up today!</p>
    </div>
    
    <p>Here's what you can do in the portal:</p>
    <ul>
      <li>Browse and sign up for volunteer opportunities</li>
      <li>Track your volunteer hours</li>
      <li>View your upcoming events</li>
      <li>See your volunteer history</li>
    </ul>
    
    <p style="text-align: center;">
      <a href="${APP_URL}/dashboard" class="btn">Go to Dashboard</a>
    </p>
    
    <p>Thank you for making a difference at ${SCHOOL_NAME}!</p>
    `
  );
}

export async function sendSignupConfirmation(parent: {
  email: string;
  first_name: string;
}, event: {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  hours_credit: number;
}): Promise<boolean> {
  const date = new Date(event.event_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return sendEmail(
    parent.email,
    `Confirmed: ${event.title} on ${date}`,
    `
    <h2>You're signed up! ✅</h2>
    <p>Hi ${parent.first_name}, your volunteer signup has been confirmed.</p>
    
    <div class="detail-box">
      <p><strong>Event:</strong> ${event.title}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${event.start_time} - ${event.end_time}</p>
      <p><strong>Location:</strong> ${event.location}</p>
      <p><strong>Hours Credit:</strong> ${event.hours_credit} hours</p>
    </div>
    
    <p>We look forward to seeing you there! If you need to cancel, you can do so from your dashboard.</p>
    
    <p style="text-align: center;">
      <a href="${APP_URL}/dashboard" class="btn">View Dashboard</a>
    </p>
    `
  );
}

export async function sendEventReminder(parent: {
  email: string;
  first_name: string;
}, event: {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
}): Promise<boolean> {
  const date = new Date(event.event_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return sendEmail(
    parent.email,
    `Reminder: ${event.title} Tomorrow`,
    `
    <h2>Friendly Reminder 📅</h2>
    <p>Hi ${parent.first_name}, just a quick reminder about your upcoming volunteer event tomorrow!</p>
    
    <div class="detail-box">
      <p><strong>Event:</strong> ${event.title}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${event.start_time} - ${event.end_time}</p>
      <p><strong>Location:</strong> ${event.location}</p>
    </div>
    
    <p>Thank you for volunteering your time!</p>
    `
  );
}

export async function sendThankYouEmail(parent: {
  email: string;
  first_name: string;
}, event: {
  title: string;
  hours_credit: number;
}, totalHours: number, requiredHours: number): Promise<boolean> {
  const remaining = Math.max(0, requiredHours - totalHours);
  const percentage = Math.min(100, Math.round((totalHours / requiredHours) * 100));

  return sendEmail(
    parent.email,
    `Thank you for volunteering! Hours updated`,
    `
    <h2>Thank You! 🙏</h2>
    <p>Hi ${parent.first_name}, thank you for volunteering at <strong>${event.title}</strong>!</p>
    
    <div class="detail-box">
      <p><strong>Hours credited:</strong> ${event.hours_credit} hours</p>
      <p><strong>Total hours completed:</strong> ${totalHours} of ${requiredHours}</p>
      <p><strong>Hours remaining:</strong> ${remaining}</p>
    </div>
    
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percentage}%"></div>
    </div>
    <p style="text-align: center; color: #666; font-size: 14px;">${percentage}% complete</p>
    
    ${totalHours >= requiredHours 
      ? `<p style="text-align: center; font-size: 18px; color: ${BRAND_COLOR}; font-weight: 600;">🎉 You've met your volunteer requirement! Thank you!</p>`
      : `<p>Keep up the great work! You're making a real difference at ${SCHOOL_NAME}.</p>`
    }
    
    <p style="text-align: center;">
      <a href="${APP_URL}/opportunities" class="btn">Browse More Opportunities</a>
    </p>
    `
  );
}

export async function sendCancellationConfirmation(parent: {
  email: string;
  first_name: string;
}, event: {
  title: string;
  event_date: string;
}): Promise<boolean> {
  const date = new Date(event.event_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return sendEmail(
    parent.email,
    `Signup Cancelled: ${event.title}`,
    `
    <h2>Signup Cancelled</h2>
    <p>Hi ${parent.first_name}, your signup for <strong>${event.title}</strong> on ${date} has been cancelled.</p>
    
    <p>No worries! There are plenty of other opportunities to volunteer.</p>
    
    <p style="text-align: center;">
      <a href="${APP_URL}/opportunities" class="btn">Browse Opportunities</a>
    </p>
    `
  );
}

export async function sendMilestoneEmail(parent: {
  email: string;
  first_name: string;
}, milestone: number, totalHours: number, requiredHours: number): Promise<boolean> {
  return sendEmail(
    parent.email,
    `Milestone Reached: ${milestone} Volunteer Hours! 🎉`,
    `
    <div class="milestone">
      <div class="number">${milestone}</div>
      <p style="font-size: 18px; color: #666; margin-top: 0;">hours of volunteering!</p>
    </div>
    
    <h2>Congratulations, ${parent.first_name}! 🏆</h2>
    <p>You've reached an incredible milestone of <strong>${milestone} volunteer hours</strong>!</p>
    
    <div class="detail-box">
      <p><strong>Total hours:</strong> ${totalHours}</p>
      <p><strong>Requirement:</strong> ${requiredHours} hours</p>
      <p><strong>Remaining:</strong> ${Math.max(0, requiredHours - totalHours)} hours</p>
    </div>
    
    <p>Your dedication makes ${SCHOOL_NAME} stronger. Thank you for all that you do!</p>
    
    <p style="text-align: center;">
      <a href="${APP_URL}/dashboard" class="btn">View Your Progress</a>
    </p>
    `
  );
}

export async function sendBroadcastEmail(
  to: string,
  subject: string,
  body: string,
  parentName: string,
  hoursRemaining: number
): Promise<boolean> {
  // Replace template variables
  const processedBody = body
    .replace(/\{parent_name\}/g, parentName)
    .replace(/\{hours_remaining\}/g, String(hoursRemaining))
    .replace(/\{school_name\}/g, SCHOOL_NAME)
    .replace(/\n/g, "<br>");

  return sendEmail(to, subject, `
    <h2>${subject}</h2>
    <p>${processedBody}</p>
    <p style="text-align: center; margin-top: 24px;">
      <a href="${APP_URL}/dashboard" class="btn">Visit Portal</a>
    </p>
  `);
}

export default sendEmail;
