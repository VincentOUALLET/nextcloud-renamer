<?php

declare(strict_types=1);

namespace OCA\Renamer\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010000Date20251026000001 extends SimpleMigrationStep {
	public function getName(): string {
		return 'Create renamer_rules table';
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

		if (!$schema->hasTable('renamer_rules')) {
			$table = $schema->createTable('renamer_rules');
			$table->addColumn('id', 'integer', [
				'autoincrement' => true,
				'notnull' => true,
				'length' => 8,
				'unsigned' => true,
			]);
			$table->addColumn('name', 'string', [
				'notnull' => true,
				'default' => '',
				'length' => 255,
			]);
			$table->addColumn('mode', 'string', [
				'notnull' => true,
				'default' => 'replace',
				'length' => 50,
			]);
			$table->addColumn('pattern', 'string', [
				'notnull' => false,
				'default' => '',
				'length' => 1000,
			]);
			$table->addColumn('replacement', 'string', [
				'notnull' => false,
				'default' => '',
				'length' => 1000,
			]);
			$table->addColumn('target', 'string', [
				'notnull' => false,
				'default' => 'full',
				'length' => 20,
			]);
			$table->addColumn('sequence_type', 'string', [
				'notnull' => false,
				'default' => 'numeric',
				'length' => 20,
			]);
			$table->addColumn('start_value', 'integer', [
				'notnull' => false,
				'default' => 1,
				'length' => 4,
			]);
			$table->addColumn('zero_padding', 'integer', [
				'notnull' => false,
				'default' => 0,
				'length' => 4,
			]);
			$table->addColumn('enabled', 'boolean', [
				'notnull' => true,
				'default' => true,
			]);
			$table->addColumn('filter_mode', 'string', [
				'notnull' => false,
				'default' => 'ignored',
				'length' => 20,
			]);
			$table->addColumn('extensions', 'text', [
				'notnull' => false,
			]);
			$table->addColumn('scope', 'string', [
				'notnull' => false,
				'default' => 'advanced',
				'length' => 20,
			]);
			$table->addColumn('metadata_field', 'string', [
				'notnull' => false,
				'default' => '',
				'length' => 20,
			]);
			$table->addColumn('is_default', 'boolean', [
				'notnull' => false,
				'default' => false,
			]);
			$table->addColumn('user_id', 'string', [
				'notnull' => false,
				'default' => '',
				'length' => 255,
			]);
			$table->addColumn('created_at', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP',
			]);
			$table->setPrimaryKey(['id']);
		}

		return $schema;
	}
}