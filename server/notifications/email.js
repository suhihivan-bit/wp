/**
 * Email Notification Service using Resend
 * Adapted for self-hosted server
 */

import fetch from 'node-fetch';

/**
 * Send email notifications for a new booking
 * @param {Object} booking - Booking data
 * @param {Object} config - Email configuration (apiKey, adminEmail)
 * @returns {Promise<boolean>}
 */
export async function sendEmailNotifications(booking, config) {
    const { apiKey, adminEmail } = config;

    if (!apiKey || !adminEmail) {
        console.warn('⚠️ Resend credentials missing, skipping email notifications');
        return false;
    }

    try {
        await Promise.all([
            sendClientEmail(booking, apiKey),
            sendAdminEmail(booking, apiKey, adminEmail)
        ]);

        console.log('✅ Email notifications sent successfully via Resend');
        return true;

    } catch (error) {
        console.error('❌ Failed to send email notifications:', error);
        throw error;
    }
}

/**
 * Send confirmation email to client
 */
async function sendClientEmail(booking, apiKey) {
    const { fullName, email, date, time, phone } = booking;

    // Format date
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}.${month}.${year}`;

    const emailData = {
        from: 'Приёмная комиссия <onboarding@resend.dev>',
        to: [email],
        subject: 'Подтверждение записи на консультацию',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-block { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
    .label { font-weight: bold; color: #667eea; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Запись подтверждена</h1>
    </div>
    <div class="content">
      <p>Здравствуйте, <strong>${fullName}</strong>!</p>
      <p>Ваша запись на консультацию успешно оформлена.</p>
      
      <div class="info-block">
        <p><span class="label">📅 Дата:</span> ${formattedDate}</p>
        <p><span class="label">🕐 Время:</span> ${time}</p>
        <p><span class="label">📧 Email:</span> ${email}</p>
        <p><span class="label">📱 Телефон:</span> ${phone}</p>
      </div>

      <p>Мы свяжемся с вами для подтверждения встречи.</p>
      <p>Если у вас возникли вопросы, вы можете ответить на это письмо.</p>

      <p>С уважением,<br><strong>Приёмная комиссия</strong></p>
    </div>
    <div class="footer">
      <p>Это автоматическое письмо с платформы записи на консультации.</p>
    </div>
  </div>
</body>
</html>
    `
    };

    return sendEmail(emailData, apiKey);
}

/**
 * Send notification email to admin
 */
async function sendAdminEmail(booking, apiKey, adminEmail) {
    const { fullName, email, phone, date, time, category, messenger, messengerHandle, questions } = booking;

    // Format date
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}.${month}.${year}`;

    const categoryText = category === 'applicant' ? '🎓 Абитуриент' : '👪 Родитель';
    const messengerIcons = {
        telegram: '📱 Telegram',
        whatsapp: '💬 WhatsApp',
        viber: '📞 Viber',
        none: '✉️ Email'
    };
    const messengerText = messengerIcons[messenger] || '✉️ Email';

    const emailData = {
        from: 'Система записи <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `🔔 Новая запись: ${fullName} (${formattedDate} ${time})`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-block { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .info-row { padding: 10px 0; border-bottom: 1px solid #eee; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #f5576c; display: inline-block; width: 150px; }
    h1 { margin: 0; font-size: 24px; }
    .questions-box { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Новая запись</h1>
    </div>
    <div class="content">
      <p><strong>Получена новая запись на консультацию:</strong></p>
      
      <div class="info-block">
        <div class="info-row">
          <span class="label">👤 ФИО:</span> ${fullName}
        </div>
        <div class="info-row">
          <span class="label">📧 Email:</span> ${email}
        </div>
        <div class="info-row">
          <span class="label">📱 Телефон:</span> ${phone}
        </div>
        <div class="info-row">
          <span class="label">📅 Дата:</span> ${formattedDate}
        </div>
        <div class="info-row">
          <span class="label">🕐 Время:</span> ${time}
        </div>
        <div class="info-row">
          <span class="label">👥 Категория:</span> ${categoryText}
        </div>
        ${messenger !== 'none' && messengerHandle ? `
        <div class="info-row">
          <span class="label">${messengerText}:</span> ${messengerHandle}
        </div>
        ` : ''}
      </div>

      ${questions ? `
      <div class="questions-box">
        <strong>❓ Вопросы:</strong><br>
        ${questions.replace(/\n/g, '<br>')}
      </div>
      ` : ''}

      <p style="margin-top: 20px;">Проверьте запись в админ-панели для подтверждения.</p>
    </div>
  </div>
</body>
</html>
    `
    };

    return sendEmail(emailData, apiKey);
}

/**
 * Send email via Resend API
 */
async function sendEmail(emailData, apiKey) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log(`📧 Email sent via Resend, ID: ${result.id}`);

    return true;
}
