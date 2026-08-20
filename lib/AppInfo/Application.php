<?php

namespace OCA\Renamer\AppInfo;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\Renamer\Listener\LoadAdditionalListener;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

error_log('[Renamer][AppInfo\Application] file parsed by autoloader');

class Application extends App implements IBootstrap {
    public const APP_ID = 'renamer';

    public function __construct(array $urlParams = []) {
        error_log('[Renamer][AppInfo\Application] constructing');
        parent::__construct(self::APP_ID, $urlParams);
    }

    public function register(IRegistrationContext $context): void {
        error_log('[Renamer][AppInfo\Application] register() called');

        $context->registerEventListener(
            LoadAdditionalScriptsEvent::class,
            LoadAdditionalListener::class
        );
        error_log('[Renamer][AppInfo\Application] registered listener for OCA\Files\Event\LoadAdditionalScriptsEvent');
    }

    public function boot(IBootContext $context): void {
        error_log('[Renamer][AppInfo\Application] boot() called');
    }
}
