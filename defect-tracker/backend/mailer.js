const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendNewDefectNotification({ to, defect }) {
    if (!to) return;

    const deadline   = defect.deadline ? defect.deadline.slice(0, 10) : 'Not set';
    const priority   = defect.priority.charAt(0).toUpperCase() + defect.priority.slice(1);
    const description = defect.description || '(No description provided)';

    const html = `
        <table style="font-family:Arial,sans-serif;font-size:14px;color:#333;border-collapse:collapse;width:100%;max-width:600px">
            <tr><td colspan="2" style="background:#1d4ed8;color:#fff;padding:16px 20px;font-size:16px;font-weight:bold">
                New Defect Reported — #${defect.id}
            </td></tr>
            <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;width:140px;font-weight:bold;color:#555">Project</td>
                <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb">${defect.project_name}</td>
            </tr>
            <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;font-weight:bold;color:#555">Reported By</td>
                <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb">${defect.functional_username}</td>
            </tr>
            <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;font-weight:bold;color:#555">Deadline</td>
                <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb">${deadline}</td>
            </tr>
            <tr>
                <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;font-weight:bold;color:#555">Priority</td>
                <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb">${priority}</td>
            </tr>
            <tr>
                <td style="padding:12px 20px;font-weight:bold;color:#555;vertical-align:top">Description</td>
                <td style="padding:12px 20px;white-space:pre-wrap">${description}</td>
            </tr>
        </table>
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;margin-top:16px">
            Sent by Linxas Defect Tracker
        </p>
    `;

    await transporter.sendMail({
        from: `"Linxas Defect Tracker" <${process.env.SMTP_USER}>`,
        to,
        subject: `[Defect #${defect.id}] ${defect.title}`,
        html,
    });
}

module.exports = { sendNewDefectNotification };
