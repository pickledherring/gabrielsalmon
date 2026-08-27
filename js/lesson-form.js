// Submits the lessons inquiry form without leaving the page.
// If the Pages Function isn't reachable or configured, the visitor is told
// to use the mailto link below the form instead.
document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.lesson-form');
    var status = document.getElementById('form-status');
    if (!form || !status) return;

    var button = form.querySelector('.lesson-submit');

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        status.textContent = 'Sending...';
        button.disabled = true;

        fetch(form.action, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: new FormData(form)
        }).then(function (response) {
            if (!response.ok) throw new Error('Request failed');
            // form.reset();
            status.textContent = form.dataset.success || 'Thanks. I will get back to you soon.';
        }).catch(function () {
            status.textContent = 'That did not send. Please email gtsalmon@gmail.com directly.';
        }).finally(function () {
            button.disabled = false;
        });
    });
});
