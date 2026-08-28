// collects lesson form information and posts to worker

export async function onRequestPost({ request }) {
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

    const sent = await fetch('https://form.gtsalmon.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, body }),
    });

    const status = sent.status;
    const bodyText = await sent.text();
    
    return new Response(bodyText, {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
