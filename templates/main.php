<?php
/** @var array $files */
/** @var string $requesttoken */
/** @var bool $folderExists */
$files = $_['files'] ?? [];
$requesttoken = $_['requesttoken'] ?? '';
$folderExists = isset($_['folderExists']) ? (bool)$_['folderExists'] : true;
?>
<div class="section">
	<h2>Renamer — /RenamerTest</h2>

	<?php if (!$folderExists): ?>
		<p>Le dossier <strong>RenamerTest</strong> est introuvable dans votre espace. Créez-le dans votre répertoire utilisateur et ajoutez des fichiers test.</p>
	<?php else: ?>

		<?php if (count($files) === 0): ?>
			<p>Aucun fichier correspondant au motif trouvé dans /RenamerTest.</p>
		<?php else: ?>
			<form id="renamer-form" method="post" action="/apps/renamer/rename">
				<input type="hidden" name="requesttoken" value="<?php p($requesttoken); ?>" />
				<ul>
					<?php foreach ($files as $f): ?>
						<li>
							<label>
								<input type="checkbox" name="files[]" value="<?php p($f); ?>" />
								<?php p($f); ?>
							</label>
						</li>
					<?php endforeach; ?>
				</ul>

				<button id="renamer-submit" type="submit">Renommer les fichiers cochés</button>
			</form>
		<?php endif; ?>

	<?php endif; ?>
</div>

<script src="/apps/renamer/js/main.js"></script>

