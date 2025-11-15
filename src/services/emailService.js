import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    this.fromName = process.env.FROM_NAME || 'Pakistani Matchmaking App';
  }

  /**
   * Send verification code email to user
   */
  async sendVerificationEmail(email, name, verificationCode) {
    try {
      console.log(`📧 Sending verification email to: ${email}`);

      const { data, error } = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Verify Your Email - Matchmaking App',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 40px 30px; }
              .verification-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px 0; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .warning { color: #e74c3c; font-size: 14px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Pakistani Matchmaking!</h1>
              </div>
              <div class="content">
                <p>Assalam-o-Alaikum <strong>${name}</strong>,</p>
                <p>Thank you for signing up! To complete your registration, please verify your email address using the code below:</p>
                
                <div class="verification-code">${verificationCode}</div>
                
                <p>This code will expire in <strong>2 minutes</strong>.</p>
                <p>If you didn't create an account with us, please ignore this email.</p>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
                </div>
              </div>
              <div class="footer">
                <p>© 2025 Pakistani Matchmaking App. All rights reserved.</p>
                <p>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Email sending failed:', error);
        throw new Error(`Failed to send verification email: ${error.message}`);
      }

      console.log('✅ Verification email sent successfully:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Error in sendVerificationEmail:', error.message);
      throw error;
    }
  }

  /**
   * Resend verification code email
   */
  async resendVerificationEmail(email, name, verificationCode) {
    try {
      console.log(`📧 Resending verification email to: ${email}`);

      const { data, error } = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Resend: Email Verification Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 40px 30px; }
              .verification-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px 0; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Verification Code Resent</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${name}</strong>,</p>
                <p>Here's your new verification code as requested:</p>
                
                <div class="verification-code">${verificationCode}</div>
                
                <p>This code will expire in <strong>2 minutes</strong>.</p>
                <p style="color: #e74c3c;">If you didn't request this code, please secure your account immediately.</p>
              </div>
              <div class="footer">
                <p>© 2025 Pakistani Matchmaking App. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Email resending failed:', error);
        throw new Error(`Failed to resend verification email: ${error.message}`);
      }

      console.log('✅ Verification email resent successfully:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Error in resendVerificationEmail:', error.message);
      throw error;
    }
  }

  /**
   * Send forgot password email with reset link
   */
  async sendForgotPasswordEmail(email, name, resetToken) {
    try {
      console.log(`📧 Sending password reset email to: ${email}`);
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      const { data, error } = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Reset Your Password - Matchmaking App',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 40px 30px; }
              .button { display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .warning { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${name}</strong>,</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea; font-size: 12px;">${resetUrl}</p>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul style="margin: 10px 0;">
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Your password won't change until you access the link and set a new one</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>© 2025 Pakistani Matchmaking App. All rights reserved.</p>
                <p>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Password reset email failed:', error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
      }

      console.log('✅ Password reset email sent successfully:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Error in sendForgotPasswordEmail:', error.message);
      throw error;
    }
  }

  /**
   * Send security alert for failed login attempt
   */
  async sendFailedLoginAlert(email, name, ipAddress, timestamp, location = 'Unknown') {
    try {
      console.log(`📧 Sending failed login alert to: ${email}`);

      const { data, error } = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: '🚨 Security Alert: Failed Login Attempt',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: #e74c3c; color: white; padding: 30px; text-align: center; }
              .content { padding: 40px 30px; }
              .alert-box { background: #fee; padding: 20px; border-radius: 8px; border-left: 4px solid #e74c3c; margin: 20px 0; }
              .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .button { display: inline-block; padding: 12px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚨 Security Alert</h1>
              </div>
              <div class="content">
                <p>Assalam-o-Alaikum <strong>${name}</strong>,</p>
                
                <div class="alert-box">
                  <h3 style="margin-top: 0; color: #e74c3c;">Failed Login Attempt Detected</h3>
                  <p>Someone tried to log into your account but failed. If this was you, you can safely ignore this email.</p>
                </div>
                
                <h4>Attempt Details:</h4>
                <div class="info-box">
                  <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} PKT</p>
                  <p><strong>IP Address:</strong> ${ipAddress}</p>
                  <p><strong>Location:</strong> ${location}</p>
                </div>
                
                <h4>⚠️ If this wasn't you:</h4>
                <ul>
                  <li>Change your password immediately</li>
                  <li>Enable two-factor authentication</li>
                  <li>Review your account activity</li>
                  <li>Contact our support team if you need help</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL}/reset-password" class="button">Change Password Now</a>
                </div>
              </div>
              <div class="footer">
                <p>© 2025 Pakistani Matchmaking App. All rights reserved.</p>
                <p>This is an automated security alert.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Failed login alert email failed:', error);
        throw new Error(`Failed to send login alert: ${error.message}`);
      }

      console.log('✅ Failed login alert sent successfully:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Error in sendFailedLoginAlert:', error.message);
      throw error;
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email, name) {
    try {
      console.log(`📧 Sending welcome email to: ${email}`);

      const { data, error } = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Welcome to Pakistani Matchmaking! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
              .content { padding: 40px 30px; }
              .button { display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .feature-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome Aboard!</h1>
              </div>
              <div class="content">
                <p>Assalam-o-Alaikum <strong>${name}</strong>,</p>
                <p>Congratulations! Your email has been verified successfully. You're now part of Pakistan's most trusted matchmaking platform.</p>
                
                <h3>Next Steps:</h3>
                <div class="feature-box">
                  <strong>1. Complete Your Profile</strong>
                  <p>Add your photos, personal details, and preferences to get better matches.</p>
                </div>
                <div class="feature-box">
                  <strong>2. Verify Your Identity</strong>
                  <p>Take a selfie for verification to build trust with potential matches.</p>
                </div>
                <div class="feature-box">
                  <strong>3. Start Matching</strong>
                  <p>Browse profiles and find your perfect match!</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL}/complete-profile" class="button">Complete Your Profile</a>
                </div>
                
                <p style="margin-top: 30px;">If you have any questions, our support team is always here to help.</p>
              </div>
              <div class="footer">
                <p>© 2025 Pakistani Matchmaking App. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Welcome email failed:', error);
        return { success: false };
      }

      console.log('✅ Welcome email sent successfully:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Error in sendWelcomeEmail:', error.message);
      return { success: false };
    }
  }
}

export default new EmailService();
