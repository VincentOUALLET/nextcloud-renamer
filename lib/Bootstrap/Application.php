<?php

namespace OCA\Renamer\Bootstrap;

use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Bootstrap\IJSRooter;
use OCP\Util;

class Application implements IBootstrap {
    public function register(IRegistrationContext $context): void {
        Util::addScript('renamer', 'rename');
    }

    public function boot(): void {
        // No boot logic needed
    }
}
