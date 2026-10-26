<?php

declare(strict_types=1);

namespace OCA\Renamer\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010002Date20251026000003 extends SimpleMigrationStep {
	public function getName(): string {
		return 'Create renamer_collections table';
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

		if (!$schema->hasTable('renamer_collections')) {
			$table = $schema->createTable('renamer_collections');
			$table->addColumn('id', 'integer', [
				'autoincrement' => true,
				'notnull' => true,
				'length' => 8,
				'unsigned' => true,
			]);
			$table->addColumn('library_id', 'integer', [
				'notnull' => true,
				'length' => 8,
				'unsigned' => true,
			]);
			$table->addColumn('user_id', 'string', [
				'notnull' => true,
				'default' => '',
				'length' => 255,
			]);
			$table->addColumn('name', 'string', [
				'notnull' => true,
				'default' => '',
				'length' => 255,
			]);
			$table->addColumn('description', 'text', [
				'notnull' => false,
			]);
			$table->addColumn('rules', 'text', [
				'notnull' => false,
			]);
			$table->addColumn('created_at', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP',
			]);
			$table->addColumn('updated_at', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP',
			]);
			$table->setPrimaryKey(['id']);
			$table->addIndex(['library_id']);
		}

		return $schema;
	}
}