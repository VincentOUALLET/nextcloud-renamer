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
		if (tokenInput) {
			fd.append('requesttoken', tokenInput.value);
		}

		fetch('/apps/renamer/rename', {
			method: 'POST',
			body: fd,
			credentials: 'same-origin',
			headers: {
				// no content-type so browser sets multipart/form-data
			}
		}).then(function (r) {
			if (!r.ok) {
				throw new Error('Network response was not ok');
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
				// reload to update list
				location.reload();
			} else {
				alert('Échec du renommage: ' + (data && data.errors ? data.errors.join('; ') : 'Unknown error'));
			}
		}).catch(function (err) {
			alert('Erreur: ' + err.message);
		});
	});
});
