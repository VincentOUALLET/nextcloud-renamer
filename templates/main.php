<?php
/** @var array $files */
/** @var string $requesttoken */
/** @var bool $folderExists */
$files = $_['files'] ?? [];
$requesttoken = $_['requesttoken'] ?? '';
$folderExists = isset($_['folderExists']) ? (bool)$_['folderExists'] : true;

$esc = function($s) {
	return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
};

// compute nonce if available
$nonce = '';
try {
	if (isset(\OC::$server)) {
		$csp = \OC::$server->getContentSecurityPolicy();
		if ($csp !== null && method_exists($csp, 'getNonce')) {
			$nonce = $csp->getNonce();
		}
	}
} catch (\Throwable $e) {
	$nonce = '';
}
?>
<div class="section">
	<h2>Renamer — /RenamerTest</h2>

	<?php if (!$folderExists): ?>
		<p>Le dossier <strong>RenamerTest</strong> est introuvable dans votre espace. Créez-le dans votre répertoire utilisateur et ajoutez des fichiers test.</p>
	<?php else: ?>

		<?php if (count($files) === 0): ?>
			<p>Aucun fichier correspondant au motif trouvé dans /RenamerTest.</p>
		<?php else: ?>
			<form id="renamer-form" method="post" action="/apps/renamer/rename" novalidate>
				<input type="hidden" name="requesttoken" value="<?php echo $esc($requesttoken); ?>" />
				<ul>
					<?php foreach ($files as $f): ?>
						<li>
							<label>
								<input type="checkbox" name="files[]" value="<?php echo $esc($f); ?>" />
								<?php echo $esc($f); ?>
							</label>
						</li>
					<?php endforeach; ?>
				</ul>

				<!-- JS-driven button: use button so only JS triggers the AJAX call -->
				<button id="renamer-submit" type="button">Renommer les fichiers cochés</button>
			</form>
		<?php endif; ?>

	<?php endif; ?>
</div>

<!-- Inline JS with CSP nonce so it runs even if external script is blocked -->
<script nonce="<?php echo $esc($nonce); ?>">
(function(){
	'use strict';
	const form = document.getElementById('renamer-form');
	const btn = document.getElementById('renamer-submit');
	if (!form || !btn) {
		console.log('Renamer: form or button not found, aborting JS.');
		return;
	}

	function logAndAlert(level, msg) {
		// console log + minimal user alert
		if (level === 'error') console.error('Renamer:', msg);
		else if (level === 'warn') console.warn('Renamer:', msg);
		else console.log('Renamer:', msg);
		// small user-visible notification
		if (level === 'error') {
			alert('Renamer error: ' + msg);
		}
	}

	async function doRename() {
		try {
			console.log('Renamer: starting rename request');
			const checked = form.querySelectorAll('input[name="files[]"]:checked');
			if (!checked || checked.length === 0) {
				alert('Aucun fichier sélectionné.');
				return;
			}
			const fd = new FormData();
			checked.forEach(cb => fd.append('files[]', cb.value));

			const tokenInput = form.querySelector('input[name="requesttoken"]');
			const tokenValue = tokenInput ? tokenInput.value : '';
			if (tokenValue) fd.append('requesttoken', tokenValue);

			const endpoint = form.getAttribute('action') || (window.location.pathname.replace(/\/$/, '') + '/rename');

			const headers = { 'X-Requested-With': 'XMLHttpRequest' };
			if (tokenValue) headers['requesttoken'] = tokenValue;

			console.log('Renamer: POST', endpoint);
			const res = await fetch(endpoint, {
				method: 'POST',
				body: fd,
				credentials: 'same-origin',
				headers: headers,
				redirect: 'follow'
			});

			console.log('Renamer: response status', res.status, res.statusText);
			const contentType = res.headers.get('content-type') || '';
			let body;
			if (contentType.indexOf('application/json') !== -1) {
				body = await res.json();
			} else {
				body = await res.text();
			}

			if (!res.ok) {
				// log server error body for debugging
				logAndAlert('error', 'HTTP ' + res.status + ' — see console for response body');
				console.error('Renamer response body:', body);
				return;
			}

			// success path for JSON response
			if (typeof body === 'object' && body !== null) {
				console.log('Renamer: success response', body);
				let msg = '';
				if (body.renamed && body.renamed.length) {
					msg += 'Renamed:\n' + body.renamed.map(r => (r.from + ' → ' + r.to)).join('\n') + '\n';
				}
				if (body.skipped && body.skipped.length) {
					msg += 'Skipped:\n' + body.skipped.join('\n') + '\n';
				}
				if (body.errors && body.errors.length) {
					msg += 'Errors:\n' + body.errors.join('\n') + '\n';
				}
				if (msg) {
					alert(msg);
				} else {
					alert('Renommage terminé.');
				}
				return;
			}

			// non-JSON successful response — show it in console
			console.log('Renamer: non-JSON success response:', body);
			alert('Renommage terminé (voir console pour détails).');
		} catch (err) {
			logAndAlert('error', err && err.message ? err.message : String(err));
			console.error('Renamer fetch error', err);
		}
	}

	btn.addEventListener('click', function(ev){
		ev.preventDefault();
		doRename();
	});

	// keep a submit handler as fallback if someone triggers submit programmatically
	form.addEventListener('submit', function(ev){
		ev.preventDefault();
		doRename();
	});
})();
</script>

