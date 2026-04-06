const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// BASE URL for buttons
const WEBAPP_URL = "https://u4b-app--u4bapp.asia-southeast1.hosted.app";

// ============================================================
// 1. GENERIC EMAIL
// ============================================================
const sendEmail = async (to, subject, text, html) => {
  try {
    await transporter.sendMail({
      from: `Upcycle4Better <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html, 
      text 
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error; 
  }
};

// ============================================================
// 2. EMAIL TO PIC (New Donation)
// ============================================================
const sendDonationNotificationToPIC = async (donationData, userData) => {
  const adminUrl = `${WEBAPP_URL}/admin/pending`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #417FA2; text-align: center; margin-bottom: 20px;">📢 New Donation Received</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 5px solid #417FA2;">
        <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Donation ID:</strong> #${donationData.id}</p>
        <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Bin Location:</strong> ${donationData.binCode}</p>
        <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Weight:</strong> ${donationData.weightKg} kg</p>
        <p style="margin: 8px 0; color: #333; font-size: 16px;"><strong>Status:</strong> <span style="color: #e67e22; font-weight: bold;">${donationData.status}</span></p>
      </div>

      <h3 style="color: #417FA2; font-size: 18px; margin-top: 25px;">User Details:</h3>
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
        ${userData.name}<br>
        <a href="mailto:${userData.email}" style="color: #417FA2; text-decoration: none;">${userData.email}</a>
      </p>

      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; border: 1px solid #bbf7d0; color: #166534;">
        <strong>System Verification Notes:</strong><br>
        ${donationData.notes}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" style="background-color: #417FA2; color: white; padding: 12px 25px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 5px; display: inline-block;">
          Review in Admin Panel
        </a>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `U4B System <${process.env.EMAIL_USER}>`,
      to: 'media@upcycle4better.com',
      subject: `📢 New Donation #${donationData.id}`,
      html: htmlContent
    });
    console.log('📧 Notification sent to PIC');
  } catch (error) {
    console.error('Error sending PIC email:', error);
  }
};

// ============================================================
// 3. EMAIL TO USER (Approved)
// ============================================================
const sendDonationApprovedEmail = async (userEmail, userName) => {
  const dashboardUrl = `${WEBAPP_URL}/dashboard`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #417FA2; margin: 0;">Donation Verified! 🎉</h2>
      </div>

      <p style="font-size: 16px; color: #333; text-align: center;">Hi <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.5;">
        Great news! Your recent donation has been successfully verified and approved by our team. You can now claim exclusive <b>vouchers</b> in the app
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="background-color: #A0BE6F; color: white; padding: 15px 25px; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block;">
          View Dashboard
        </a>
      </div>

      <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
        <p style="font-size: 14px; color: #777; margin-bottom: 5px;">Thank you for contributing to a sustainable future!</p>
        <p style="font-size: 14px; color: #417FA2; font-weight: bold; margin: 0;">The Upcycle4Better Team</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `Upcycle4Better <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🎉 Your Donation is Approved!',
      html: htmlContent
    });
    console.log('📧 Approval email sent to user');
  } catch (error) {
    console.error('Error sending user approval email:', error);
  }
};

// ============================================================
// 4. EMAIL TO USER (Rejected) - NEW FUNCTION
// ============================================================
const sendDonationRejectedEmail = async (userEmail, userName, reason, donationId) => {
  const dashboardUrl = `${WEBAPP_URL}/dashboard`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #D32F2F; margin: 0;">Update on Donation #${donationId}</h2>
      </div>

      <p style="font-size: 16px; color: #333; text-align: center;">Hi <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #333; text-align: center; line-height: 1.5;">
        Thank you for your submission. Unfortunately, we were unable to verify your recent donation.
      </p>
      
      <div style="background-color: #FEF2F2; padding: 20px; border-radius: 8px; border-left: 5px solid #D32F2F; margin: 25px 0;">
        <p style="margin: 0; color: #991B1B; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reason for Rejection</p>
        <p style="margin: 10px 0 0 0; color: #333; font-size: 16px;">${reason}</p>
      </div>

      <p style="font-size: 14px; color: #666; text-align: center; margin-bottom: 30px;">
        If you believe this is a mistake, please ensure your next submission clearly shows the bin and item being deposited.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="background-color: #757575; color: white; padding: 15px 25px; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block;">
          Return to App
        </a>
      </div>
      
      <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
        <p style="font-size: 14px; color: #417FA2; font-weight: bold; margin: 0;">The Upcycle4Better Team</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `Upcycle4Better <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Update regarding Donation #${donationId}`,
      html: htmlContent
    });
    console.log('📧 Rejection email sent to user');
  } catch (error) {
    console.error('Error sending user rejection email:', error);
  }
};

module.exports = { 
  sendEmail, 
  sendDonationNotificationToPIC, 
  sendDonationApprovedEmail,
  sendDonationRejectedEmail 
};