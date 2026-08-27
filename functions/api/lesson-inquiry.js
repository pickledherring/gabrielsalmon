// Cloudflare Pages Function: receives the lessons inquiry form and emails it.
// Env vars (set in the Cloudflare dashboard, not in this repo):
//   RESEND_API_KEY, INQUIRY_TO, INQUIRY_FROM
// Without them the request fails and the page points visitors at the mailto link.

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export async function onRequestPost({ request, env }) {
    if (!env.RESEND_API_KEY || !env.INQUIRY_TO || !env.INQUIRY_FROM) {
        return new Response('Email is not configured yet.', { status: 503 });
    }

    let form;
    try {
        form = await request.formData();
    } catch {
        return new Response('Could not read form.', { status: 400 });
    }

    // Length caps only. Whether an address is real is settled by the send,
    // not by a pattern match here.
    const name = (form.get('name') || '').toString().trim().slice(0, 200);
    const email = (form.get('email') || '').toString().trim().slice(0, 200);
    const message = (form.get('message') || '').toString().trim().slice(0, 4000);

    // The performance page posts list=performances; the lessons form omits it.
    const isSignup = form.get('list') === 'performances';

    if (!name || !email) {
        return new Response('Name and email are required.', { status: 400 });
    }

    const subject = isSignup
        ? `Concert list signup: ${name}`
        : `Lesson inquiry from ${name}`;

    let html = `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>`;

    if (isSignup) {
        html += `\n<p>Asked to be added to the concert email list.</p>`;
    } else {
        html += `\n<p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`;
    }

    const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: env.INQUIRY_FROM,
            to: [env.INQUIRY_TO],
            reply_to: email,
            subject,
            html,
        }),
    });

    if (!sent.ok) {
        return new Response('Could not send the message.', { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
