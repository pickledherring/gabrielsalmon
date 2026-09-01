// Handles the mailing list form end to end: validates, checks the monthly cap in KV, then sends via Resend

const MONTHLY_CAP = 250;

function redirectTo(request, query) {
    const url = new URL('/upcoming.html', request.url);
    url.search = query;
    return Response.redirect(url, 303);
}

export async function onRequestPost({ request, env }) {
    let form;
    try {
        form = await request.formData();
    } catch {
        return redirectTo(request, 'error=form');
    }

    const name = (form.get('name') || '').toString().trim().slice(0, 200);
    const email = (form.get('email') || '').toString().trim().slice(0, 200);

    if (!name || !email) {
        return redirectTo(request, 'error=fields');
    }

    const monthKey = `sends:${new Date().toISOString().slice(0, 7)}`;
    const current = parseInt((await env.FORM_COUNTS.get(monthKey)) || '0', 10);

    if (current >= MONTHLY_CAP) {
        return redirectTo(request, 'error=cap');
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
            reply_to: email,
            subject: `New mailing list subscription from ${name}`,
            text: `Name: ${name}\nEmail: ${email}`,
        }),
    });

    if (!sent.ok) {
        return redirectTo(request, 'error=send');
    }

    await env.FORM_COUNTS.put(monthKey, String(current + 1), {
        expirationTtl: 60 * 60 * 24 * 70,
    });

    return redirectTo(request, 'sent=1');
}