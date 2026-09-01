// Shows a Function's result after it redirects back here with ?sent=1 or
// ?error=<code>, then cleans the query string. Shared by the lessons
// inquiry form and the mailing list form.
(function () {
    var banner = document.getElementById('form-banner');
    if (!banner) return;

    var params = new URLSearchParams(location.search);
    var messages = {
        fields: 'Please fill out every field.',
        cap: 'This form is full for the month. Please email me directly.',
        send: 'That did not send. Please email me directly.',
        form: 'Something went wrong reading the form. Please try again.'
    };

    var kind = null;
    var text = null;

    if (params.has('sent')) {
        kind = 'success';
        // Each form supplies its own success wording via data-success
        var form = document.querySelector('form[data-success]');
        text = (form && form.getAttribute('data-success')) || 'Thanks! I will get back to you soon.';
    } else if (params.has('error')) {
        kind = 'error';
        text = messages[params.get('error')] || 'Something went wrong. Please email me directly.';
    }

    if (kind) {
        banner.innerHTML = '<div class="form-banner form-banner-' + kind + '" role="status"></div>';
        banner.firstChild.textContent = text;
        history.replaceState(null, '', location.pathname);
    }
})();
