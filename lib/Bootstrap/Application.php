<?php

namespace OCA\Renamer\Bootstrap;

use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Bootstrap\IJSRooter;
use OCP\Util;

class Application implements IBootstrap {
    public function register(IRegistrationContext $context): void {
        try {
            $ref = new \ReflectionClass($context);
            error_log('Renamer bootstrap register, context class=' . $ref->getName());
            if (method_exists($context, 'registerJSScript')) {
                $context->registerJSScript('renamer', 'rename');
                error_log('Renamer bootstrap registerJSScript ok');
            }
        } catch (\Throwable $e) {
            error_log('Renamer bootstrap registerJSScript failed: ' . $e->getMessage());
        }

        try {
            Util::addScript('renamer', 'rename');
            error_log('Renamer bootstrap addScript ok');
        } catch (\Throwable $e) {
            error_log('Renamer bootstrap addScript failed: ' . $e->getMessage());
        }
    }

    public function boot(): void {
        error_log('Renamer bootstrap boot');
    }
}
