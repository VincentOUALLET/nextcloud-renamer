<?php
error_log('Renamer bootstrap file loaded');

namespace OCA\Renamer\Bootstrap;

use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\Util;

error_log('Renamer bootstrap namespace loaded');

if (!interface_exists(\OCP\AppFramework\Bootstrap\IBootstrap::class)) {
    error_log('Renamer bootstrap: IBootstrap interface NOT FOUND');
} else {
    error_log('Renamer bootstrap: IBootstrap interface FOUND');
}

class Application implements IBootstrap {
    public function __construct() {
        error_log('Renamer bootstrap Application instantiated');
    }

    public function register(IRegistrationContext $context): void {
        error_log('Renamer bootstrap register() called');

        if (method_exists($context, 'registerJSScript')) {
            try {
                $context->registerJSScript('renamer', 'rename');
                error_log('Renamer bootstrap registerJSScript ok');
            } catch (\Throwable $e) {
                error_log('Renamer bootstrap registerJSScript failed: ' . $e->getMessage());
            }
        } else {
            error_log('Renamer bootstrap: registerJSScript NOT available on context');
        }

        try {
            Util::addScript('renamer', 'rename');
            error_log('Renamer bootstrap Util::addScript ok');
        } catch (\Throwable $e) {
            error_log('Renamer bootstrap addScript failed: ' . $e->getMessage());
        }
    }

    public function boot(): void {
        error_log('Renamer bootstrap boot() called');
    }
}

error_log('Renamer bootstrap class defined');
