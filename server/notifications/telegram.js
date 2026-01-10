/**
 * Telegram Notification Service
 * Adapted for self-hosted server
 */

import fetch from 'node-fetch';

/**
 * Send booking notification to Telegram
 * @param {Object} booking - Booking data
 * @param {Object} config - Telegram configuration (botToken, chatId)
 * @returns {Promise<boolean>}
 */
export async function sendTelegramNotification(booking, config) {
    const { botToken, chatId } = config;

    if (!botToken || !chatId) {
        console.warn('⚠️ Telegram credentials missing, skipping notification');
        return false;
    }

    try {
        const message = formatTelegramMessage(booking);
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
        }

        console.log('✅ Telegram message sent successfully');
        return true;

    } catch (error) {
        console.error('❌ Failed to send Telegram notification:', error);
        throw error;
    }
}

/**
 * Format booking data as Telegram message with HTML formatting
 * @param {Object} booking - Booking data
 * @returns {string} Formatted message
 */
function formatTelegramMessage(booking) {
    const categoryEmoji = booking.category === 'applicant' ? '🎓' : '👪';
    const categoryText = booking.category === 'applicant' ? 'Абитуриент' : 'Родитель';

    const messengerIcons = {
        telegram: '📱 Telegram',
        whatsapp: '💬 WhatsApp',
        viber: '📞 Viber',
        none: '✉️ Email'
    };
    const messengerText = messengerIcons[booking.messenger] || '✉️ Email';

    // Format date from YYYY-MM-DD to DD.MM.YYYY
    const [year, month, day] = booking.date.split('-');
    const formattedDate = `${day}.${month}.${year}`;

    let message = `🔔 <b>Новая запись на консультацию!</b>\n\n`;
    message += `👤 <b>ФИО:</b> ${booking.fullName}\n`;
    message += `📧 <b>Email:</b> ${booking.email}\n`;
    message += `📱 <b>Телефон:</b> ${booking.phone}\n`;
    message += `📅 <b>Дата:</b> ${formattedDate}\n`;
    message += `🕐 <b>Время:</b> ${booking.time}\n`;
    message += `${categoryEmoji} <b>Категория:</b> ${categoryText}\n`;

    if (booking.messenger !== 'none' && booking.messengerHandle) {
        message += `${messengerIcons[booking.messenger]} <b>Мессенджер:</b> ${booking.messengerHandle}\n`;
    }

    if (booking.questions && booking.questions.trim()) {
        message += `\n❓ <b>Вопросы:</b>\n${booking.questions}`;
    }

    return message;
}
