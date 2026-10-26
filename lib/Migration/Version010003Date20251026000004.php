<?php

declare(strict_types=1);

namespace OCA\Renamer\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010003Date20251026000004 extends SimpleMigrationStep {
	public function getName(): string {
		return 'Create renamer_reading_progress table';
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

		if (!$schema->hasTable('renamer_reading_progress')) {
			$table = $schema->createTable('renamer_reading_progress');
			$table->addColumn('id', 'integer', [
				'autoincrement' => true,
				'notnull' => true,
				'length' => 8,
				'unsigned' => true,
			]);
			$table->addColumn('user_id', 'string', [
				'notnull' => true,
				'default' => '',
				'length' => 255,
			]);
			$table->addColumn('file_path', 'string', [
				'notnull' => true,
				'default' => '',
				'length' => 1024,
			]);
			$table->addColumn('progress_type', 'string', [
				'notnull' => true,
				'default' => 'pdf_page',
				'length' => 50,
			]);
			$table->addColumn('progress_value', 'integer', [
				'notnull' => true,
				'default' => 0,
				'length' => 4,
			]);
			$table->addColumn('progress_total', 'integer', [
				'notnull' => true,
				'default' => 0,
				'length' => 4,
			]);
			$table->addColumn('last_accessed', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP',
			]);
			$table->setPrimaryKey(['id']);
			$table->addUniqueIndex(['user_id', 'file_path']);
		}

		return $schema;
	}
}