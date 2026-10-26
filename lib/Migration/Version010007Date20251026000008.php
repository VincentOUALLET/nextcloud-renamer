<?php

declare(strict_types=1);

namespace OCA\Renamer\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010007Date20251026000008 extends SimpleMigrationStep {
	public function getName(): string {
		return 'Create renamer_user_preferences table';
	}

	/**
	 * @param IOutput $output
	 * @param Closure $schemaClosure The `\Closure` returns a `ISchemaWrapper`
	 * @param array $options
	 *
	 * @return ISchemaWrapper
	 */
	#[\Override]
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ISchemaWrapper {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if (!$schema->hasTable('renamer_user_preferences')) {
			$table = $schema->createTable('renamer_user_preferences');
			$table->addColumn('user_id', 'string', [
				'notnull' => true,
				'length' => 64,
			]);
			$table->addColumn('preference_key', 'string', [
				'notnull' => true,
				'length' => 255,
			]);
			$table->addColumn('preference_value', 'text', [
				'notnull' => false,
			]);
			$table->addColumn('created_at', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP',
			]);
			$table->addColumn('updated_at', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
			]);
			$table->setPrimaryKey(['user_id', 'preference_key']);
		}

		return $schema;
	}
}