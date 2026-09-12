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
        Util::addScript('renamer', 'icons');
        Util::addScript('renamer', 'app');
        Util::addScript('renamer', 'navigation');
        Util::addScript('renamer', 'app-pdf');
        Util::addScript('renamer', 'app-metadata');
        Util::addScript('renamer', 'rename');
        Util::addScript('renamer', 'pdf.min');
        Util::addScript('renamer', 'jszip.min');
        Util::addScript('renamer', 'pdf.worker.min');
        Util::addScript('renamer', 'epub.min');
        Util::addScript('renamer', 'tabs/pdf/pdf-viewer');
        Util::addScript('renamer', 'tabs/pdf/cbz-viewer');
        Util::addScript('renamer', 'tabs/pdf/image-viewer');
        Util::addScript('renamer', 'tabs/pdf/epub-viewer');
        Util::addScript('renamer', 'tabs/pdf/reader');
        Util::addScript('renamer', 'tabs/reader/app-reader');
    }
}
