<?php

namespace OCA\Renamer\Bootstrap;

use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

class Application implements IBootstrap {
    public function register(IRegistrationContext $context): void {
        $context->registerJSScript('renamer', 'rename');
    }

    public function boot(): void {
        // No boot logic needed
    }
}
