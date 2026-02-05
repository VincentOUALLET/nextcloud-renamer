document.addEventListener('DOMContentLoaded', function () {
	const form = document.getElementById('renamer-form');
	if (!form) return;

	form.addEventListener('submit', function (ev) {
		ev.preventDefault();

		const fd = new FormData();
		const checked = form.querySelectorAll('input[name="files[]"]:checked');
		if (checked.length === 0) {
			alert('Aucun fichier sélectionné.');
			return;
		}

		checked.forEach(function (cb) {
			fd.append('files[]', cb.value);
		});

		// include requesttoken hidden input if present
		const tokenInput = form.querySelector('input[name="requesttoken"]');
		const tokenValue = tokenInput ? tokenInput.value : '';

		// append token to FormData (server-side CSRF checks read it from POST body)
		if (tokenValue) {
			fd.append('requesttoken', tokenValue);
		}

		// use the form action so the request targets the correct route
		const endpoint = form.getAttribute('action') || (window.location.pathname.replace(/\/$/, '') + '/rename');

		// minimal headers; X-Requested-With helps server detect AJAX
		const headers = {
			'X-Requested-With': 'XMLHttpRequest'
		};
		if (tokenValue) {
			headers['requesttoken'] = tokenValue;
		}

		fetch(endpoint, {
			method: 'POST',
			body: fd,
			credentials: 'same-origin',
			headers: headers
		}).then(function (r) {
			if (!r.ok) {
				throw new Error('Network response was not ok (' + r.status + ')');
			}
			return r.json();
		}).then(function (data) {
			if (data && data.success) {
				let msg = '';
				if (data.renamed && data.renamed.length) {
					msg += 'Renamed:\n' + data.renamed.map(function (r) { return r.from + ' → ' + r.to; }).join('\n') + '\n';
				}
				if (data.skipped && data.skipped.length) {
					msg += 'Skipped (collision or missing):\n' + data.skipped.join('\n') + '\n';
				}
				if (data.errors && data.errors.length) {
					msg += 'Errors:\n' + data.errors.join('\n') + '\n';
				}
				alert(msg || 'Renommage terminé.');
				location.reload();
			} else {
				alert('Échec du renommage: ' + (data && data.errors ? data.errors.join('; ') : 'Unknown error'));
			}
		}).catch(function (err) {
			alert('Erreur: ' + err.message);
		});
	});
});
