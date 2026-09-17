<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Register the app namespace explicitly. The app's composer autoload may not
 * have dumped the lib/ PSR-4 mapping during CI, so we add a reliable fallback.
 */
spl_autoload_register(function (string $class): void {
	$prefix = 'OCA\\Renamer\\';
	if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
		return;
	}
	$relative = substr($class, strlen($prefix));
	$file = __DIR__ . '/../lib/' . str_replace('\\', '/', $relative) . '.php';
	if (is_file($file)) {
		require $file;
	}
});

spl_autoload_register(function (string $class): void {
	$prefix = 'OCA\\Renamer\\Tests\\';
	if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
		return;
	}
	$relative = substr($class, strlen($prefix));
	$file = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';
	if (is_file($file)) {
		require $file;
	}
});

// Minimal OCP stubs for the class graph needed to load CbzPreviewProvider when
// the real Nextcloud runtime is absent. Tests only exercise the pure, static
// CbzPreviewProvider::selectCoverEntry() method.
require_once __DIR__ . '/stubs.php';
