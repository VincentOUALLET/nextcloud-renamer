<?php
error_log('[Renamer][Bootstrap] file loaded');

namespace OCA\Renamer\Bootstrap;

use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\Util;

error_log('[Renamer][Bootstrap] namespace loaded');

if (!interface_exists(IBootstrap::class)) {
    error_log('[Renamer][Bootstrap] IBootstrap interface NOT FOUND');
} else {
    error_log('[Renamer][Bootstrap] IBootstrap interface FOUND');
}

class Application implements IBootstrap {
    public function __construct() {
        error_log('[Renamer][Bootstrap] instantiated');
    }

    public function register(IRegistrationContext $context): void {
        error_log('[Renamer][Bootstrap] register() called');

        if (method_exists($context, 'registerJSScript')) {
            try {
                $context->registerJSScript('renamer', 'rename');
                error_log('[Renamer][Bootstrap] registerJSScript ok');
            } catch (\Throwable $e) {
                error_log('[Renamer][Bootstrap] registerJSScript failed: ' . $e->getMessage());
            }
        } else {
            error_log('[Renamer][Bootstrap] registerJSScript NOT available');
        }

        try {
            Util::addScript('renamer', 'rename');
            error_log('[Renamer][Bootstrap] addScript ok');
        } catch (\Throwable $e) {
            error_log('[Renamer][Bootstrap] addScript failed: ' . $e->getMessage());
        }
    }

    public function boot(): void {
        error_log('[Renamer][Bootstrap] boot() called');
    }
}

error_log('[Renamer][Bootstrap] class defined');
