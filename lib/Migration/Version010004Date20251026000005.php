<?php

declare(strict_types=1);

namespace OCA\Renamer\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010004Date20251026000005 extends SimpleMigrationStep {
	public function getName(): string {
		return 'Create renamer_display_names table';
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

		if (!$schema->hasTable('renamer_display_names')) {
			$table = $schema->createTable('renamer_display_names');
			$table->addColumn('id', 'integer', [
				'autoincrement' => true,
				'notnull' => true,
				'length' => 8,
				'unsigned' => true,
			]);
			$table->addColumn('library_id', 'integer', [
				'notnull' => true,
				'default' => 0,
				'length' => 8,
				'unsigned' => true,
			]);
			$table->addColumn('file_path', 'string', [
				'notnull' => true,
				'default' => '',
				'length' => 1024,
			]);
			$table->addColumn('display_name', 'string', [
				'notnull' => true,
				'default' => '',
				'length' => 1024,
			]);
			$table->setPrimaryKey(['id']);
			$table->addUniqueIndex(['library_id', 'file_path']);
		}

		return $schema;
	}
}