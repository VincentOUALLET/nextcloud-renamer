<?php

namespace OCA\Renamer\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\Files\IRootFolder;
use OCP\IContainer;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;
use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\Renamer\Listener\LoadAdditionalListener;
use OCA\Renamer\Db\RuleMapper;
use OCA\Renamer\Service\MetadataService;
use OCA\Renamer\Service\PreviewService;
use OCA\Renamer\Service\RenameService;
use OCA\Renamer\Service\RuleService;
use OCA\Renamer\Service\Utils;

class Application extends App implements IBootstrap {
    public const APP_ID = 'renamer';

    public function __construct(array $urlParams = []) {
        parent::__construct(self::APP_ID, $urlParams);
    }

    public function register(IRegistrationContext $context): void {
        $context->registerEventListener(
            LoadAdditionalScriptsEvent::class,
            LoadAdditionalListener::class
        );

        $context->registerService(MetadataService::class, function (IContainer $c) {
            return new MetadataService(
                $c->get(LoggerInterface::class),
                $c->get(IRootFolder::class),
                $c->get(IUserSession::class)
            );
        });

        $context->registerService(PreviewService::class, function (IContainer $c) {
            return new PreviewService(
                $c->get(LoggerInterface::class),
                $c->get(MetadataService::class)
            );
        });

        $context->registerService(Utils::class, function (IContainer $c) {
            return new Utils(
                $c->get(LoggerInterface::class),
                $c->get(MetadataService::class)
            );
        });

        $context->registerService(RenameService::class, function (IContainer $c) {
            return new RenameService(
                $c->get(LoggerInterface::class),
                $c->get(IRootFolder::class),
                $c->get(IUserSession::class),
                $c->get(MetadataService::class),
                $c->get(Utils::class)
            );
        });

        $context->registerService(RuleService::class, function (IContainer $c) {
            return new RuleService(
                $c->get(LoggerInterface::class),
                $c->get(RuleMapper::class),
                $c->get(IUserSession::class)
            );
        });
    }

    public function boot(IBootContext $context): void {
        try {
            $connection = \OC::$server->getDatabaseConnection();
            $tableName = $connection->getTablePrefix() . 'renamer_rules';
            $columns = $connection->getSchemaManager()->listTableColumns($tableName);
            $columnNames = array_map(function($col) { return $col->getName(); }, $columns);
            
            $missing = [];
            if (!in_array('target', $columnNames)) $missing[] = "ADD COLUMN target VARCHAR(20) DEFAULT 'full' NOT NULL";
            if (!in_array('sequence_type', $columnNames)) $missing[] = "ADD COLUMN sequence_type VARCHAR(20) DEFAULT NULL";
            if (!in_array('start_value', $columnNames)) $missing[] = "ADD COLUMN start_value INT DEFAULT 1 NOT NULL";
            if (!in_array('zero_padding', $columnNames)) $missing[] = "ADD COLUMN zero_padding INT DEFAULT 0 NOT NULL";
            if (!in_array('enabled', $columnNames)) $missing[] = "ADD COLUMN enabled TINYINT(1) DEFAULT 1 NOT NULL";
            if (!in_array('filter_mode', $columnNames)) $missing[] = "ADD COLUMN filter_mode VARCHAR(20) DEFAULT 'ignored' NOT NULL";
            if (!in_array('extensions', $columnNames)) $missing[] = "ADD COLUMN extensions TEXT DEFAULT NULL";
            
            if (!empty($missing)) {
                $sql = "ALTER TABLE " . $tableName . " " . implode(", ", $missing);
                $connection->executeStatement($sql);
                \OC::$server->getLogger()->info('Renamer: added missing columns', ['app' => 'renamer']);
            }
        } catch (\Throwable $e) {
            \OC::$server->getLogger()->error('Renamer boot error: ' . $e->getMessage(), ['app' => 'renamer']);
        }
    }
}
