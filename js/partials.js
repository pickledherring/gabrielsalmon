// Swaps [data-include] slots for their partial, then marks the current
// page in the nav. The hamburger is CSS-only (a checkbox), so it needs
// no wiring here and keeps working once the markup is injected.
async function includePartials() {
    const slots = document.querySelectorAll('[data-include]');

    await Promise.all(Array.from(slots).map(async (el) => {
        const res = await fetch(el.getAttribute('data-include'));
        el.outerHTML = await res.text();
    }));

    const link = document.querySelector(`.site-nav [data-nav="${document.body.dataset.page}"]`);
    if (link) link.classList.add('active');
}

document.addEventListener('DOMContentLoaded', includePartials);
