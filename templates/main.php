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
			<form id="renamer-form" method="post" action="/" novalidate>
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

				<button id="renamer-submit" type="button">Renommer les fichiers cochés</button>
			</form>
		<?php endif; ?>

	<?php endif; ?>
</div>

<?php
// Ask Nextcloud to include the app script properly (it will add the correct CSP nonce)
\OCP\Util::addScript('renamer', 'main');
?>

