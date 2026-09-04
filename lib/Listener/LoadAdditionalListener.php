<?php

namespace OCA\Renamer\Listener;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

class LoadAdditionalListener implements IEventListener {
    public function handle(Event $event): void {
        if (!($event instanceof LoadAdditionalScriptsEvent)) {
            return;
        }

        Util::addScript('renamer', 'utils');
        Util::addScript('renamer', 'Sortable.min');
        Util::addScript('renamer', 'app');
        Util::addScript('renamer', 'rename');
    }
}
