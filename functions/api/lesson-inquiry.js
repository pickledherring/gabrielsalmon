// functions/api/lesson-inquiry.js
// Handles the lessons form end to end: validates, checks the monthly cap
// in KV, then sends via Resend. Always finishes with a redirect back to
// lessons.html (redirect-after-POST, so a reload never resubmits the form),
// carrying a ?sent=1 or ?error=<code> query param that lessons.html reads
// on load to show the matching banner text.

const MONTHLY_CAP = 250;

function redirectTo(request, query) {
    const url = new URL('/lessons.html', request.url);
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
    const contact = (form.get('contact') || '').toString().trim().slice(0, 200);
    const body = (form.get('message') || '').toString().trim().slice(0, 4000);

    if (!name || !contact || !body) {
        return redirectTo(request, 'error=fields');
    }

    const monthKey = new Date().toISOString().slice(0, 7); // "2026-08"
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
            subject: `New lesson inquiry from ${name}`,
            text: `Name: ${name}\nContact: ${contact}\n\n${body}`,
        }),
    });

    if (!sent.ok) {
        return redirectTo(request, 'error=send');
    }

    await env.FORM_COUNTS.put(monthKey, String(current + 1));

    return redirectTo(request, 'sent=1');
}