// functions/api/lesson-inquiry.js
// Handles the lessons form end to end: validates, checks the monthly cap
// in KV, then sends via Resend. Renders its response by fetching the real
// lessons.html and swapping the <!--BANNER--> placeholder

const MONTHLY_CAP = 250;

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function renderWithBanner(request, kind, message) {
    const pageUrl = new URL('/lessons.html', request.url);
    const page = await fetch(pageUrl);
    const html = await page.text();

    const banner = `<div class="form-banner form-banner-${kind}" role="status">${escapeHtml(message)}</div>`;
    const out = html.replace('<!--BANNER-->', banner);

    return new Response(out, {
        status: kind === 'success' ? 200 : 400,
        headers: { 'Content-Type': 'text/html' },
    });
}

export async function onRequestPost({ request, env }) {
    let form;
    try {
        form = await request.formData();
    } catch {
        return renderWithBanner(request, 'error', 'Something went wrong reading the form. Please try again.');
    }

    const name = (form.get('name') || '').toString().trim().slice(0, 200);
    const contact = (form.get('contact') || '').toString().trim().slice(0, 200);
    const body = (form.get('message') || '').toString().trim().slice(0, 4000);

    if (!name || !contact || !body) {
        return renderWithBanner(request, 'error', 'Please fill out every field.');
    }

    const monthKey = new Date().toISOString().slice(0, 7); // "2026-08"
    const current = parseInt((await env.FORM_COUNTS.get(monthKey)) || '0', 10);

    if (current >= MONTHLY_CAP) {
        return renderWithBanner(request, 'error', 'This form is full for the month. Please email me directly.');
    }

    const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: env.INQUIRY_FROM,
            to: [env.INQUIRY_TO],
            subject: `New lesson inquiry from ${name}`,
            text: `Name: ${name}\nContact: ${contact}\n\n${body}`,
        }),
    });

    if (!sent.ok) {
        return renderWithBanner(request, 'error', 'That did not send. Please email me directly.');
    }

    await env.FORM_COUNTS.put(monthKey, String(current + 1));

    return renderWithBanner(request, 'success', 'Thanks! I will get back to you soon.');
}