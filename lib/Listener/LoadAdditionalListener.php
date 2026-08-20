<?php

namespace OCA\Renamer\Listener;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

error_log('[Renamer][Listener\LoadAdditionalListener] file parsed by autoloader');

class LoadAdditionalListener implements IEventListener {
    public function handle(Event $event): void {
        if (!($event instanceof LoadAdditionalScriptsEvent)) {
            return;
        }

        error_log('[Renamer][Listener] LoadAdditionalScriptsEvent fired -> injecting rename.js');
        Util::addScript('renamer', 'rename');
    }
}
