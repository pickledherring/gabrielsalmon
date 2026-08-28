// functions/api/lesson-inquiry.js
// Handles the lessons form end to end: validates, checks the monthly cap
// in KV, then sends via Resend.

const MONTHLY_CAP = 250;

export async function onRequestPost({ request, env }) {
    let form;
    try {
        form = await request.formData();
    } catch {
        return new Response('Could not read form.', { status: 400 });
    }

    const name = (form.get('name') || '').toString().trim().slice(0, 200);
    const contact = (form.get('contact') || '').toString().trim().slice(0, 200);
    const body = (form.get('message') || '').toString().trim().slice(0, 4000);

    if (!name || !contact || !body) {
        return new Response('All fields are required.', { status: 400 });
    }

    const monthKey = new Date().toISOString().slice(0, 7); // "2026-08"
    const current = parseInt((await env.FORM_COUNTS.get(monthKey)) || '0', 10);

    if (current >= MONTHLY_CAP) {
        return new Response(
            JSON.stringify({ error: 'Form is temporarily unavailable. Please email me directly.' }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
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
        return new Response('Could not send the message.', { status: 502 });
    }

    await env.FORM_COUNTS.put(monthKey, String(current + 1));

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}