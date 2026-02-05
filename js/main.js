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

		console.log('Renamer: POST', endpoint);

		fetch(endpoint, {
			method: 'POST',
			body: fd,
			credentials: 'same-origin',
			headers: headers,
			// don't trigger navigation; handle redirects within fetch
			redirect: 'follow'
		}).then(function (r) {
			// Always capture status & headers for debugging
			console.log('Renamer: response status', r.status, r.statusText);
			// Try to parse JSON, otherwise return text
			const contentType = r.headers.get('content-type') || '';
			if (contentType.indexOf('application/json') !== -1) {
				return r.json().then(function (json) {
					return { ok: r.ok, status: r.status, body: json };
				});
			}
			// non-JSON response (HTML error page etc.)
			return r.text().then(function (text) {
				return { ok: r.ok, status: r.status, body: text };
			});
		}).then(function (res) {
			if (!res.ok) {
				// show detailed error so you can debug route / method issues
				console.error('Renamer error', res.status, res.body);
				alert('Erreur serveur: ' + res.status + '\nVoir console pour le détail.');
				return;
			}

			// If body is object and has success flag, handle it; otherwise show raw body
			if (typeof res.body === 'object' && res.body !== null) {
				const data = res.body;
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
					// stay on page; reload only when user confirms
					if (confirm('Recharger la page pour mettre à jour la liste ?')) {
						location.reload();
					}
				} else {
					console.warn('Renamer unexpected JSON response', data);
					alert('Réponse inattendue du serveur. Voir console pour plus de détails.');
				}
			} else {
				// HTML/text response on success (unlikely) — show it
				console.log('Renamer response body:', res.body);
				alert('Réponse du serveur: voir la console pour le contenu.');
			}
		}).catch(function (err) {
			console.error('Renamer fetch failed', err);
			alert('Erreur réseau ou parse: ' + err.message + '\nVoir console pour les détails.');
		});
	});
});
